import CaseModel from '../models/case.js';
import CounterModel from '../models/counter.js';
import { logAudit } from './auditController.js';
import { emitDashboardRefresh } from '../utils/socket.js';
import { escapeRegex, pickFields } from '../utils/inputSanitization.js';

const CASE_WRITE_FIELDS = [
    'student_id',
    'student_ids',
    'staff_id',
    'staff_ids',
    'incident_date',
    'description',
    'offense_type',
    'severity',
    'status',
    'sanctions',
    'student_case_process',
    'attachments',
    'created_by',
    'case_type'
];

function formatCaseId(value) {
    return String(value).padStart(4, '0');
}

async function getNextMongoCaseId() {
    const counter = await CounterModel.findOneAndUpdate(
        { key: 'case_id' },
        { $inc: { value: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return formatCaseId(counter.value);
}

function normalizeCaseForFrontend(caseItem) {
    return {
        ...caseItem,
        caseId: caseItem.case_id || caseItem.caseId || (caseItem.id ? formatCaseId(caseItem.id) : undefined),
        incidentDate: caseItem.incident_date,
        offenseType: caseItem.offense_type,
        createdBy: caseItem.created_by,
        createdAt: caseItem.createdAt,
        updatedAt: caseItem.updatedAt
    };
}

export async function listCases(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const studentId = req.query.studentId;
        const search = req.query.search;
        const status = req.query.status;
        const severity = req.query.severity;

        const query = {};
        if (studentId) query.student_id = studentId;
        if (status) query.status = status;
        if (severity) query.severity = severity;
        if (search) {
            const escapedSearch = escapeRegex(search);
            query.$or = [
                { offense_type: { $regex: escapedSearch, $options: 'i' } },
                { description: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        const total = await CaseModel.countDocuments(query);
        let cases = await CaseModel.find(query)
            .skip((page - 1) * limit)
            .limit(limit);

        const StudentModel = (await import('../models/student.js')).default;
        const StaffModel = (await import('../models/staff.js')).default;

        for (let i = 0; i < cases.length; i++) {
            cases[i] = cases[i].toObject();

            if (cases[i].student_ids && cases[i].student_ids.length > 0) {
                const student = await StudentModel.findOne({ studentId: cases[i].student_ids[0] });
                cases[i].student = student ? student.toObject() : null;
            } else if (cases[i].student_id) {
                const student = await StudentModel.findOne({ studentId: cases[i].student_id });
                cases[i].student = student ? student.toObject() : null;
            } else if (cases[i].staff_ids && cases[i].staff_ids.length > 0) {
                const staff = await StaffModel.findOne({ staffId: cases[i].staff_ids[0] });
                cases[i].staff = staff ? staff.toObject() : null;
            } else if (cases[i].staff_id) {
                const staff = await StaffModel.findOne({ staffId: cases[i].staff_id });
                cases[i].staff = staff ? staff.toObject() : null;
            } else {
                cases[i].student = null;
                cases[i].staff = null;
            }

            cases[i] = normalizeCaseForFrontend(cases[i]);
        }

        res.json({ cases, total });
    } catch (err) {
        console.error('Error in listCases:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function getCase(req, res) {
    try {
        let caseItem = await CaseModel.findById(req.params.id);
        if (caseItem) {
            const StudentModel = (await import('../models/student.js')).default;
            const StaffModel = (await import('../models/staff.js')).default;
            caseItem = caseItem.toObject();

            if (caseItem.student_ids && caseItem.student_ids.length > 0) {
                const students = await StudentModel.find({ studentId: { $in: caseItem.student_ids } });
                caseItem.students = students.map(s => s.toObject());
                caseItem.student = students.length > 0 ? students[0].toObject() : null;
            } else if (caseItem.student_id) {
                const student = await StudentModel.findOne({ studentId: caseItem.student_id });
                if (student) {
                    caseItem.student = student.toObject();
                    caseItem.students = [student.toObject()];
                } else {
                    caseItem.student = null;
                    caseItem.students = [];
                }
            } else if (caseItem.staff_ids && caseItem.staff_ids.length > 0) {
                const staffMembers = await StaffModel.find({ staffId: { $in: caseItem.staff_ids } });
                caseItem.staffMembers = staffMembers.map(s => s.toObject());
                caseItem.staff = staffMembers.length > 0 ? staffMembers[0].toObject() : null;
            } else if (caseItem.staff_id) {
                const staff = await StaffModel.findOne({ staffId: caseItem.staff_id });
                if (staff) {
                    caseItem.staff = staff.toObject();
                    caseItem.staffMembers = [staff.toObject()];
                } else {
                    caseItem.staff = null;
                    caseItem.staffMembers = [];
                }
            } else {
                caseItem.student = null;
                caseItem.students = [];
                caseItem.staff = null;
                caseItem.staffMembers = [];
            }

            caseItem = normalizeCaseForFrontend(caseItem);
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
        const requestedStatus = (req.body.status || '').toString().trim().toLowerCase();
        const isDraft = requestedStatus === 'draft';
        const isMultipleStudents = req.body.student_ids && Array.isArray(req.body.student_ids) && req.body.student_ids.length > 0;
        const isSingleStudent = req.body.student_id && req.body.student_id.trim() !== '';
        const isMultipleStaff = req.body.staff_ids && Array.isArray(req.body.staff_ids) && req.body.staff_ids.length > 0;
        const isSingleStaff = req.body.staff_id && req.body.staff_id.trim() !== '';

        if (!isMultipleStudents && !isSingleStudent && !isMultipleStaff && !isSingleStaff) {
            return res.status(400).json({ error: 'Either student_id, student_ids, staff_id, or staff_ids must be provided' });
        }

        const hasStudentInfo = isMultipleStudents || isSingleStudent;
        const hasStaffInfo = isMultipleStaff || isSingleStaff;
        if (hasStudentInfo && hasStaffInfo) {
            return res.status(400).json({ error: 'Cannot create a case for both student and staff simultaneously' });
        }

        if (!isDraft) {
            const requiredFields = ['incident_date', 'offense_type', 'severity', 'description'];
            for (const field of requiredFields) {
                if (!req.body[field]) {
                    return res.status(400).json({ error: `Missing required field: ${field}` });
                }
            }
        }

        let caseType;
        if (isMultipleStudents) {
            caseType = 'group_student';
        } else if (isSingleStudent) {
            caseType = 'single_student';
        } else if (isMultipleStaff) {
            caseType = 'group_staff';
        } else if (isSingleStaff) {
            caseType = 'single_staff';
        }

        const caseData = {
            ...pickFields(req.body, CASE_WRITE_FIELDS),
            status: req.body.status || 'Open',
            sanctions: req.body.sanctions || '',
            attachments: req.body.attachments || [],
            created_by: (req.user && req.user.username) ? req.user.username : req.body.created_by,
            case_type: caseType
        };

        caseData.case_id = await getNextMongoCaseId();
        if (caseData.student_case_process?.occurrenceCover) {
            caseData.student_case_process.occurrenceCover.occurrenceBookNumber = caseData.case_id;
        }
        let caseItem = await CaseModel.create(caseData);

        const StudentModel = (await import('../models/student.js')).default;
        const StaffModel = (await import('../models/staff.js')).default;

        if (isMultipleStudents) {
            const students = await StudentModel.find({ studentId: { $in: caseItem.student_ids } });
            caseItem = caseItem.toObject();
            caseItem.students = students.map(s => s.toObject());
            caseItem.student = null;
        } else if (isSingleStudent) {
            const student = await StudentModel.findOne({ studentId: caseItem.student_id });
            caseItem = caseItem.toObject();
            caseItem.student = student ? student.toObject() : null;
            caseItem.students = caseItem.student ? [caseItem.student] : [];
        } else if (isMultipleStaff) {
            const staffMembers = await StaffModel.find({ staffId: { $in: caseItem.staff_ids } });
            caseItem = caseItem.toObject();
            caseItem.staffMembers = staffMembers.map(s => s.toObject());
            caseItem.staff = null;
        } else if (isSingleStaff) {
            const staff = await StaffModel.findOne({ staffId: caseItem.staff_id });
            caseItem = caseItem.toObject();
            caseItem.staff = staff ? staff.toObject() : null;
            caseItem.staffMembers = caseItem.staff ? [caseItem.staff] : [];
        }

        caseItem = normalizeCaseForFrontend(caseItem);

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
                    studentCount: isMultipleStudents ? req.body.student_ids.length : (isSingleStudent ? 1 : 0),
                    staffCount: isMultipleStaff ? req.body.staff_ids.length : (isSingleStaff ? 1 : 0)
                },
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        emitDashboardRefresh('cases');

        res.json(caseItem);
    } catch (err) {
        console.error('Error in createCase:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function updateCase(req, res) {
    try {
        const oldCase = await CaseModel.findById(req.params.id);
        const oldStatus = oldCase ? oldCase.status : undefined;

        const updatePayload = {
            ...pickFields(req.body, CASE_WRITE_FIELDS),
            updatedAt: new Date()
        };

        let caseItem = await CaseModel.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
        if (caseItem) {
            const StudentModel = (await import('../models/student.js')).default;
            const student = await StudentModel.findOne({ studentId: caseItem.student_id });
            caseItem = caseItem.toObject();
            caseItem.student = student ? student.toObject() : null;
            caseItem = normalizeCaseForFrontend(caseItem);
        }

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
        await CaseModel.findByIdAndDelete(req.params.id);
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
