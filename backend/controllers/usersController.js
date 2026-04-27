import UserModel from '../models/user.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

export async function listUsers(req, res) {
    try {
        const search = req.query.search;
        const query = {};
        if (search) {
            const regex = { $regex: search, $options: 'i' };
            query.$or = [
                { username: regex },
                { name: regex }
            ];
        }
        const users = await UserModel.find(query, '-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function getUser(req, res) {
    try {
        const user = await UserModel.findById(req.params.id, '-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function createUser(req, res) {
    res.status(501).json({ error: 'Use /register' });
}

export async function updateUser(req, res) {
    try {
        const result = await UserModel.findByIdAndUpdate(req.params.id, req.body, { new: true, select: '-password' });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function deleteUser(req, res) {
    try {
        await UserModel.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function getOwnProfile(req, res) {
    console.log('getOwnProfile called');
    try {
        console.log('getOwnProfile:', req.user, 'id:', req.user && req.user.id);
        let id = req.user.id;
        if (id && typeof id === 'string' && id.length === 24 && /^[a-fA-F0-9]+$/.test(id)) {
            try {
                id = new mongoose.Types.ObjectId(id);
            } catch (error) {
                console.error('Invalid ObjectId format:', id);
                return res.status(400).json({ error: 'Invalid user ID format' });
            }
        }

        const user = await UserModel.findById(id, '-password');
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
        const updateData = {};
        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.username !== undefined) updateData.username = req.body.username;

        let id = req.user.id;
        if (id && typeof id === 'string' && id.length === 24 && /^[a-fA-F0-9]+$/.test(id)) {
            try {
                id = new mongoose.Types.ObjectId(id);
            } catch (error) {
                console.error('Invalid ObjectId format:', id);
                return res.status(400).json({ error: 'Invalid user ID format' });
            }
        }

        const result = await UserModel.findByIdAndUpdate(id, updateData, { new: true, select: '-password' });
        res.json(result);
    } catch (err) {
        console.error('updateOwnProfile error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function changeOwnPassword(req, res) {
    try {
        const { oldPassword, newPassword } = req.body;
        let id = req.user.id;
        if (id && typeof id === 'string' && id.length === 24 && /^[a-fA-F0-9]+$/.test(id)) {
            try {
                id = new mongoose.Types.ObjectId(id);
            } catch (error) {
                console.error('Invalid ObjectId format:', id);
                return res.status(400).json({ error: 'Invalid user ID format' });
            }
        }

        const user = await UserModel.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const valid = await bcrypt.compare(oldPassword, user.password);
        if (!valid) return res.status(400).json({ error: 'Old password is incorrect' });
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}
