import StudentModel from '../models/student.js';
import CaseModel from '../models/case.js';
import db from '../models/db.js';
import { logAudit } from './auditController.js';
const dbType = process.env.DB_TYPE || 'mongo';

export async function listStudents(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        let students, total;
        if (dbType === 'mongo') {
            total = await StudentModel.countDocuments();
            students = await StudentModel.find()
                .skip((page - 1) * limit)
                .limit(limit);
        } else if (dbType === 'mysql') {
            const [
                [{ count }]
            ] = await db.execute('SELECT COUNT(*) as count FROM students');
            total = count;
            const [rows] = await db.execute('SELECT * FROM students LIMIT ? OFFSET ?', [limit, (page - 1) * limit]);
            students = rows;
        }
        res.json({ students, total });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function getStudent(req, res) {
    try {
        let student;
        if (dbType === 'mongo') {
            student = await StudentModel.findById(req.params.id);
            if (student) {
                const cases = await CaseModel.find({ student_id: student.studentId });
                student = student.toObject();
                // Transform case field names to camelCase for frontend
                student.disciplinaryHistory = cases.map(caseItem => {
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
            const [rows] = await db.execute('SELECT * FROM students WHERE id = ?', [req.params.id]);
            student = rows[0];
            if (student) {
                const [cases] = await db.execute('SELECT * FROM cases WHERE student_id = ?', [student.studentId]);
                // Transform case field names to camelCase for frontend
                student.disciplinaryHistory = cases.map(caseItem => ({
                    ...caseItem,
                    incidentDate: caseItem.incident_date,
                    offenseType: caseItem.offense_type,
                    createdBy: caseItem.created_by,
                    createdAt: caseItem.createdAt,
                    updatedAt: caseItem.updatedAt
                }));
            }
        }
        if (!student) return res.status(404).json({ error: 'Student not found' });
        res.json(student);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function createStudent(req, res) {
    try {
        let student;
        if (dbType === 'mongo') {
            student = await StudentModel.create(req.body);
        } else if (dbType === 'mysql') {
            const { studentId, fullName, department, year, gender } = req.body;
            await db.execute('INSERT INTO students (studentId, fullName, department, year, gender) VALUES (?, ?, ?, ?, ?)', [studentId, fullName, department, year, gender]);
            const [rows] = await db.execute('SELECT * FROM students WHERE studentId = ?', [studentId]);
            student = rows[0];
        }
        await logAudit({
            action: 'student_created',
            entity: 'student',
            entityId: (student && (student._id || student.id || student.studentId)),
            user: req.user && req.user.username,
            details: {
                studentData: {
                    studentId: student.studentId,
                    fullName: student.fullName,
                    department: student.department,
                    year: student.year,
                    gender: student.gender
                },
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json(student);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function updateStudent(req, res) {
    try {
        let student;
        if (dbType === 'mongo') {
            student = await StudentModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        } else if (dbType === 'mysql') {
            const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ');
            const values = Object.values(req.body);
            values.push(req.params.id);
            await db.execute(`UPDATE students SET ${fields} WHERE id = ?`, values);
            const [rows] = await db.execute('SELECT * FROM students WHERE id = ?', [req.params.id]);
            student = rows[0];
        }
        await logAudit({
            action: 'student_updated',
            entity: 'student',
            entityId: req.params.id,
            user: req.user && req.user.username,
            details: {
                changes: req.body,
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json(student);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function deleteStudent(req, res) {
    try {
        if (dbType === 'mongo') {
            await StudentModel.findByIdAndDelete(req.params.id);
        } else if (dbType === 'mysql') {
            await db.execute('DELETE FROM students WHERE id = ?', [req.params.id]);
        }
        await logAudit({
            action: 'student_deleted',
            entity: 'student',
            entityId: req.params.id,
            user: req.user && req.user.username,
            details: {
                timestamp: new Date().toISOString(),
                reason: 'Student permanently deleted'
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function importStudents(req, res) {
    try {
        const students = req.body.students;
        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ error: 'No students provided' });
        }
        let inserted = 0,
            errors = [];
        if (dbType === 'mongo') {
            for (const s of students) {
                try {
                    await StudentModel.create(s);
                    inserted++;
                } catch (err) {
                    errors.push({ student: s, error: err.message });
                }
            }
        } else if (dbType === 'mysql') {
            for (const s of students) {
                try {
                    await db.execute('INSERT INTO students (studentId, fullName, department, year, gender) VALUES (?, ?, ?, ?, ?)', [s.studentId, s.fullName, s.department, s.year, s.gender]);
                    inserted++;
                } catch (err) {
                    errors.push({ student: s, error: err.message });
                }
            }
        }
        await logAudit({
            action: 'students_imported',
            entity: 'student',
            user: req.user && req.user.username,
            details: {
                count: inserted,
                errors,
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({ success: true, inserted, errors });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function searchStudents(req, res) {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json([]);
        }

        let students;
        if (dbType === 'mongo') {
            students = await StudentModel.find({
                $or: [
                    { fullName: { $regex: q, $options: 'i' } },
                    { studentId: { $regex: q, $options: 'i' } },
                    { department: { $regex: q, $options: 'i' } }
                ]
            }).limit(10);
        } else if (dbType === 'mysql') {
            const [rows] = await db.execute(`
                SELECT * FROM students 
                WHERE fullName LIKE ? OR studentId LIKE ? OR department LIKE ?
                LIMIT 10
            `, [`%${q}%`, `%${q}%`, `%${q}%`]);
            students = rows;
        }

        res.json(students);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
}

export async function getRecentStudents(req, res) {
    try {
        const { limit = 10 } = req.query;

        let students;
        if (dbType === 'mongo') {
            students = await StudentModel.find({ lastSelected: { $exists: true } })
                .sort({ lastSelected: -1 })
                .limit(parseInt(limit));
        } else if (dbType === 'mysql') {
            const [rows] = await db.execute(`
                SELECT * FROM students 
                WHERE lastSelected IS NOT NULL
                ORDER BY lastSelected DESC
                LIMIT ?
            `, [parseInt(limit)]);
            students = rows;
        }

        res.json(students);
    } catch (err) {
        console.error('Recent students error:', err);
        res.status(500).json({ error: 'Failed to get recent students' });
    }
}

export async function updateLastSelected(req, res) {
    try {
        const { id } = req.params;

        if (dbType === 'mongo') {
            await StudentModel.findByIdAndUpdate(id, {
                lastSelected: new Date().toISOString()
            });
        } else if (dbType === 'mysql') {
            await db.execute(`
                UPDATE students 
                SET lastSelected = NOW() 
                WHERE id = ?
            `, [id]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Update last selected error:', err);
        res.status(500).json({ error: 'Failed to update last selected' });
    }
}