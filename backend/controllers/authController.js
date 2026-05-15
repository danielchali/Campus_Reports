import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import UserModel from '../models/user.js';
import StudentModel from '../models/student.js';
import { logAudit } from './auditController.js';
import { clearLoginAttempts, recordFailedLoginAttempt } from '../middleware/loginRateLimit.js';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';


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
            roomNumber: payload.accommodation?.roomNumber || payload.roomNumber || ''
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

function validateStudentSignupPayload(payload = {}) {
    const errors = [];

    if (!String(payload.studentId || '').trim()) errors.push('Student ID is required');
    if (!String(payload.password || '').trim()) errors.push('Password is required');
    if (String(payload.password || '').length < 6) errors.push('Password must be at least 6 characters');
    if (!String(payload.program || '').trim()) errors.push('Program is required');
    if (!String(payload.personalInfo?.firstName || payload.firstName || '').trim()) errors.push('First name is required');
    if (!String(payload.personalInfo?.surName || payload.surName || '').trim()) errors.push('Surname is required');
    if (!String(payload.addressInfo?.email || payload.email || '').trim()) errors.push('Email is required');

    return errors;
}

export async function login(req, res) {
    const { username, password } = req.body;
    const loginAttemptKey = req.loginAttemptKey;
    console.log('Login attempt:', username);
    try {
        const user = await UserModel.findOne({ username });
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

        const displayName = await resolveUserDisplayName(user);
        const payload = { id: user._id || user.id, role: user.role, username: user.username, name: displayName };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

        await logAudit({
            action: 'user_login',
            entity: 'user',
            entityId: user._id || user.id,
            user: username,
            details: {
                role: user.role,
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        clearLoginAttempts(loginAttemptKey);
        res.json({ token, user: payload });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function register(req, res) {
    const { username, password, name, role } = req.body;
    try {
        const exists = await UserModel.findOne({ username });
        if (exists) return res.status(409).json({ error: 'Username already exists' });

        const hashed = await bcrypt.hash(password, 10);
        const user = await UserModel.create({ username, password: hashed, name, role });

        await ensureStudentProfileForUser({
            username,
            name,
            role: role || 'user'
        });

        await logAudit({
            action: 'user_registered',
            entity: 'user',
            entityId: user._id || user.id,
            user: username,
            details: {
                name,
                role: role || 'user',
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
            role: 'student'
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
                name: user.name
            }
        });
    } catch (err) {
        console.error('Student signup error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

import crypto from 'crypto';
import StaffModel from '../models/staff.js';
import { sendEmail } from '../utils/emailService.js';

export async function forgotPassword(req, res) {
    const { username } = req.body; // username is typically studentId or staffId
    if (!username) return res.status(400).json({ error: 'Username/ID is required' });

    try {
        const user = await UserModel.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find email based on role
        let email = null;
        if (user.role === 'student') {
            const student = await StudentModel.findOne({ studentId: username });
            email = student?.addressInfo?.email;
        } else {
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

        const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;

        const mailOptions = {
            to: email,
            subject: 'Password Reset OTP',
            text: `Use this OTP to reset your password: ${resetOTP}. It expires in 15 minutes.\n\nReset link: ${resetUrl}`,
            html: `<p>Your password reset OTP is <strong style="font-size:20px">${resetOTP}</strong>.</p><p>It expires in 15 minutes.</p><p>Or use this link: <a href="${resetUrl}">${resetUrl}</a></p>`
        };

        // Attempt to send email
        try {
            await sendEmail(mailOptions);
            res.json({ message: 'Password reset OTP sent to your email.' });
        } catch (emailErr) {
            console.error('Email send error:', emailErr);
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
    if ((!token && !otp) || !newPassword) return res.status(400).json({ error: 'OTP (or token) and new password are required' });

    try {
        const user = otp
            ? await UserModel.findOne({ resetPasswordOTP: otp, resetPasswordOTPExpires: { $gt: Date.now() } })
            : await UserModel.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });

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
