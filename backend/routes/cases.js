import express from 'express';
import { listCases, getCase, createCase, updateCase, deleteCase } from '../controllers/casesController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType } from 'docx';
const router = express.Router();

router.use(authenticate, authorize(['admin', 'academic_office', 'security_officer']));

router.get('/', listCases);
router.get('/:id', getCase);
router.post('/', createCase);
router.put('/:id', updateCase);
router.delete('/:id', deleteCase);

// Excel export
router.get('/export-excel', async(req, res) => {
    try {
        const cases = await listCasesRaw();
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Cases');
        sheet.addRow(['ID', 'Student ID', 'Offense', 'Date', 'Description', 'Severity', 'Status', 'Sanctions']);
        cases.forEach(c => {
            sheet.addRow([
                c.id || c._id,
                c.student_id,
                c.offense_type,
                c.incident_date,
                c.description,
                c.severity,
                c.status,
                c.sanctions,
            ]);
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=cases.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// DOCX export
router.post('/export-docx', async(req, res) => {
    try {
        const cases = await listCasesRaw();

        // Get students for reference to include names
        const dbType = process.env.DB_TYPE || 'mongo';
        let allStudents = [];
        if (dbType === 'mongo') {
            const StudentModel = (await
                import ('../models/student.js')).default;
            allStudents = await StudentModel.find();
        } else {
            const db = (await
                import ('../models/db.js')).default;
            const [studentsRows] = await db.execute('SELECT * FROM students');
            allStudents = studentsRows;
        }

        // Create a more compact table with essential columns only
        const tableRows = [
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph('Student Name')],
                        width: { size: 25, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph('Student ID')],
                        width: { size: 15, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph('Offense')],
                        width: { size: 20, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph('Date')],
                        width: { size: 15, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph('Status')],
                        width: { size: 12, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph('Severity')],
                        width: { size: 13, type: WidthType.PERCENTAGE }
                    }),
                ],
            }),
            ...cases.map(c => {
                // Find student name
                let studentName = '';
                if (dbType === 'mongo') {
                    const student = allStudents.find(s => s.studentId === (c.student_id || c.studentId));
                    studentName = student ? student.fullName : '';
                } else {
                    const student = allStudents.find(s => s.studentId === (c.student_id || c.studentId));
                    studentName = student ? student.fullName : '';
                }

                return new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph(studentName || 'Unknown')],
                            width: { size: 25, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            children: [new Paragraph(String(c.student_id || c.studentId || ''))],
                            width: { size: 15, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            children: [new Paragraph(c.offense_type || c.offenseType || '')],
                            width: { size: 20, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            children: [new Paragraph(c.incident_date || c.incidentDate || '')],
                            width: { size: 15, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            children: [new Paragraph(c.status || '')],
                            width: { size: 12, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            children: [new Paragraph(c.severity || '')],
                            width: { size: 13, type: WidthType.PERCENTAGE }
                        }),
                    ],
                });
            }),
        ];

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: 'Disciplinary Cases Report', bold: true, size: 28 })],
                        spacing: { after: 300 },
                        alignment: AlignmentType.CENTER
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: `Generated on ${new Date().toLocaleDateString()}`, size: 20 })],
                        spacing: { after: 400 },
                        alignment: AlignmentType.CENTER
                    }),
                    new Table({
                        rows: tableRows,
                        width: { size: 100, type: WidthType.PERCENTAGE }
                    })
                ]
            }],
        });
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=cases.docx');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// DOCX export - List format (better for portrait paper)
router.post('/export-docx-list', async(req, res) => {
    try {
        const cases = await listCasesRaw();

        // Get students for reference to include names
        const dbType = process.env.DB_TYPE || 'mongo';
        let allStudents = [];
        if (dbType === 'mongo') {
            const StudentModel = (await
                import ('../models/student.js')).default;
            allStudents = await StudentModel.find();
        } else {
            const db = (await
                import ('../models/db.js')).default;
            const [studentsRows] = await db.execute('SELECT * FROM students');
            allStudents = studentsRows;
        }

        // Create list-based content instead of table
        const content = [
            new Paragraph({
                children: [new TextRun({ text: 'Disciplinary Cases Report', bold: true, size: 28 })],
                spacing: { after: 300 },
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                children: [new TextRun({ text: `Generated on ${new Date().toLocaleDateString()}`, size: 20 })],
                spacing: { after: 400 },
                alignment: AlignmentType.CENTER
            }),
        ];

        // Add each case as a formatted list item
        cases.forEach((c, index) => {
            // Find student name
            let studentName = '';
            if (dbType === 'mongo') {
                const student = allStudents.find(s => s.studentId === (c.student_id || c.studentId));
                studentName = student ? student.fullName : '';
            } else {
                const student = allStudents.find(s => s.studentId === (c.student_id || c.studentId));
                studentName = student ? student.fullName : '';
            }

            content.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${index + 1}. `,
                            bold: true,
                            size: 24
                        }),
                        new TextRun({
                            text: `${studentName || 'Unknown'} (${c.student_id || c.studentId || ''})`,
                            bold: true,
                            size: 24
                        })
                    ],
                    spacing: { before: 200, after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Offense: ${c.offense_type || c.offenseType || ''}`,
                            size: 22
                        })
                    ],
                    spacing: { before: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Date: ${c.incident_date || c.incidentDate || ''} | Status: ${c.status || ''} | Severity: ${c.severity || ''}`,
                            size: 20
                        })
                    ],
                    spacing: { before: 100, after: 200 }
                })
            );
        });

        const doc = new Document({
            sections: [{ children: content }],
        });
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=cases_list.docx');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// Helper to get all cases (raw, no pagination)
async function listCasesRaw() {
    const dbType = process.env.DB_TYPE || 'mongo';
    if (dbType === 'mongo') {
        const CaseModel = (await
            import ('../models/case.js')).default;
        return CaseModel.find();
    } else {
        const db = (await
            import ('../models/db.js')).default;
        const [rows] = await db.execute('SELECT * FROM cases');
        return rows;
    }
}

export default router;