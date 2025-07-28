import express from 'express';
import { listCases, getCase, createCase, updateCase, deleteCase } from '../controllers/casesController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
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
        const tableRows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph('ID')] }),
                    new TableCell({ children: [new Paragraph('Student ID')] }),
                    new TableCell({ children: [new Paragraph('Offense')] }),
                    new TableCell({ children: [new Paragraph('Date')] }),
                    new TableCell({ children: [new Paragraph('Description')] }),
                    new TableCell({ children: [new Paragraph('Severity')] }),
                    new TableCell({ children: [new Paragraph('Status')] }),
                    new TableCell({ children: [new Paragraph('Sanctions')] }),
                ],
            }),
            ...cases.map(c => new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(String(c.id || c._id))] }),
                    new TableCell({ children: [new Paragraph(String(c.student_id))] }),
                    new TableCell({ children: [new Paragraph(c.offense_type)] }),
                    new TableCell({ children: [new Paragraph(c.incident_date)] }),
                    new TableCell({ children: [new Paragraph(c.description)] }),
                    new TableCell({ children: [new Paragraph(c.severity)] }),
                    new TableCell({ children: [new Paragraph(c.status)] }),
                    new TableCell({ children: [new Paragraph(c.sanctions)] }),
                ],
            })),
        ];
        const doc = new Document({
            sections: [{ children: [new Paragraph('Cases'), new Table({ rows: tableRows })] }],
        });
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=cases.docx');
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