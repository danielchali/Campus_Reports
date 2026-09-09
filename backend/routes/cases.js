import express from 'express';
import { listCases, getCase, createCase, updateCase, deleteCase } from '../controllers/casesController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, PageBreak } from 'docx';
import { kmuLogoParagraph, signatureParagraphs } from '../utils/docxExport.js';
import { buildCalloutsFromCase, createCalloutDocBuffer } from '../utils/calloutDocx.js';
const router = express.Router();

router.use(authenticate, authorize(['admin', 'security_officer', 'dean_of_students', 'assistant_dean']));

router.get('/', listCases);
router.post('/', createCase);
router.put('/:id', updateCase);
router.delete('/:id', deleteCase);

router.post('/export-callout-docx', async(req, res) => {
    try {
        const { callouts } = req.body;
        if (!Array.isArray(callouts) || callouts.length === 0) {
            return res.status(400).json({ error: 'callouts array is required' });
        }

        const buffer = await createCalloutDocBuffer(callouts);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=callouts.docx');
        res.send(buffer);
    } catch (err) {
        console.error('Callout DOCX export error:', err);
        res.status(500).json({ error: 'Export failed' });
    }
});

router.get('/:id/export-callout-docx', async(req, res) => {
    try {
        const CaseModel = (await import('../models/case.js')).default;
        const caseItem = await CaseModel.findById(req.params.id).lean();
        if (!caseItem) return res.status(404).json({ error: 'Case not found' });

        const callouts = buildCalloutsFromCase(caseItem);
        if (!callouts.length) {
            return res.status(400).json({ error: 'No callout data found for this case' });
        }

        const buffer = await createCalloutDocBuffer(callouts);
        const filename = `callout_${caseItem.case_id || caseItem._id}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(buffer);
    } catch (err) {
        console.error('Case callout DOCX export error:', err);
        res.status(500).json({ error: 'Export failed' });
    }
});

router.get('/:id/export-docx-full', async(req, res) => {
    try {
        const CaseModel = (await import('../models/case.js')).default;
        const caseItem = await CaseModel.findById(req.params.id).lean();
        if (!caseItem) return res.status(404).json({ error: 'Case not found' });

        const logo = kmuLogoParagraph();
        const sectionTitle = (title) => ([logo, new Paragraph({ text: title, heading: 'Heading1', alignment: AlignmentType.CENTER, spacing: { after: 220 } })]);
        const kv = (k, v) => new Paragraph({ children: [new TextRun({ text: `${k}: `, bold: true }), new TextRun(String(v || 'N/A'))] });

        const occ = caseItem.student_case_process?.occurrenceCover || {};
        const summon = caseItem.student_case_process?.summon || {};
        const statement = caseItem.student_case_process?.statementPad || {};
        const warn = caseItem.student_case_process?.warnAndCaution || {};

        const children = [
            ...sectionTitle('Case Overview'),
            kv('Case ID', caseItem.case_id), kv('Offense', caseItem.offense_type), kv('Incident Date', caseItem.incident_date), kv('Severity', caseItem.severity), kv('Status', caseItem.status), kv('Description', caseItem.description),
            new Paragraph({ children: [new PageBreak()] }),
            ...sectionTitle('Occurrence Cover'), kv('Investigating Officer', occ.investigatingOfficer), kv('Reported At', occ.reportedAt), kv('Complainant', occ.complainant?.name),
            new Paragraph({ children: [new PageBreak()] }),
            ...sectionTitle('Summon / Callout'), kv('Report Time', summon.reportTime), kv('Report Date', summon.reportDate), kv('Appointment', summon.appointment),
            ...((occ.accusedPeople || []).map((a, i) => kv(`Accused ${i+1}`, a.fullName || a.name))),
            ...signatureParagraphs('Officer Signature', summon.officerSignature),
            ...((occ.accusedPeople || []).flatMap((a, i) => signatureParagraphs(
                `Student Signature (${a.fullName || a.name || `Accused ${i + 1}`})`,
                summon.studentSignatures?.[String(i)] || summon.studentSignatures?.[i],
            ))),
            new Paragraph({ children: [new PageBreak()] }),
            ...sectionTitle('Statement'), kv('Role', statement.statementRole), kv('Full Name', statement.fullName), kv('Statement', statement.statementText),
            ...signatureParagraphs('Signature', statement.signature),
            new Paragraph({ children: [new PageBreak()] }),
            ...sectionTitle('Warn and Caution'), kv('Full Names', warn.fullNames), kv('Case Name', warn.caseName), kv('Taken Date', warn.takenDate), kv('Taken Time', warn.takenTime),
            ...signatureParagraphs('Signature', warn.signature),
        ];

        const doc = new Document({ sections: [{ children }] });
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=case_${caseItem.case_id || caseItem._id}.docx`);
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Export failed' });
    }
});


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

        const StudentModel = (await import('../models/student.js')).default;
        const allStudents = await StudentModel.find();

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
                const student = allStudents.find(s => s.studentId === (c.student_id || c.studentId));
                const studentName = student ? student.fullName : '';

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

        const StudentModel = (await import('../models/student.js')).default;
        const allStudents = await StudentModel.find();

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
            const student = allStudents.find(s => s.studentId === (c.student_id || c.studentId));
            const studentName = student ? student.fullName : '';

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

router.get('/:id', getCase);

// Helper to get all cases (raw, no pagination)
async function listCasesRaw() {
    const CaseModel = (await import('../models/case.js')).default;
    return CaseModel.find();
}

export default router;
