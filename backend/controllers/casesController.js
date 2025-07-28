import CaseModel from '../models/case.js';
import db from '../models/db.js';
import { logAudit } from './auditController.js';
const dbType = process.env.DB_TYPE || 'mongo';

export async function listCases(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const studentId = req.query.studentId;
        let cases, total;
        if (dbType === 'mongo') {
            // Build query with optional studentId filter
            const query = studentId ? { student_id: studentId } : {};
            total = await CaseModel.countDocuments(query);
            cases = await CaseModel.find(query)
                .skip((page - 1) * limit)
                .limit(limit);

            // Populate student information for each case
            const StudentModel = (await
                import ('../models/student.js')).default;
            for (let i = 0; i < cases.length; i++) {
                cases[i] = cases[i].toObject();

                // Handle both single and multiple student cases
                if (cases[i].student_ids && cases[i].student_ids.length > 0) {
                    // Multiple students case - get the first student for display
                    const student = await StudentModel.findOne({ studentId: cases[i].student_ids[0] });
                    if (student) {
                        cases[i].student = student.toObject();
                    } else {
                        cases[i].student = null;
                        console.warn(`Student not found for case ${cases[i]._id}, student_id: ${cases[i].student_ids[0]}`);
                    }
                } else if (cases[i].student_id) {
                    // Single student case
                    const student = await StudentModel.findOne({ studentId: cases[i].student_id });
                    if (student) {
                        cases[i].student = student.toObject();
                    } else {
                        cases[i].student = null;
                        console.warn(`Student not found for case ${cases[i]._id}, student_id: ${cases[i].student_id}`);
                    }
                } else {
                    cases[i].student = null;
                    console.warn(`Case ${cases[i]._id} has no student_id or student_ids`);
                }

                // Transform field names to camelCase for frontend
                cases[i] = {
                    ...cases[i],
                    incidentDate: cases[i].incident_date,
                    offenseType: cases[i].offense_type,
                    createdBy: cases[i].created_by,
                    createdAt: cases[i].createdAt,
                    updatedAt: cases[i].updatedAt
                };
            }
        } else if (dbType === 'mysql') {
            // Build query with optional studentId filter
            let countQuery = 'SELECT COUNT(*) as count FROM cases';
            let selectQuery = `
                SELECT c.*, s.studentId, s.fullName, s.department, s.year, s.gender 
                FROM cases c 
                LEFT JOIN students s ON c.student_id = s.studentId
            `;
            let queryParams = [];

            if (studentId) {
                countQuery += ' WHERE student_id = ?';
                selectQuery += ' WHERE c.student_id = ?';
                queryParams.push(studentId);
            }

            selectQuery += ' LIMIT ? OFFSET ?';
            queryParams.push(limit, (page - 1) * limit);

            const [
                [{ count }]
            ] = await db.execute(countQuery, studentId ? [studentId] : []);
            total = count;
            const [rows] = await db.execute(selectQuery, queryParams);

            // Transform the data to match the expected format
            cases = rows.map(row => ({
                ...row,
                incidentDate: row.incident_date,
                offenseType: row.offense_type,
                createdBy: row.created_by,
                student: row.studentId ? {
                    studentId: row.studentId,
                    fullName: row.fullName,
                    department: row.department,
                    year: row.year,
                    gender: row.gender
                } : null
            }));
        }
        res.json({ cases, total });
    } catch (err) {
        console.error('Error in listCases:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function getCase(req, res) {
    try {
        let caseItem;
        if (dbType === 'mongo') {
            caseItem = await CaseModel.findById(req.params.id);
            if (caseItem) {
                // Populate student information
                const StudentModel = (await
                    import ('../models/student.js')).default;
                const student = await StudentModel.findOne({ studentId: caseItem.student_id });
                caseItem = caseItem.toObject();
                if (student) {
                    caseItem.student = student.toObject();
                } else {
                    caseItem.student = null; // Set to null if student not found
                }
                // Transform field names to camelCase for frontend
                caseItem = {
                    ...caseItem,
                    incidentDate: caseItem.incident_date,
                    offenseType: caseItem.offense_type,
                    createdBy: caseItem.created_by,
                    createdAt: caseItem.createdAt,
                    updatedAt: caseItem.updatedAt
                };
            }
        } else if (dbType === 'mysql') {
            const [rows] = await db.execute(`
                SELECT c.*, s.studentId, s.fullName, s.department, s.year, s.gender 
                FROM cases c 
                LEFT JOIN students s ON c.student_id = s.studentId 
                WHERE c.id = ?
            `, [req.params.id]);
            caseItem = rows[0];
            if (caseItem) {
                // Transform the data to match the expected format
                caseItem = {
                    ...caseItem,
                    incidentDate: caseItem.incident_date,
                    offenseType: caseItem.offense_type,
                    createdBy: caseItem.created_by,
                    student: caseItem.studentId ? {
                        studentId: caseItem.studentId,
                        fullName: caseItem.fullName,
                        department: caseItem.department,
                        year: caseItem.year,
                        gender: caseItem.gender
                    } : null
                };
            }
        }
        if (!caseItem) return res.status(404).json({ error: 'Case not found' });
        res.json(caseItem);
    } catch (err) {
        console.error('Error in getCase:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function createCase(req, res) {
    try {
        // Check if this is a single student case or multiple students case
        const isMultipleStudents = req.body.student_ids && Array.isArray(req.body.student_ids) && req.body.student_ids.length > 0;
        const isSingleStudent = req.body.student_id && req.body.student_id.trim() !== '';

        if (!isMultipleStudents && !isSingleStudent) {
            return res.status(400).json({ error: 'Either student_id (single student) or student_ids (multiple students) must be provided' });
        }

        // Enforce required fields
        const requiredFields = ['incident_date', 'offense_type', 'severity', 'description'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `Missing required field: ${field}` });
            }
        }

        // Set default values for optional fields
        const caseData = {
            ...req.body,
            status: req.body.status || 'Open', // Default to 'Open' for new cases
            sanctions: req.body.sanctions || '', // Default to empty string if not provided
            attachments: req.body.attachments || [], // Default to empty array
            created_by: (req.user && req.user.username) ? req.user.username : req.body.created_by,
            case_type: isMultipleStudents ? 'group' : 'single' // Set case type based on student count
        };

        let caseItem;
        if (dbType === 'mongo') {
            caseItem = await CaseModel.create(caseData);
            // Populate student information
            const StudentModel = (await
                import ('../models/student.js')).default;

            if (isMultipleStudents) {
                // For multiple students, populate all students
                const students = await StudentModel.find({ studentId: { $in: caseItem.student_ids } });
                caseItem = caseItem.toObject();
                caseItem.students = students.map(s => s.toObject());
                caseItem.student = null; // Keep null for backward compatibility
            } else {
                // For single student, populate single student (backward compatibility)
                const student = await StudentModel.findOne({ studentId: caseItem.student_id });
                caseItem = caseItem.toObject();
                if (student) {
                    caseItem.student = student.toObject();
                } else {
                    caseItem.student = null; // Set to null if student not found
                }
                caseItem.students = caseItem.student ? [caseItem.student] : []; // Add students array for consistency
            }

            // Transform field names to camelCase for frontend
            caseItem = {
                ...caseItem,
                incidentDate: caseItem.incident_date,
                offenseType: caseItem.offense_type,
                createdBy: caseItem.created_by,
                createdAt: caseItem.createdAt,
                updatedAt: caseItem.updatedAt
            };
        } else if (dbType === 'mysql') {
            // For MySQL, we'll need to handle multiple students differently
            // For now, we'll create separate cases for each student in a group case
            if (isMultipleStudents) {
                const createdCases = [];
                for (const studentId of req.body.student_ids) {
                    const singleCaseData = {
                        ...caseData,
                        student_id: studentId,
                        case_type: 'group'
                    };
                    const { student_id, incident_date, description, offense_type, severity, status, sanctions, attachments, created_by } = singleCaseData;
                    await db.execute('INSERT INTO cases (student_id, incident_date, description, offense_type, severity, status, sanctions, attachments, created_by, case_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [student_id, incident_date, description, offense_type, severity, status, sanctions, JSON.stringify(attachments || []), created_by, 'group']);
                }
                // Return the first case as representative
                const [rows] = await db.execute(`
                    SELECT c.*, s.studentId, s.fullName, s.department, s.year, s.gender 
                    FROM cases c 
                    LEFT JOIN students s ON c.student_id = s.studentId 
                    WHERE c.incident_date = ? AND c.created_by = ? AND c.case_type = 'group'
                    ORDER BY c.id DESC LIMIT 1
                `, [req.body.incident_date, caseData.created_by]);
                caseItem = rows[0];
            } else {
                // Single student case (existing logic)
                const { student_id, incident_date, description, offense_type, severity, status, sanctions, attachments, created_by } = caseData;
                await db.execute('INSERT INTO cases (student_id, incident_date, description, offense_type, severity, status, sanctions, attachments, created_by, case_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [student_id, incident_date, description, offense_type, severity, status, sanctions, JSON.stringify(attachments || []), created_by, 'single']);
                const [rows] = await db.execute(`
                    SELECT c.*, s.studentId, s.fullName, s.department, s.year, s.gender 
                    FROM cases c 
                    LEFT JOIN students s ON c.student_id = s.studentId 
                    WHERE c.student_id = ? AND c.incident_date = ?
                `, [student_id, incident_date]);
                caseItem = rows[0];
            }

            if (caseItem) {
                // Transform the data to match the expected format
                caseItem = {
                    ...caseItem,
                    incidentDate: caseItem.incident_date,
                    offenseType: caseItem.offense_type,
                    createdBy: caseItem.created_by,
                    student: caseItem.studentId ? {
                        studentId: caseItem.studentId,
                        fullName: caseItem.fullName,
                        department: caseItem.department,
                        year: caseItem.year,
                        gender: caseItem.gender
                    } : null,
                    students: caseItem.studentId ? [{
                        studentId: caseItem.studentId,
                        fullName: caseItem.fullName,
                        department: caseItem.department,
                        year: caseItem.year,
                        gender: caseItem.gender
                    }] : []
                };
            }
        }

        // Audit log for case creation
        await logAudit({
            action: 'case_created',
            entity: 'case',
            entityId: caseItem._id || caseItem.id,
            user: (req.user && req.user.username) || req.body.created_by || 'unknown',
            details: {
                caseData: {
                    incidentDate: caseData.incident_date,
                    offenseType: caseData.offense_type,
                    severity: caseData.severity,
                    status: caseData.status,
                    caseType: caseData.case_type,
                    studentCount: isMultipleStudents ? req.body.student_ids.length : 1
                },
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json(caseItem);
    } catch (err) {
        console.error('Error in createCase:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function updateCase(req, res) {
    try {
        let caseItem;
        let oldStatus;
        if (dbType === 'mongo') {
            // Fetch old case for status comparison
            const oldCase = await CaseModel.findById(req.params.id);
            oldStatus = oldCase ? oldCase.status : undefined;
            caseItem = await CaseModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (caseItem) {
                // Populate student information
                const StudentModel = (await
                    import ('../models/student.js')).default;
                const student = await StudentModel.findOne({ studentId: caseItem.student_id });
                caseItem = caseItem.toObject();
                if (student) {
                    caseItem.student = student.toObject();
                } else {
                    caseItem.student = null; // Set to null if student not found
                }
            }
        } else if (dbType === 'mysql') {
            // Fetch old case for status comparison
            const [oldRows] = await db.execute('SELECT status FROM cases WHERE id = ?', [req.params.id]);
            oldStatus = (oldRows[0] && oldRows[0].status) || undefined;
            const fields = Object.keys(req.body).map(k => `${k} = ?`).join(', ');
            const values = Object.values(req.body);
            values.push(req.params.id);
            await db.execute(`UPDATE cases SET ${fields} WHERE id = ?`, values);
            const [rows] = await db.execute(`
                SELECT c.*, s.studentId, s.fullName, s.department, s.year, s.gender 
                FROM cases c 
                LEFT JOIN students s ON c.student_id = s.studentId 
                WHERE c.id = ?
            `, [req.params.id]);
            caseItem = rows[0];
            if (caseItem) {
                // Transform the data to match the expected format
                caseItem = {
                    ...caseItem,
                    incidentDate: caseItem.incident_date,
                    offenseType: caseItem.offense_type,
                    createdBy: caseItem.created_by,
                    student: caseItem.studentId ? {
                        studentId: caseItem.studentId,
                        fullName: caseItem.fullName,
                        department: caseItem.department,
                        year: caseItem.year,
                        gender: caseItem.gender
                    } : null
                };
            }
        }
        // Audit log for status change
        if (req.body.status && oldStatus && req.body.status !== oldStatus) {
            await logAudit({
                action: 'status_change',
                entity: 'case',
                entityId: req.params.id,
                user: (req.user && req.user.username) || req.body.user || 'unknown',
                details: {
                    oldStatus,
                    newStatus: req.body.status,
                    changes: req.body,
                    timestamp: new Date().toISOString()
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
        }

        // Audit log for other updates
        if (Object.keys(req.body).length > 0) {
            await logAudit({
                action: 'case_updated',
                entity: 'case',
                entityId: req.params.id,
                user: (req.user && req.user.username) || req.body.user || 'unknown',
                details: {
                    changes: req.body,
                    timestamp: new Date().toISOString()
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
        }
        res.json(caseItem);
    } catch (err) {
        console.error('Error in updateCase:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function deleteCase(req, res) {
    try {
        if (dbType === 'mongo') {
            await CaseModel.findByIdAndDelete(req.params.id);
        } else if (dbType === 'mysql') {
            await db.execute('DELETE FROM cases WHERE id = ?', [req.params.id]);
        }
        // Audit log for deletion
        await logAudit({
            action: 'case_deleted',
            entity: 'case',
            entityId: req.params.id,
            user: (req.user && req.user.username) || req.body.user || 'unknown',
            details: {
                timestamp: new Date().toISOString(),
                reason: 'Case permanently deleted'
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}