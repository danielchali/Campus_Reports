import StaffModel from '../models/staff.js';
import CaseModel from '../models/case.js';
import db from '../models/db.js';
import { logAudit } from './auditController.js';
const dbType = process.env.DB_TYPE || 'mongo';

export async function listStaff(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const department = req.query.department;
        const position = req.query.position;
        let staff, total;
        if (dbType === 'mongo') {
            // Build query with filters
            const query = {};
            if (search) {
                query.$or = [
                    { fullName: { $regex: search, $options: 'i' } },
                    { staffId: { $regex: search, $options: 'i' } }
                ];
            }
            if (department) query.department = department;
            if (position) query.position = position;

            total = await StaffModel.countDocuments(query);
            staff = await StaffModel.find(query)
                .skip((page - 1) * limit)
                .limit(limit);
        } else if (dbType === 'mysql') {
            // Build query with filters
            let countQuery = 'SELECT COUNT(*) as count FROM staff';
            let selectQuery = 'SELECT * FROM staff';
            let whereConditions = [];
            let queryParams = [];

            if (search) {
                whereConditions.push('(fullName LIKE ? OR staffId LIKE ?)');
                const searchTerm = `%${search}%`;
                queryParams.push(searchTerm, searchTerm);
            }
            if (department) {
                whereConditions.push('department = ?');
                queryParams.push(department);
            }
            if (position) {
                whereConditions.push('position = ?');
                queryParams.push(position);
            }

            if (whereConditions.length > 0) {
                const whereClause = ' WHERE ' + whereConditions.join(' AND ');
                countQuery += whereClause;
                selectQuery += whereClause;
            }

            selectQuery += ' LIMIT ? OFFSET ?';
            queryParams.push(limit, (page - 1) * limit);

            const [
                [{ count }]
            ] = await db.execute(countQuery, queryParams.slice(0, -2));
            total = count;
            const [rows] = await db.execute(selectQuery, queryParams);
            staff = rows;
        }
        res.json({ staff, total });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function getStaff(req, res) {
    try {
        let staff;
        if (dbType === 'mongo') {
            staff = await StaffModel.findById(req.params.id);
            if (staff) {
                // Find cases associated with this staff member
                const cases = await CaseModel.find({ 
                    $or: [
                        { staff_id: staff.staffId },
                        { staff_ids: staff.staffId }
                    ]
                });
                staff = staff.toObject();
                // Transform case field names to camelCase for frontend
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
        } else if (dbType === 'mysql') {
            const [rows] = await db.execute('SELECT * FROM staff WHERE id = ?', [req.params.id]);
            staff = rows[0];
            if (staff) {
                const [cases] = await db.execute('SELECT * FROM cases WHERE staff_id = ?', [staff.staffId]);
                // Transform case field names to camelCase for frontend
                staff.disciplinaryHistory = cases.map(caseItem => ({
                    ...caseItem,
                    incidentDate: caseItem.incident_date,
                    offenseType: caseItem.offense_type,
                    createdBy: caseItem.created_by,
                    createdAt: caseItem.createdAt,
                    updatedAt: caseItem.updatedAt
                }));
            }
        }
        if (!staff) return res.status(404).json({ error: 'Staff member not found' });
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function createStaff(req, res) {
    try {
        let staff;
        if (dbType === 'mongo') {
            staff = await StaffModel.create(req.body);
        } else if (dbType === 'mysql') {
            const { staffId, fullName, department, position, email, phone, hireDate } = req.body;
            await db.execute('INSERT INTO staff (staffId, fullName, department, position, email, phone, hireDate) VALUES (?, ?, ?, ?, ?, ?, ?)', [staffId, fullName, department, position, email, phone, hireDate]);
            const [rows] = await db.execute('SELECT * FROM staff WHERE staffId = ?', [staffId]);
            staff = rows[0];
        }
        await logAudit({
            action: 'staff_created',
            entity: 'staff',
            entityId: (staff && (staff._id || staff.id || staff.staffId)),
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
        let staff;
        if (dbType === 'mongo') {
            staff = await StaffModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        } else if (dbType === 'mysql') {
            const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ');
            const values = Object.values(req.body);
            values.push(req.params.id);
            await db.execute(`UPDATE staff SET ${fields} WHERE id = ?`, values);
            const [rows] = await db.execute('SELECT * FROM staff WHERE id = ?', [req.params.id]);
            staff = rows[0];
        }
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
        if (dbType === 'mongo') {
            await StaffModel.findByIdAndDelete(req.params.id);
        } else if (dbType === 'mysql') {
            await db.execute('DELETE FROM staff WHERE id = ?', [req.params.id]);
        }
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
        
        let staff;
        if (dbType === 'mongo') {
            staff = await StaffModel.find({
                $or: [
                    { fullName: { $regex: query, $options: 'i' } },
                    { staffId: { $regex: query, $options: 'i' } }
                ]
            }).limit(10);
        } else if (dbType === 'mysql') {
            const [rows] = await db.execute(
                'SELECT * FROM staff WHERE fullName LIKE ? OR staffId LIKE ? LIMIT 10',
                [`%${query}%`, `%${query}%`]
            );
            staff = rows;
        }
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function getRecentStaff(req, res) {
    try {
        let staff;
        if (dbType === 'mongo') {
            staff = await StaffModel.find().sort({ lastSelected: -1 }).limit(10);
        } else if (dbType === 'mysql') {
            const [rows] = await db.execute('SELECT * FROM staff ORDER BY lastSelected DESC LIMIT 10');
            staff = rows;
        }
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function updateLastSelected(req, res) {
    try {
        const lastSelected = new Date();
        let staff;
        if (dbType === 'mongo') {
            staff = await StaffModel.findByIdAndUpdate(
                req.params.id,
                { lastSelected },
                { new: true }
            );
        } else if (dbType === 'mysql') {
            await db.execute(
                'UPDATE staff SET lastSelected = ? WHERE id = ?',
                [lastSelected, req.params.id]
            );
            const [rows] = await db.execute('SELECT * FROM staff WHERE id = ?', [req.params.id]);
            staff = rows[0];
        }
        if (!staff) return res.status(404).json({ error: 'Staff member not found' });
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}