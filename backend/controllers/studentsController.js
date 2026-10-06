import StudentModel from '../models/student.js';
import UserModel from '../models/user.js';
import CaseModel from '../models/case.js';
import { logAudit } from './auditController.js';
import { escapeRegex } from '../utils/inputSanitization.js';

function normalizeStudentStatus(status) {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'suspended') return 'Suspended';
    if (normalized === 'expelled') return 'Expelled';
    return 'Active';
}

function normalizeStudentPayload(payload = {}) {
    const firstName = payload.personalInfo?.firstName || payload.firstName || '';
    const surName = payload.personalInfo?.surName || payload.surName || '';
    const fullName = payload.fullName || [firstName, surName].filter(Boolean).join(' ').trim();

    return {
        studentId: payload.studentId,
        program: payload.program || '',
        year: payload.year || '',
        status: normalizeStudentStatus(payload.status),
        deliveryMode: payload.deliveryMode || '',
        personalInfo: {
            firstName: firstName || (fullName ? fullName.split(' ')[0] : ''),
            surName: surName || (fullName ? fullName.split(' ').slice(1).join(' ') : ''),
            nrc: payload.personalInfo?.nrc || payload.nrc || '',
            passport: payload.personalInfo?.passport || payload.passport || '',
            maritalStatus: payload.personalInfo?.maritalStatus || payload.maritalStatus || '',
            nationality: payload.personalInfo?.nationality || payload.nationality || '',
            gender: payload.personalInfo?.gender || payload.gender || '',
            dateOfBirth: payload.personalInfo?.dateOfBirth || payload.dateOfBirth || ''
        },
        accommodation: {
            roomNumber: String(payload.accommodation?.roomNumber || payload.roomNumber || '').trim()
        },
        addressInfo: {
            province: payload.addressInfo?.province || payload.province || '',
            town: payload.addressInfo?.town || payload.town || '',
            address: payload.addressInfo?.address || payload.address || '',
            phone: payload.addressInfo?.phone || payload.phone || '',
            email: payload.addressInfo?.email || payload.email || ''
        }
    };
}

export async function listStudents(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const program = req.query.program;
        const year = req.query.year;
        const gender = req.query.gender;

        const query = {};
        if (search) {
            const escapedSearch = escapeRegex(search);
            query.$or = [
                { 'personalInfo.firstName': { $regex: escapedSearch, $options: 'i' } },
                { 'personalInfo.surName': { $regex: escapedSearch, $options: 'i' } },
                { studentId: { $regex: escapedSearch, $options: 'i' } },
                { program: { $regex: escapedSearch, $options: 'i' } }
            ];
        }
        if (program) query.program = program;
        if (year) query.year = year;
        if (gender) query['personalInfo.gender'] = gender;

        const total = await StudentModel.countDocuments(query);
        const students = await StudentModel.find(query)
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({ students, total });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function getStudent(req, res) {
    try {
        let student = await StudentModel.findById(req.params.id);
        if (student) {
            const cases = await CaseModel.find({ student_id: student.studentId });
            student = student.toObject();
            student.disciplinaryHistory = cases.map(caseItem => {
                const caseObj = caseItem.toObject();
                return {
                    ...caseObj,
                    caseId: caseObj.case_id,
                    incidentDate: caseObj.incident_date,
                    offenseType: caseObj.offense_type,
                    createdBy: caseObj.created_by,
                    createdAt: caseObj.createdAt,
                    updatedAt: caseObj.updatedAt
                };
            });
        }
        if (!student) return res.status(404).json({ error: 'Student not found' });
        res.json(student);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function createStudent(req, res) {
    try {
        const normalizedStudent = normalizeStudentPayload(req.body);
        if (!normalizedStudent.accommodation.roomNumber) {
            return res.status(400).json({ error: 'Room number is required' });
        }
        if (!String(normalizedStudent.addressInfo.email || '').trim()) {
            return res.status(400).json({ error: 'Email is required' });
        }
        normalizedStudent.addressInfo.email = String(normalizedStudent.addressInfo.email).trim().toLowerCase();
        const student = await StudentModel.create(normalizedStudent);
        await UserModel.findOneAndUpdate(
            { username: normalizedStudent.studentId, role: 'student' },
            { $set: { email: normalizedStudent.addressInfo.email } }
        );
        await logAudit({
            action: 'student_created',
            entity: 'student',
            entityId: student._id || student.id || student.studentId,
            user: req.user && req.user.username,
            details: {
                studentData: {
                    studentId: student.studentId,
                    fullName: student.fullName,
                    program: student.program,
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
        const normalizedStudent = normalizeStudentPayload(req.body);
        if (!normalizedStudent.accommodation.roomNumber) {
            return res.status(400).json({ error: 'Room number is required' });
        }
        if (!String(normalizedStudent.addressInfo.email || '').trim()) {
            return res.status(400).json({ error: 'Email is required' });
        }
        normalizedStudent.addressInfo.email = String(normalizedStudent.addressInfo.email).trim().toLowerCase();
        const student = await StudentModel.findByIdAndUpdate(req.params.id, normalizedStudent, { new: true });
        if (student?.studentId) {
            await UserModel.findOneAndUpdate(
                { username: student.studentId, role: 'student' },
                { $set: { email: normalizedStudent.addressInfo.email } }
            );
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
        await StudentModel.findByIdAndDelete(req.params.id);
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

        const validationErrors = [];
        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const rowNumber = i + 1;

            if (!student.studentId || typeof student.studentId !== 'string' || student.studentId.trim().length < 3) {
                validationErrors.push(`Row ${rowNumber}: Invalid Student ID (minimum 3 characters)`);
            }

            if (!student.fullName || typeof student.fullName !== 'string' || student.fullName.trim().length < 2) {
                const firstName = student.firstName || student.personalInfo?.firstName;
                const surName = student.surName || student.personalInfo?.surName;
                if (!firstName || !surName) {
                    validationErrors.push(`Row ${rowNumber}: Invalid Name (provide fullName or firstName + surName)`);
                }
            }

            if (!student.program || typeof student.program !== 'string' || student.program.trim().length === 0) {
                validationErrors.push(`Row ${rowNumber}: Missing Program`);
            }

            if (student.year && !['1', '2', '3', '4', '5'].includes(student.year.toString())) {
                validationErrors.push(`Row ${rowNumber}: Invalid Year (must be 1, 2, 3, 4, or 5)`);
            }

            const normalizedGender = student.gender || student.personalInfo?.gender;
            if (normalizedGender && !['Male', 'Female', 'Other', 'MALE', 'FEMALE', 'OTHER'].includes(normalizedGender.toString())) {
                validationErrors.push(`Row ${rowNumber}: Invalid Gender (must be Male, Female, or Other)`);
            }
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validationErrors.slice(0, 10)
            });
        }

        let inserted = 0;
        const errors = [];

        const existingStudentIds = await StudentModel.find({
            studentId: { $in: students.map(s => s.studentId) }
        }).select('studentId');
        const existingStudents = existingStudentIds.map(s => s.studentId);

        const newStudents = students.filter(s => !existingStudents.includes(s.studentId));

        if (newStudents.length === 0) {
            return res.status(400).json({
                error: 'All students already exist in the database',
                existingCount: existingStudents.length
            });
        }

        for (const s of newStudents) {
            try {
                const cleanStudent = {
                    studentId: s.studentId.trim(),
                    ...normalizeStudentPayload({
                        ...s,
                        fullName: s.fullName,
                        program: s.program,
                        gender: s.gender || s.personalInfo?.gender
                    }),
                    year: s.year ? s.year.toString().trim() : undefined,
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

        const escapedQuery = escapeRegex(q);
        const students = await StudentModel.find({
            $or: [
                { 'personalInfo.firstName': { $regex: escapedQuery, $options: 'i' } },
                { 'personalInfo.surName': { $regex: escapedQuery, $options: 'i' } },
                { studentId: { $regex: escapedQuery, $options: 'i' } },
                { program: { $regex: escapedQuery, $options: 'i' } }
            ]
        }).limit(10);

        res.json(students);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
}

export async function getRecentStudents(req, res) {
    try {
        const { limit = 10 } = req.query;
        const students = await StudentModel.find({ lastSelected: { $exists: true } })
            .sort({ lastSelected: -1 })
            .limit(parseInt(limit));

        res.json(students);
    } catch (err) {
        console.error('Recent students error:', err);
        res.status(500).json({ error: 'Failed to get recent students' });
    }
}

export async function updateLastSelected(req, res) {
    try {
        const { id } = req.params;
        await StudentModel.findByIdAndUpdate(id, {
            lastSelected: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Update last selected error:', err);
        res.status(500).json({ error: 'Failed to update last selected' });
    }
}
