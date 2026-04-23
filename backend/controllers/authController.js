import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import UserModel from '../models/user.js';
import StudentModel from '../models/student.js';
import { logAudit } from './auditController.js';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

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

export async function login(req, res) {
    const { username, password } = req.body;
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
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const payload = { id: user._id || user.id, role: user.role, username: user.username };
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
