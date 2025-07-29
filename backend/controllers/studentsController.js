import StudentModel from '../models/student.js';
import CaseModel from '../models/case.js';
import db from '../models/db.js';
import { logAudit } from './auditController.js';
const dbType = process.env.DB_TYPE || 'mongo';

export async function listStudents(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const department = req.query.department;
        const year = req.query.year;
        const gender = req.query.gender;
        let students, total;
        if (dbType === 'mongo') {
            // Build query with filters
            const query = {};
            if (search) {
                query.$or = [
                    { fullName: { $regex: search, $options: 'i' } },
                    { studentId: { $regex: search, $options: 'i' } }
                ];
            }
            if (department) query.department = department;
            if (year) query.year = year;
            if (gender) query.gender = gender;

            total = await StudentModel.countDocuments(query);
            students = await StudentModel.find(query)
                .skip((page - 1) * limit)
                .limit(limit);
        } else if (dbType === 'mysql') {
            // Build query with filters
            let countQuery = 'SELECT COUNT(*) as count FROM students';
            let selectQuery = 'SELECT * FROM students';
            let whereConditions = [];
            let queryParams = [];

            if (search) {
                whereConditions.push('(fullName LIKE ? OR studentId LIKE ?)');
                const searchTerm = `%${search}%`;
                queryParams.push(searchTerm, searchTerm);
            }
            if (department) {
                whereConditions.push('department = ?');
                queryParams.push(department);
            }
            if (year) {
                whereConditions.push('year = ?');
                queryParams.push(year);
            }
            if (gender) {
                whereConditions.push('gender = ?');
                queryParams.push(gender);
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

        // Validate input data
        const validationErrors = [];
        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const rowNumber = i + 1;

            if (!student.studentId || typeof student.studentId !== 'string' || student.studentId.trim().length < 3) {
                validationErrors.push(`Row ${rowNumber}: Invalid Student ID (minimum 3 characters)`);
            }

            if (!student.fullName || typeof student.fullName !== 'string' || student.fullName.trim().length < 2) {
                validationErrors.push(`Row ${rowNumber}: Invalid Full Name (minimum 2 characters)`);
            }

            if (!student.department || typeof student.department !== 'string' || student.department.trim().length === 0) {
                validationErrors.push(`Row ${rowNumber}: Missing Department`);
            }

            if (student.year && !['1', '2', '3', '4'].includes(student.year.toString())) {
                validationErrors.push(`Row ${rowNumber}: Invalid Year (must be 1, 2, 3, or 4)`);
            }

            if (student.gender && !['Male', 'Female', 'Other'].includes(student.gender.toString())) {
                validationErrors.push(`Row ${rowNumber}: Invalid Gender (must be Male, Female, or Other)`);
            }
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validationErrors.slice(0, 10) // Limit to first 10 errors
            });
        }

        let inserted = 0;
        let errors = [];
        let existingStudents = [];

        // Check for existing students first
        if (dbType === 'mongo') {
            const existingStudentIds = await StudentModel.find({
                studentId: { $in: students.map(s => s.studentId) }
            }).select('studentId');
            existingStudents = existingStudentIds.map(s => s.studentId);
        } else if (dbType === 'mysql') {
            const studentIds = students.map(s => s.studentId);
            const placeholders = studentIds.map(() => '?').join(',');
            const [rows] = await db.execute(`SELECT studentId FROM students WHERE studentId IN (${placeholders})`, studentIds);
            existingStudents = rows.map(row => row.studentId);
        }

        // Filter out existing students
        const newStudents = students.filter(s => !existingStudents.includes(s.studentId));

        if (newStudents.length === 0) {
            return res.status(400).json({
                error: 'All students already exist in the database',
                existingCount: existingStudents.length
            });
        }

        // Insert new students
        if (dbType === 'mongo') {
            for (const s of newStudents) {
                try {
                    // Clean and validate data
                    const cleanStudent = {
                        studentId: s.studentId.trim(),
                        fullName: s.fullName.trim(),
                        department: s.department.trim(),
                        year: s.year ? s.year.toString().trim() : undefined,
                        gender: s.gender ? s.gender.toString().trim() : undefined
                    };

                    await StudentModel.create(cleanStudent);
                    inserted++;
                } catch (err) {
                    console.error('MongoDB insert error:', err);
                    errors.push({
                        student: s,
                        error: err.code === 11000 ? 'Student ID already exists' : err.message
                    });
                }
            }
        } else if (dbType === 'mysql') {
            for (const s of newStudents) {
                try {
                    // Clean and validate data
                    const cleanStudent = {
                        studentId: s.studentId.trim(),
                        fullName: s.fullName.trim(),
                        department: s.department.trim(),
                        year: s.year ? s.year.toString().trim() : undefined,
                        gender: s.gender ? s.gender.toString().trim() : undefined
                    };

                    await db.execute(
                        'INSERT INTO students (studentId, fullName, department, year, gender) VALUES (?, ?, ?, ?, ?)', [cleanStudent.studentId, cleanStudent.fullName, cleanStudent.department, cleanStudent.year, cleanStudent.gender]
                    );
                    inserted++;
                } catch (err) {
                    console.error('MySQL insert error:', err);
                    errors.push({
                        student: s,
                        error: err.code === 'ER_DUP_ENTRY' ? 'Student ID already exists' : err.message
                    });
                }
            }
        }

        // Log audit
        await logAudit({
            action: 'students_imported',
            entity: 'student',
            user: req.user && req.user.username,
            details: {
                totalRequested: students.length,
                inserted,
                skipped: existingStudents.length,
                errors: errors.length,
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Return detailed results
        res.json({
            success: true,
            inserted,
            skipped: existingStudents.length,
            errors,
            summary: {
                total: students.length,
                successful: inserted,
                skipped: existingStudents.length,
                failed: errors.length
            }
        });
    } catch (err) {
        console.error('Import error:', err);
        res.status(500).json({ error: 'Server error during import' });
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