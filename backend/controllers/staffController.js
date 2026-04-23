import StaffModel from '../models/staff.js';
import CaseModel from '../models/case.js';
import { logAudit } from './auditController.js';

export async function listStaff(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const department = req.query.department;
        const position = req.query.position;

        const query = {};
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { staffId: { $regex: search, $options: 'i' } }
            ];
        }
        if (department) query.department = department;
        if (position) query.position = position;

        const total = await StaffModel.countDocuments(query);
        const staff = await StaffModel.find(query)
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({ staff, total });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function getStaff(req, res) {
    try {
        let staff = await StaffModel.findById(req.params.id);
        if (staff) {
            const cases = await CaseModel.find({
                $or: [
                    { staff_id: staff.staffId },
                    { staff_ids: staff.staffId }
                ]
            });
            staff = staff.toObject();
            staff.disciplinaryHistory = cases.map(caseItem => {
                const caseObj = caseItem.toObject();
                return {
                    ...caseObj,
                    incidentDate: caseObj.incident_date,
                    offenseType: caseObj.offense_type,
                    createdBy: caseObj.created_by,
                    createdAt: caseObj.createdAt,
                    updatedAt: caseObj.updatedAt
                };
            });
        }
        if (!staff) return res.status(404).json({ error: 'Staff member not found' });
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function createStaff(req, res) {
    try {
        const staff = await StaffModel.create(req.body);
        await logAudit({
            action: 'staff_created',
            entity: 'staff',
            entityId: staff._id || staff.id || staff.staffId,
            user: req.user && req.user.username,
            details: {
                staffData: {
                    staffId: staff.staffId,
                    fullName: staff.fullName,
                    department: staff.department,
                    position: staff.position,
                    email: staff.email,
                    phone: staff.phone
                },
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function updateStaff(req, res) {
    try {
        const staff = await StaffModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        await logAudit({
            action: 'staff_updated',
            entity: 'staff',
            entityId: req.params.id,
            user: req.user && req.user.username,
            details: {
                changes: req.body,
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function deleteStaff(req, res) {
    try {
        await StaffModel.findByIdAndDelete(req.params.id);
        await logAudit({
            action: 'staff_deleted',
            entity: 'staff',
            entityId: req.params.id,
            user: req.user && req.user.username,
            details: {
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function searchStaff(req, res) {
    try {
        const query = req.query.q;
        if (!query || query.length < 2) {
            return res.json([]);
        }

        const staff = await StaffModel.find({
            $or: [
                { fullName: { $regex: query, $options: 'i' } },
                { staffId: { $regex: query, $options: 'i' } }
            ]
        }).limit(10);
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function getRecentStaff(req, res) {
    try {
        const staff = await StaffModel.find().sort({ lastSelected: -1 }).limit(10);
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function updateLastSelected(req, res) {
    try {
        const lastSelected = new Date();
        const staff = await StaffModel.findByIdAndUpdate(
            req.params.id,
            { lastSelected },
            { new: true }
        );
        if (!staff) return res.status(404).json({ error: 'Staff member not found' });
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}
