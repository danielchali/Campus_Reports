import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import UserModel from '../models/user.js';
import db from '../models/db.js';
import { logAudit } from './auditController.js';

const dbType = process.env.DB_TYPE || 'mongo';
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function login(req, res) {
    const { username, password } = req.body;
    console.log('Login attempt:', username);
    try {
        let user;
        if (dbType === 'mongo') {
            user = await UserModel.findOne({ username });
            console.log('User found:', !!user, user && user.username, user && user.role);
            if (!user) {
                // Audit log for failed login (user not found)
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
                // Audit log for failed login (invalid password)
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
        } else if (dbType === 'mysql') {
            const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
            user = rows[0];
            if (!user) {
                // Audit log for failed login (user not found)
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
            if (!valid) {
                // Audit log for failed login (invalid password)
                await logAudit({
                    action: 'login_failed',
                    entity: 'user',
                    entityId: user.id,
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
        }
        const payload = { id: user._id || user.id, role: user.role, username: user.username };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

        // Audit log for successful login
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
        let user;
        if (dbType === 'mongo') {
            const exists = await UserModel.findOne({ username });
            if (exists) return res.status(409).json({ error: 'Username already exists' });
            const hashed = await bcrypt.hash(password, 10);
            user = await UserModel.create({ username, password: hashed, name, role });
        } else if (dbType === 'mysql') {
            const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
            if (rows.length > 0) return res.status(409).json({ error: 'Username already exists' });
            const hashed = await bcrypt.hash(password, 10);
            await db.execute('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)', [username, hashed, name, role || 'user']);
            user = { username, name, role: role || 'user' };
        }

        // Audit log for user registration
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