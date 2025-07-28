import UserModel from '../models/user.js';
import db from '../models/db.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
const dbType = process.env.DB_TYPE || 'mongo';

export async function listUsers(req, res) {
    try {
        let users;
        if (dbType === 'mongo') {
            users = await UserModel.find({}, '-password');
        } else if (dbType === 'mysql') {
            const [rows] = await db.execute('SELECT id, username, name, role FROM users');
            users = rows;
        }
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function getUser(req, res) {
    try {
        let user;
        if (dbType === 'mongo') {
            user = await UserModel.findById(req.params.id, '-password');
        } else if (dbType === 'mysql') {
            const [rows] = await db.execute('SELECT id, username, name, role FROM users WHERE id = ?', [req.params.id]);
            user = rows[0];
        }
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function createUser(req, res) {
    // Registration handled in authController
    res.status(501).json({ error: 'Use /register' });
}

export async function updateUser(req, res) {
    try {
        let result;
        if (dbType === 'mongo') {
            result = await UserModel.findByIdAndUpdate(req.params.id, req.body, { new: true, select: '-password' });
        } else if (dbType === 'mysql') {
            const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ');
            const values = Object.values(req.body);
            values.push(req.params.id);
            await db.execute(`UPDATE users SET ${fields} WHERE id = ?`, values);
            const [rows] = await db.execute('SELECT id, username, name, role FROM users WHERE id = ?', [req.params.id]);
            result = rows[0];
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function deleteUser(req, res) {
    try {
        if (dbType === 'mongo') {
            await UserModel.findByIdAndDelete(req.params.id);
        } else if (dbType === 'mysql') {
            await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function getOwnProfile(req, res) {
    console.log('getOwnProfile called');
    try {
        console.log('getOwnProfile:', req.user, 'id:', req.user && req.user.id);
        let user;
        if (dbType === 'mongo') {
            let id = req.user.id;
            // Only convert to ObjectId if it looks like a valid ObjectId
            if (id && typeof id === 'string' && id.length === 24 && /^[a-fA-F0-9]+$/.test(id)) {
                id = new mongoose.Types.ObjectId(id);
            }
            user = await UserModel.findById(id, '-password');
        } else if (dbType === 'mysql') {
            const [rows] = await db.execute('SELECT id, username, name, role FROM users WHERE id = ?', [req.user.id]);
            user = rows[0];
        }
        if (!user) {
            console.log('User not found for id:', req.user.id);
            return res.status(404).json({ error: 'User not found' });
        }
        console.log('User found:', user);
        res.json(user);
    } catch (err) {
        console.error('getOwnProfile error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function updateOwnProfile(req, res) {
    try {
        let result;
        if (dbType === 'mongo') {
            // Only allow updating name for now
            result = await UserModel.findByIdAndUpdate(req.user.id, { name: req.body.name }, { new: true, select: '-password' });
        } else if (dbType === 'mysql') {
            await db.execute('UPDATE users SET name = ? WHERE id = ?', [req.body.name, req.user.id]);
            const [rows] = await db.execute('SELECT id, username, name, role FROM users WHERE id = ?', [req.user.id]);
            result = rows[0];
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function changeOwnPassword(req, res) {
    try {
        const { oldPassword, newPassword } = req.body;
        let user;
        if (dbType === 'mongo') {
            user = await UserModel.findById(req.user.id);
            if (!user) return res.status(404).json({ error: 'User not found' });
            const valid = await bcrypt.compare(oldPassword, user.password);
            if (!valid) return res.status(400).json({ error: 'Old password is incorrect' });
            user.password = await bcrypt.hash(newPassword, 10);
            await user.save();
        } else if (dbType === 'mysql') {
            const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
            user = rows[0];
            if (!user) return res.status(404).json({ error: 'User not found' });
            const valid = await bcrypt.compare(oldPassword, user.password);
            if (!valid) return res.status(400).json({ error: 'Old password is incorrect' });
            const hashed = await bcrypt.hash(newPassword, 10);
            await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}