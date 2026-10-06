import UserModel from '../models/user.js';
import StudentModel from '../models/student.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { escapeRegex, pickFields } from '../utils/inputSanitization.js';

function buildStudentProfileUpdate(body = {}) {
    const studentProfile = body.studentProfile || {};
    const firstName = studentProfile.personalInfo?.firstName ?? studentProfile.firstName;
    const surName = studentProfile.personalInfo?.surName ?? studentProfile.surName;

    return {
        program: studentProfile.program ?? '',
        year: studentProfile.year ?? '',
        status: studentProfile.status ?? 'Active',
        deliveryMode: studentProfile.deliveryMode ?? '',
        personalInfo: {
            firstName: firstName ?? '',
            surName: surName ?? '',
            nrc: studentProfile.personalInfo?.nrc ?? studentProfile.nrc ?? '',
            passport: studentProfile.personalInfo?.passport ?? studentProfile.passport ?? '',
            maritalStatus: studentProfile.personalInfo?.maritalStatus ?? studentProfile.maritalStatus ?? '',
            nationality: studentProfile.personalInfo?.nationality ?? studentProfile.nationality ?? '',
            gender: studentProfile.personalInfo?.gender ?? studentProfile.gender ?? '',
            dateOfBirth: studentProfile.personalInfo?.dateOfBirth ?? studentProfile.dateOfBirth ?? ''
        },
        accommodation: {
            roomNumber: String(studentProfile.accommodation?.roomNumber ?? studentProfile.roomNumber ?? '').trim()
        },
        addressInfo: {
            province: studentProfile.addressInfo?.province ?? studentProfile.province ?? '',
            town: studentProfile.addressInfo?.town ?? studentProfile.town ?? '',
            address: studentProfile.addressInfo?.address ?? studentProfile.address ?? '',
            phone: studentProfile.addressInfo?.phone ?? studentProfile.phone ?? '',
            email: studentProfile.addressInfo?.email ?? studentProfile.email ?? ''
        }
    };
}

export async function listUsers(req, res) {
    try {
        const search = String(req.query.search || '').trim();
        const role = String(req.query.role || '').trim();
        const query = {};

        if (search) {
            const regex = { $regex: escapeRegex(search), $options: 'i' };
            query.$or = [
                { username: regex },
                { name: regex },
                { email: regex }
            ];
        }

        if (role) {
            query.role = role;
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
        const currentUser = await UserModel.findById(req.params.id, '-password');
        if (!currentUser) return res.status(404).json({ error: 'User not found' });

        const updateData = pickFields(req.body, ['username', 'name', 'email', 'role', 'hostel', 'profile']);
        if (updateData.email !== undefined) updateData.email = String(updateData.email || '').trim().toLowerCase();
        if (updateData.hostel !== undefined) updateData.hostel = String(updateData.hostel || '').trim();
        if (updateData.profile !== undefined) {
            updateData.profile = {
                houseNumber: String(updateData.profile?.houseNumber || '').trim()
            };
        }

        const effectiveEmail = updateData.email !== undefined ? updateData.email : currentUser.email;
        if (!effectiveEmail) return res.status(400).json({ error: 'Email is required' });

        const effectiveRole = updateData.role !== undefined ? String(updateData.role || '').trim() : currentUser.role;
        const effectiveHostel = updateData.hostel !== undefined ? updateData.hostel : String(currentUser.hostel || '').trim();
        const effectiveUsername = effectiveRole === 'student'
            ? String(updateData.username !== undefined ? updateData.username : currentUser.username).trim()
            : effectiveEmail;
        if (!effectiveUsername) {
            return res.status(400).json({ error: effectiveRole === 'student' ? 'Student ID is required' : 'Email is required' });
        }
        const duplicate = await UserModel.findOne({
            _id: { $ne: req.params.id },
            $or: [
                { username: effectiveUsername },
                ...(effectiveRole !== 'student' ? [{ email: effectiveEmail }] : [])
            ]
        });
        if (duplicate) {
            return res.status(409).json({ error: effectiveRole === 'student' ? 'Student ID already exists' : 'Email already exists' });
        }
        if (effectiveRole === 'warden' && !effectiveHostel) {
            return res.status(400).json({ error: 'Hostel is required for Warden users' });
        }
        updateData.username = effectiveUsername;
        if (effectiveRole !== 'warden') {
            delete updateData.hostel;
        }

        const result = await UserModel.findByIdAndUpdate(req.params.id, updateData, { new: true, select: '-password' });
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

        let studentProfile = null;
        if (user.role === 'student' && user.username) {
            studentProfile = await StudentModel.findOne({ studentId: user.username });
        }
        console.log('User found:', user);
        res.json({
            ...user.toObject(),
            studentProfile
        });
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
        if (req.body.email !== undefined) updateData.email = String(req.body.email || '').trim().toLowerCase();
        if (req.body.profile !== undefined) {
            updateData.profile = {
                houseNumber: String(req.body.profile?.houseNumber || '').trim()
            };
        }

        let id = req.user.id;
        if (id && typeof id === 'string' && id.length === 24 && /^[a-fA-F0-9]+$/.test(id)) {
            try {
                id = new mongoose.Types.ObjectId(id);
            } catch (error) {
                console.error('Invalid ObjectId format:', id);
                return res.status(400).json({ error: 'Invalid user ID format' });
            }
        }

        const currentUser = await UserModel.findById(id, '-password');
        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const submittedUserEmail = updateData.email !== undefined ? updateData.email : currentUser.email;

        if (currentUser.role !== 'student' && !submittedUserEmail) {
            return res.status(400).json({ error: 'Email is required' });
        }

        if (currentUser.role === 'student') {
            delete updateData.username;

            if (req.body.studentProfile) {
                const studentUpdate = buildStudentProfileUpdate(req.body);
                if (!studentUpdate.accommodation.roomNumber) {
                    return res.status(400).json({ error: 'Room number is required' });
                }
                if (!String(studentUpdate.addressInfo.email || '').trim()) {
                    return res.status(400).json({ error: 'Email is required' });
                }
                updateData.email = String(studentUpdate.addressInfo.email || '').trim().toLowerCase();
                await StudentModel.findOneAndUpdate(
                    { studentId: currentUser.username },
                    {
                        $set: {
                            ...studentUpdate,
                            studentId: currentUser.username
                        }
                    },
                    { new: true, upsert: true, setDefaultsOnInsert: true }
                );

                const fullName = [studentUpdate.personalInfo.firstName, studentUpdate.personalInfo.surName]
                    .filter(Boolean)
                    .join(' ')
                    .trim();
                if (fullName) {
                    updateData.name = fullName;
                }
            }
        } else {
            updateData.username = submittedUserEmail;
        }

        if (currentUser.role === 'student' && !req.body.studentProfile && !submittedUserEmail) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const result = await UserModel.findByIdAndUpdate(id, updateData, { new: true, select: '-password' });
        let studentProfile = null;
        if (result?.role === 'student') {
            studentProfile = await StudentModel.findOne({ studentId: result.username });
        }
        res.json({
            ...result.toObject(),
            studentProfile
        });
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

export async function adminResetUserPassword(req, res) {
    try {
        const { newPassword } = req.body;
        if (!newPassword || String(newPassword).length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        }
        const user = await UserModel.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.password = await bcrypt.hash(String(newPassword), 10);
        await user.save();
        res.json({ success: true, message: 'Password reset successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}
