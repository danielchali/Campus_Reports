import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import UserModel from '../models/user.js';
import StudentModel from '../models/student.js';
import StaffModel from '../models/staff.js';
import { logAudit } from './auditController.js';
import { clearLoginAttempts, recordFailedLoginAttempt } from '../middleware/loginRateLimit.js';
import { escapeHtml, isValidContactEmail, sendTwoFactorCode, sendEmail } from '../utils/emailService.js';
import {
    createTwoFactorChallenge,
    hashTwoFactorChallenge,
    isValidTwoFactorCode,
    MANAGEMENT_ROLES,
    requiresTwoFactorAuthentication
} from '../utils/twoFactorAuth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const MAX_TWO_FACTOR_ATTEMPTS = 5;
const GOOGLE_REGISTRATION_ROLES = new Set(['student', 'general_user']);

function createAuthenticatedUserPayload(user, displayName) {
    return {
        id: user._id || user.id,
        role: user.role,
        username: user.username,
        name: displayName,
        ...(user.role === 'warden' ? { hostel: user.hostel } : {})
    };
}

function clearTwoFactorChallenge(user) {
    user.twoFactorChallengeHash = undefined;
    user.twoFactorCodeHash = undefined;
    user.twoFactorExpiresAt = undefined;
    user.twoFactorAttempts = 0;
}

function createAuthenticationToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

async function recordSuccessfulLogin({ req, user, username, twoFactorVerified }) {
    await logAudit({
        action: 'user_login',
        entity: 'user',
        entityId: user._id || user.id,
        user: username,
        details: {
            role: user.role,
            ...(twoFactorVerified ? { twoFactorVerified: true } : {}),
            timestamp: new Date().toISOString()
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });
}

async function issueTwoFactorChallenge({ req, user, username, authMethod = 'password' }) {
    let email = String(user.email || '').trim().toLowerCase();
    if (!isValidContactEmail(email)) {
        const staff = await StaffModel.findOne({ staffId: user.username }).select('email').lean();
        email = String(staff?.email || '').trim().toLowerCase();
        if (isValidContactEmail(email)) {
            // Keep the login account synchronized with the staff directory so
            // future 2FA challenges do not depend on a second lookup.
            user.email = email;
            await user.save();
        }
    }

    if (!isValidContactEmail(email)) {
        return {
            status: 503,
            error: 'Two-factor authentication is unavailable for this account. Please contact an administrator.'
        };
    }

    const challenge = createTwoFactorChallenge();
    user.twoFactorChallengeHash = challenge.challengeHash;
    user.twoFactorCodeHash = await bcrypt.hash(challenge.code, 10);
    user.twoFactorExpiresAt = challenge.expiresAt;
    user.twoFactorAttempts = 0;
    await user.save();

    try {
        await sendTwoFactorCode({
            to: email,
            code: challenge.code,
            expiresAt: challenge.expiresAt
        });
    } catch (emailError) {
        clearTwoFactorChallenge(user);
        await user.save();
        console.error('Two-factor authentication email error:', emailError);
        return {
            status: 503,
            error: 'Unable to send a verification code. Please try again later.'
        };
    }

    await logAudit({
        action: 'two_factor_challenge_created',
        entity: 'user',
        entityId: user._id || user.id,
        user: username,
        details: {
            role: user.role,
            authMethod,
            expiresAt: challenge.expiresAt.toISOString(),
            timestamp: new Date().toISOString()
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    return {
        status: 202,
        body: {
            requiresTwoFactor: true,
            challengeId: challenge.challengeId,
            expiresAt: challenge.expiresAt.toISOString(),
            message: 'A verification code has been sent to your email address.'
        }
    };
}

async function verifyGoogleIdToken(idToken) {
    const googleClientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    if (!googleClientId) {
        const error = new Error('Google sign-in is not configured.');
        error.status = 503;
        throw error;
    }

    let ticket;
    try {
        ticket = await new OAuth2Client(googleClientId).verifyIdToken({
            idToken,
            audience: googleClientId
        });
    } catch {
        const error = new Error('Google ID token verification failed.');
        error.status = 401;
        throw error;
    }
    const payload = ticket.getPayload();
    const email = String(payload?.email || '').trim().toLowerCase();

    if (!payload?.sub || !email || payload.email_verified !== true) {
        const error = new Error('Google account email could not be verified.');
        error.status = 401;
        throw error;
    }

    return {
        email,
        name: String(payload.name || '').trim()
    };
}

function createGoogleAccountPassword() {
    return crypto.randomBytes(32).toString('hex');
}

function getGoogleStudentRegistrationErrors(studentPayload) {
    const errors = [];
    if (!studentPayload.studentId) errors.push('Student ID is required');
    if (!studentPayload.program) errors.push('Program is required');
    if (!studentPayload.year) errors.push('Year is required');
    if (!studentPayload.personalInfo.firstName) errors.push('First name is required');
    if (!studentPayload.personalInfo.surName) errors.push('Surname is required');
    if (!studentPayload.personalInfo.gender) errors.push('Gender is required');
    if (!studentPayload.personalInfo.dateOfBirth) errors.push('Date of birth is required');
    if (!studentPayload.addressInfo.email) errors.push('Email is required');
    if (!studentPayload.addressInfo.phone) errors.push('Phone number is required');
    if (!studentPayload.addressInfo.address) errors.push('Address is required');
    if (!studentPayload.accommodation.roomNumber) errors.push('Room number is required');
    return errors;
}

function getGoogleGeneralRegistrationErrors(payload) {
    const errors = [];
    if (!String(payload.name || '').trim()) errors.push('Full name is required');
    return errors;
}


function getStudentFullName(student) {
    const obj = student?.toObject ? student.toObject({ virtuals: true }) : student;
    const fullName = obj?.fullName || [obj?.personalInfo?.firstName, obj?.personalInfo?.surName].filter(Boolean).join(' ').trim();
    return String(fullName || '').trim();
}

async function resolveUserDisplayName(user) {
    if (user.role !== 'student') {
        return String(user.name || '').trim();
    }

    const student = await StudentModel.findOne({ studentId: user.username });
    const studentFullName = getStudentFullName(student);
    const displayName = studentFullName || String(user.name || '').trim() || user.username;

    if (displayName && displayName !== user.name) {
        user.name = displayName;
        await user.save();
    }

    return displayName;
}

function normalizeStudentStatus(status) {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'suspended') return 'Suspended';
    if (normalized === 'expelled') return 'Expelled';
    return 'Active';
}

async function ensureStudentProfileForUser({ username, name, role }) {
    if (role !== 'student') {
        return;
    }

    const studentId = String(username || '').trim();
    if (!studentId) {
        return;
    }

    const fullName = (name && String(name).trim()) || studentId;
    const [firstName, ...rest] = fullName.split(' ');
    const surName = rest.join(' ');

    await StudentModel.findOneAndUpdate(
        { studentId },
        {
            $set: {
                personalInfo: {
                    firstName: firstName || studentId,
                    surName: surName || ''
                }
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

function normalizeStudentSignupPayload(payload = {}) {
    const firstName = payload.personalInfo?.firstName || payload.firstName || '';
    const surName = payload.personalInfo?.surName || payload.surName || '';
    const fullName = payload.fullName || [firstName, surName].filter(Boolean).join(' ').trim();

    return {
        studentId: String(payload.studentId || payload.username || '').trim(),
        program: payload.program || '',
        year: payload.year || '',
        status: normalizeStudentStatus(payload.status),
        deliveryMode: payload.deliveryMode || '',
        personalInfo: {
            firstName: firstName || (fullName ? fullName.split(' ')[0] : ''),
            surName: surName || (fullName ? fullName.split(' ').slice(1).join(' ') : ''),
            nrc: payload.personalInfo?.nrc || payload.nrc || '',
            passport: payload.personalInfo?.passport || payload.passport || '',
            maritalStatus: payload.personalInfo?.maritalStatus || payload.maritalStatus || '',
            nationality: payload.personalInfo?.nationality || payload.nationality || '',
            gender: payload.personalInfo?.gender || payload.gender || '',
            dateOfBirth: payload.personalInfo?.dateOfBirth || payload.dateOfBirth || ''
        },
        accommodation: {
            roomNumber: String(payload.accommodation?.roomNumber || payload.roomNumber || '').trim()
        },
        addressInfo: {
            province: payload.addressInfo?.province || payload.province || '',
            town: payload.addressInfo?.town || payload.town || '',
            address: payload.addressInfo?.address || payload.address || '',
            phone: payload.addressInfo?.phone || payload.phone || '',
            email: payload.addressInfo?.email || payload.email || ''
        }
    };
}


function normalizeGeneralUserSignupPayload(payload = {}) {
    const email = String(payload.email || payload.profile?.email || '').trim().toLowerCase();
    return {
        username: email,
        password: String(payload.password || ''),
        name: String(payload.name || payload.fullName || '').trim(),
        email,
        profile: {
            houseNumber: String(payload.profile?.houseNumber || payload.houseNumber || '').trim()
        }
    };
}

function validateGeneralUserSignupPayload(payload = {}) {
    const errors = [];

    if (!String(payload.password || '').trim()) errors.push('Password is required');
    if (String(payload.password || '').length < 6) errors.push('Password must be at least 6 characters');
    if (!String(payload.name || payload.fullName || '').trim()) errors.push('Full name is required');
    if (!String(payload.email || payload.profile?.email || '').trim()) errors.push('Email is required');

    return errors;
}

function validateStudentSignupPayload(payload = {}) {
    const errors = [];

    if (!String(payload.studentId || '').trim()) errors.push('Student ID is required');
    if (!String(payload.password || '').trim()) errors.push('Password is required');
    if (String(payload.password || '').length < 6) errors.push('Password must be at least 6 characters');
    if (!String(payload.program || '').trim()) errors.push('Program is required');
    if (!String(payload.personalInfo?.firstName || payload.firstName || '').trim()) errors.push('First name is required');
    if (!String(payload.personalInfo?.surName || payload.surName || '').trim()) errors.push('Surname is required');
    if (!String(payload.addressInfo?.email || payload.email || '').trim()) errors.push('Email is required');
    if (!String(payload.accommodation?.roomNumber || payload.roomNumber || '').trim()) errors.push('Room number is required');

    return errors;
}

export async function login(req, res) {
    const username = String(req.body.username || '').trim();
    const password = req.body.password;
    const normalizedIdentifier = username.toLowerCase();
    const loginAttemptKey = req.loginAttemptKey;
    console.log('Login attempt:', username);
    try {
        const user = await UserModel.findOne({
            $or: [
                { username },
                { username: normalizedIdentifier },
                { role: { $ne: 'student' }, email: normalizedIdentifier }
            ]
        });
        console.log('User found:', !!user, user && user.username, user && user.role);

        if (!user) {
            await logAudit({
                action: 'login_failed',
                entity: 'user',
                entityId: null,
                user: username,
                details: {
                    reason: 'User not found',
                    timestamp: new Date().toISOString()
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            recordFailedLoginAttempt(loginAttemptKey);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.password);
        console.log('Password valid:', valid);
        if (!valid) {
            await logAudit({
                action: 'login_failed',
                entity: 'user',
                entityId: user._id || user.id,
                user: username,
                details: {
                    reason: 'Invalid password',
                    timestamp: new Date().toISOString()
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            recordFailedLoginAttempt(loginAttemptKey);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (requiresTwoFactorAuthentication(user.role)) {
            const challengeResponse = await issueTwoFactorChallenge({
                req,
                user,
                username,
                authMethod: 'password'
            });
            clearLoginAttempts(loginAttemptKey);
            return res.status(challengeResponse.status).json(challengeResponse.body || { error: challengeResponse.error });
        }

        const displayName = await resolveUserDisplayName(user);
        const payload = createAuthenticatedUserPayload(user, displayName);
        const token = createAuthenticationToken(payload);

        await recordSuccessfulLogin({ req, user, username, twoFactorVerified: false });

        clearLoginAttempts(loginAttemptKey);
        res.json({ token, user: payload });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function googleLogin(req, res) {
    const credential = String(req.body.credential || req.body.idToken || '').trim();
    if (!credential) {
        return res.status(400).json({ error: 'Google sign-in credential is required.' });
    }

    try {
        const googleUser = await verifyGoogleIdToken(credential);
        // Prefer the management account if duplicate email records exist so a
        // management identity can never bypass the second factor by matching a
        // lower-privilege record first.
        const user = await UserModel.findOne({
            email: googleUser.email,
            role: { $in: [...MANAGEMENT_ROLES] }
        }) || await UserModel.findOne({ email: googleUser.email });

        if (!user) {
            await logAudit({
                action: 'google_registration_started',
                entity: 'user',
                entityId: null,
                user: googleUser.email,
                details: {
                    reason: 'No matching account',
                    timestamp: new Date().toISOString()
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.json({
                requiresRegistration: true,
                registrationRoles: [...GOOGLE_REGISTRATION_ROLES],
                googleProfile: {
                    email: googleUser.email,
                    name: googleUser.name
                },
                message: 'Choose an account type to complete Google registration.'
            });
        }

        if (MANAGEMENT_ROLES.has(user.role)) {
            const challengeResponse = await issueTwoFactorChallenge({
                req,
                user,
                username: user.username,
                authMethod: 'google'
            });

            return res.status(challengeResponse.status).json(challengeResponse.body || { error: challengeResponse.error });
        }

        if (!GOOGLE_REGISTRATION_ROLES.has(user.role)) {
            return res.status(403).json({ error: 'Google sign-in is not available for this account role.' });
        }

        const displayName = await resolveUserDisplayName(user);
        const payload = createAuthenticatedUserPayload(user, displayName);
        const token = createAuthenticationToken(payload);

        await recordSuccessfulLogin({ req, user, username: user.username, twoFactorVerified: false });
        return res.json({ token, user: payload });
    } catch (err) {
        const status = Number.isInteger(err?.status) ? err.status : 500;
        if (status >= 500) {
            console.error('Google sign-in error:', err);
        }
        return res.status(status).json({
            error: status === 503
                ? err.message
                : 'Unable to verify Google sign-in. Please try again.'
        });
    }
}

export async function googleRegister(req, res) {
    const credential = String(req.body.credential || req.body.idToken || '').trim();
    const role = String(req.body.role || '').trim();

    if (!credential) {
        return res.status(400).json({ error: 'Google sign-in credential is required.' });
    }
    if (!GOOGLE_REGISTRATION_ROLES.has(role)) {
        return res.status(400).json({ error: 'Choose Student or General User to continue.' });
    }

    try {
        const googleUser = await verifyGoogleIdToken(credential);
        const existingUser = await UserModel.findOne({ email: googleUser.email });
        if (existingUser) {
            return res.status(409).json({ error: 'An account already exists for this Google email. Sign in instead.' });
        }

        let user;
        if (role === 'student') {
            const studentPayload = normalizeStudentSignupPayload({
                ...(req.body.studentProfile || {}),
                email: googleUser.email,
                addressInfo: {
                    ...(req.body.studentProfile?.addressInfo || {}),
                    email: googleUser.email
                }
            });
            const validationErrors = getGoogleStudentRegistrationErrors(studentPayload);
            if (validationErrors.length > 0) {
                return res.status(400).json({ error: validationErrors[0], details: validationErrors });
            }

            const [existingStudent, existingUsername] = await Promise.all([
                StudentModel.findOne({ studentId: studentPayload.studentId }),
                UserModel.findOne({ username: studentPayload.studentId })
            ]);
            if (existingStudent || existingUsername) {
                return res.status(409).json({ error: 'A user with this Student ID already exists.' });
            }

            const fullName = [studentPayload.personalInfo.firstName, studentPayload.personalInfo.surName]
                .filter(Boolean)
                .join(' ')
                .trim();
            user = await UserModel.create({
                username: studentPayload.studentId,
                password: await bcrypt.hash(createGoogleAccountPassword(), 10),
                name: fullName || googleUser.name || googleUser.email,
                email: googleUser.email,
                role: 'student'
            });
            await StudentModel.create(studentPayload);

            await logAudit({
                action: 'google_student_registered',
                entity: 'student',
                entityId: user._id || user.id,
                user: user.username,
                details: {
                    studentId: studentPayload.studentId,
                    email: googleUser.email,
                    program: studentPayload.program,
                    timestamp: new Date().toISOString()
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
        } else {
            const generalRegistrationErrors = getGoogleGeneralRegistrationErrors(req.body);
            if (generalRegistrationErrors.length > 0) {
                return res.status(400).json({ error: generalRegistrationErrors[0], details: generalRegistrationErrors });
            }

            user = await UserModel.create({
                username: googleUser.email,
                password: await bcrypt.hash(createGoogleAccountPassword(), 10),
                name: String(req.body.name || googleUser.name || googleUser.email).trim(),
                email: googleUser.email,
                role: 'general_user',
                profile: {
                    houseNumber: String(req.body.profile?.houseNumber || '').trim()
                }
            });

            await logAudit({
                action: 'google_general_user_registered',
                entity: 'user',
                entityId: user._id || user.id,
                user: user.username,
                details: {
                    email: googleUser.email,
                    role: user.role,
                    timestamp: new Date().toISOString()
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
        }

        const displayName = await resolveUserDisplayName(user);
        const payload = createAuthenticatedUserPayload(user, displayName);
        const token = createAuthenticationToken(payload);
        return res.status(201).json({ token, user: payload, registeredWithGoogle: true });
    } catch (err) {
        console.error('Google registration error:', err);
        if (err?.code === 11000) {
            return res.status(409).json({ error: 'An account with these details already exists.' });
        }
        const status = Number.isInteger(err?.status) ? err.status : 500;
        return res.status(status).json({
            error: status === 503 ? err.message : 'Unable to complete Google registration. Please try again.'
        });
    }
}

export async function verifyTwoFactor(req, res) {
    const challengeId = String(req.body.challengeId || '').trim();
    const code = String(req.body.code || '').trim();

    if (!challengeId || !isValidTwoFactorCode(code)) {
        return res.status(400).json({ error: 'Enter a valid six-digit verification code.' });
    }

    try {
        const challengeHash = hashTwoFactorChallenge(challengeId);
        const user = await UserModel.findOne({
            twoFactorChallengeHash: challengeHash,
            twoFactorExpiresAt: { $gt: new Date() }
        }).select('+twoFactorChallengeHash +twoFactorCodeHash +twoFactorExpiresAt +twoFactorAttempts');

        if (!user || !requiresTwoFactorAuthentication(user.role)) {
            return res.status(401).json({ error: 'This verification code is invalid or has expired. Sign in again.' });
        }

        const validCode = await bcrypt.compare(code, user.twoFactorCodeHash || '');
        if (!validCode) {
            user.twoFactorAttempts = Number(user.twoFactorAttempts || 0) + 1;
            const attemptsExhausted = user.twoFactorAttempts >= MAX_TWO_FACTOR_ATTEMPTS;
            if (attemptsExhausted) {
                clearTwoFactorChallenge(user);
            }
            await user.save();

            await logAudit({
                action: 'two_factor_verification_failed',
                entity: 'user',
                entityId: user._id || user.id,
                user: user.username,
                details: {
                    role: user.role,
                    attemptsRemaining: attemptsExhausted ? 0 : MAX_TWO_FACTOR_ATTEMPTS - user.twoFactorAttempts,
                    timestamp: new Date().toISOString()
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            return res.status(401).json({ error: 'This verification code is invalid or has expired. Sign in again.' });
        }

        const displayName = await resolveUserDisplayName(user);
        const payload = createAuthenticatedUserPayload(user, displayName);
        const token = createAuthenticationToken(payload);
        clearTwoFactorChallenge(user);
        await user.save();

        await recordSuccessfulLogin({
            req,
            user,
            username: user.username,
            twoFactorVerified: true
        });

        return res.json({ token, user: payload });
    } catch (err) {
        console.error('Two-factor verification error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
}

export async function register(req, res) {
    const { password, name, role } = req.body;
    const normalizedRole = String(role || 'user').trim();
    const hostel = String(req.body.hostel || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const submittedUsername = String(req.body.username || '').trim();
    const username = normalizedRole === 'student' ? submittedUsername : email;
    try {
        if (!email) return res.status(400).json({ error: 'Email is required' });
        if (normalizedRole === 'student' && !username) {
            return res.status(400).json({ error: 'Student ID is required' });
        }
        if (normalizedRole === 'warden' && !hostel) {
            return res.status(400).json({ error: 'Hostel is required for Warden users' });
        }

        const exists = await UserModel.findOne({
            $or: [
                { username },
                ...(normalizedRole !== 'student' ? [{ email }] : [])
            ]
        });
        if (exists) {
            return res.status(409).json({
                error: normalizedRole === 'student' ? 'Student ID already exists' : 'Email already exists'
            });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await UserModel.create({
            username,
            password: hashed,
            name,
            email,
            role: normalizedRole,
            ...(normalizedRole === 'warden' ? { hostel } : {})
        });

        await ensureStudentProfileForUser({
            username,
            name,
            role: normalizedRole
        });

        await logAudit({
            action: 'user_registered',
            entity: 'user',
            entityId: user._id || user.id,
            user: username,
            details: {
                name,
                email,
                role: normalizedRole,
                ...(normalizedRole === 'warden' ? { hostel } : {}),
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}


export async function registerGeneralUser(req, res) {
    try {
        const validationErrors = validateGeneralUserSignupPayload(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: validationErrors[0], details: validationErrors });
        }

        const userPayload = normalizeGeneralUserSignupPayload(req.body);
        const exists = await UserModel.findOne({ username: userPayload.username });
        if (exists) return res.status(409).json({ error: 'Username already exists' });

        const hashed = await bcrypt.hash(userPayload.password, 10);
        const user = await UserModel.create({
            username: userPayload.username,
            password: hashed,
            name: userPayload.name,
            email: userPayload.email,
            role: 'general_user',
            profile: userPayload.profile
        });

        await logAudit({
            action: 'general_user_self_registered',
            entity: 'user',
            entityId: user._id || user.id,
            user: user.username,
            details: {
                name: user.name,
                role: user.role,
                houseNumberProvided: Boolean(userPayload.profile.houseNumber),
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json({
            success: true,
            message: 'General user account created successfully',
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                name: user.name,
                email: user.email,
                profile: user.profile
            }
        });
    } catch (err) {
        console.error('General user signup error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function registerStudent(req, res) {
    try {
        const validationErrors = validateStudentSignupPayload(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: validationErrors[0], details: validationErrors });
        }

        const studentPayload = normalizeStudentSignupPayload(req.body);
        const username = studentPayload.studentId;
        const password = req.body.password;
        const fullName = [studentPayload.personalInfo.firstName, studentPayload.personalInfo.surName].filter(Boolean).join(' ').trim();

        const existingUser = await UserModel.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ error: 'A user with this Student ID already exists' });
        }

        const existingStudent = await StudentModel.findOne({ studentId: studentPayload.studentId });
        if (existingStudent) {
            return res.status(409).json({ error: 'A student profile with this Student ID already exists' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await UserModel.create({
            username,
            password: hashed,
            name: fullName,
            role: 'student',
            email: String(studentPayload.addressInfo.email || '').trim().toLowerCase()
        });

        const student = await StudentModel.create(studentPayload);

        await logAudit({
            action: 'student_self_registered',
            entity: 'student',
            entityId: student._id || student.studentId,
            user: username,
            details: {
                studentId: student.studentId,
                fullName,
                program: student.program,
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json({
            success: true,
            message: 'Student account created successfully',
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                name: user.name,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Student signup error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function forgotPassword(req, res) {
    const username = String(req.body.username || '').trim(); // Student ID for students, email for non-students
    if (!username) return res.status(400).json({ error: 'Username/ID is required' });

    try {
        const user = await UserModel.findOne({
            $or: [
                { username },
                { role: { $ne: 'student' }, email: username.toLowerCase() }
            ]
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find email based on role
        let email = user.email || null;
        if (!email && user.role === 'student') {
            const student = await StudentModel.findOne({ studentId: username });
            email = student?.addressInfo?.email;
        } else if (!email) {
            const staff = await StaffModel.findOne({ staffId: username });
            email = staff?.email;
        }

        if (!email) {
            return res.status(400).json({ error: 'No email address associated with this account. Please contact administration.' });
        }

        // Generate OTP + token fallback
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetOTP = `${Math.floor(100000 + Math.random() * 900000)}`;
        user.resetPasswordToken = resetToken;
        user.resetPasswordOTP = resetOTP;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        user.resetPasswordOTPExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;

        const mailOptions = {
            to: email,
            subject: 'Password Reset OTP',
            text: `Use this OTP to reset your password: ${resetOTP}. It expires in 15 minutes.\n\nReset link: ${resetUrl}`,
            html: `<p>Your password reset OTP is <strong style="font-size:20px">${escapeHtml(resetOTP)}</strong>.</p><p>It expires in 15 minutes.</p><p>Or use this link: <a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>`
        };

        // Attempt to send email
        try {
            await sendEmail(mailOptions);
            res.json({ message: 'Password reset OTP sent to your email.' });
        } catch (emailErr) {
            console.error('Email send error:', emailErr);
            if (process.env.NODE_ENV === 'production') {
                return res.status(502).json({ error: 'Unable to send password reset email. Please try again later or contact administration.' });
            }
            console.log(`[Dev Fallback] Reset OTP for ${username}: ${resetOTP}; link: ${resetUrl}`);
            res.json({ message: 'Password reset OTP generated. (Check server console in development)' });
        }

    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function resetPassword(req, res) {
    const { token, otp, newPassword } = req.body;
    const normalizedToken = String(token || '').trim();
    const normalizedOTP = String(otp || '').trim();
    if ((!normalizedToken && !normalizedOTP) || !newPassword) return res.status(400).json({ error: 'OTP (or token) and new password are required' });

    try {
        const user = normalizedToken && normalizedOTP
            ? await UserModel.findOne({
                resetPasswordToken: normalizedToken,
                resetPasswordExpires: { $gt: Date.now() },
                resetPasswordOTP: normalizedOTP,
                resetPasswordOTPExpires: { $gt: Date.now() }
            })
            : normalizedOTP
                ? await UserModel.findOne({ resetPasswordOTP: normalizedOTP, resetPasswordOTPExpires: { $gt: Date.now() } })
                : await UserModel.findOne({ resetPasswordToken: normalizedToken, resetPasswordExpires: { $gt: Date.now() } });

        if (!user) {
            return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.resetPasswordOTP = undefined;
        user.resetPasswordOTPExpires = undefined;
        await user.save();

        await logAudit({
            action: 'password_reset',
            entity: 'user',
            entityId: user._id || user.id,
            user: user.username,
            details: { timestamp: new Date().toISOString() },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Password has been successfully reset. You may now log in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}
