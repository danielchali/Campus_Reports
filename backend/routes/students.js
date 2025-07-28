import express from 'express';
import { listStudents, getStudent, createStudent, updateStudent, deleteStudent, importStudents, searchStudents, getRecentStudents, updateLastSelected } from '../controllers/studentsController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
const router = express.Router();

router.use(authenticate, authorize(['admin', 'academic_office', 'security_officer']));

router.get('/', listStudents);
router.get('/search', searchStudents);
router.get('/recent', getRecentStudents);
router.get('/:id', getStudent);
router.patch('/:id/update-last-selected', updateLastSelected);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', authorize(['admin', 'academic_office']), deleteStudent);
router.post('/import', importStudents);

// Excel export
router.get('/export-excel', async(req, res) => {
    try {
        const students = await listStudentsRaw();
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Students');
        sheet.addRow(['ID', 'Student ID', 'Full Name', 'Department', 'Year', 'Gender', 'Case ID', 'Offense', 'Date', 'Status']);
        for (const s of students) {
            const cases = await getStudentCases(s.studentId || s.id || s._id);
            if (cases.length === 0) {
                sheet.addRow([s.id || s._id, s.studentId, s.fullName, s.department, s.year, s.gender, '', '', '', '']);
            } else {
                for (const c of cases) {
                    sheet.addRow([
                        s.id || s._id,
                        s.studentId,
                        s.fullName,
                        s.department,
                        s.year,
                        s.gender,
                        c.id || c._id,
                        c.offense_type,
                        c.incident_date,
                        c.status,
                    ]);
                }
            }
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// DOCX export
router.post('/export-docx', async(req, res) => {
    try {
        const students = await listStudentsRaw();
        const docSections = [];
        for (const s of students) {
            const cases = await getStudentCases(s.studentId || s.id || s._id);
            const caseSummaries = cases.map(c => `- [${c.incident_date}] ${c.offense_type}: ${c.description}`);
            docSections.push(
                new Paragraph({ text: `${s.fullName} (${s.studentId})`, heading: 'Heading1' }),
                new Paragraph(`Department: ${s.department}, Year: ${s.year}, Gender: ${s.gender}`),
                ...caseSummaries.length ? [new Paragraph('Case History:'), ...caseSummaries.map(summary => new Paragraph(summary))] : [new Paragraph('No case history.')],
                new Paragraph('')
            );
        }
        const doc = new Document({ sections: [{ children: docSections }] });
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=students.docx');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// Helpers
async function listStudentsRaw() {
    const dbType = process.env.DB_TYPE || 'mongo';
    if (dbType === 'mongo') {
        const StudentModel = (await
            import ('../models/student.js')).default;
        return StudentModel.find();
    } else {
        const db = (await
            import ('../models/db.js')).default;
        const [rows] = await db.execute('SELECT * FROM students');
        return rows;
    }
}
async function getStudentCases(studentId) {
    const dbType = process.env.DB_TYPE || 'mongo';
    if (dbType === 'mongo') {
        const CaseModel = (await
            import ('../models/case.js')).default;
        return CaseModel.find({ student_id: studentId });
    } else {
        const db = (await
            import ('../models/db.js')).default;
        const [rows] = await db.execute('SELECT * FROM cases WHERE student_id = ?', [studentId]);
        return rows;
    }
}

export default router;