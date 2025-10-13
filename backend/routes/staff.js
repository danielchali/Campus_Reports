import express from 'express';
import { listStaff, getStaff, createStaff, updateStaff, deleteStaff, searchStaff, getRecentStaff, updateLastSelected } from '../controllers/staffController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
const router = express.Router();

router.use(authenticate, authorize(['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary']));

router.get('/', listStaff);
router.get('/search', searchStaff);
router.get('/recent', getRecentStaff);
router.get('/:id', getStaff);
router.patch('/:id/update-last-selected', updateLastSelected);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', authorize(['admin']), deleteStaff);

// Excel export
router.get('/export-excel', async(req, res) => {
    try {
        const staff = await listStaffRaw();
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Staff');
        sheet.addRow(['ID', 'Staff ID', 'Full Name', 'Department', 'Position', 'Email', 'Phone', 'Hire Date', 'Case ID', 'Offense', 'Date', 'Status']);
        for (const s of staff) {
            const cases = await getStaffCases(s.staffId || s.id || s._id);
            if (cases.length === 0) {
                sheet.addRow([s.id || s._id, s.staffId, s.fullName, s.department, s.position, s.email, s.phone, s.hireDate, '', '', '', '']);
            } else {
                for (const c of cases) {
                    sheet.addRow([
                        s.id || s._id,
                        s.staffId,
                        s.fullName,
                        s.department,
                        s.position,
                        s.email,
                        s.phone,
                        s.hireDate,
                        c.id || c._id,
                        c.offense_type,
                        c.incident_date,
                        c.status,
                    ]);
                }
            }
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=staff.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// DOCX export
router.post('/export-docx', async(req, res) => {
    try {
        const staff = await listStaffRaw();
        const docSections = [];
        for (const s of staff) {
            const cases = await getStaffCases(s.staffId || s.id || s._id);
            const caseSummaries = cases.map(c => `- [${c.incident_date}] ${c.offense_type}: ${c.description}`);
            docSections.push(
                new Paragraph({ text: `${s.fullName} (${s.staffId})`, heading: 'Heading1' }),
                new Paragraph(`Department: ${s.department}, Position: ${s.position}, Email: ${s.email}, Phone: ${s.phone}`),
                ...caseSummaries.length ? [new Paragraph('Case History:'), ...caseSummaries.map(summary => new Paragraph(summary))] : [new Paragraph('No case history.')],
                new Paragraph('')
            );
        }
        const doc = new Document({ sections: [{ children: docSections }] });
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=staff.docx');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// Helpers
async function listStaffRaw() {
    const dbType = process.env.DB_TYPE || 'mongo';
    if (dbType === 'mongo') {
        const StaffModel = (await import('../models/staff.js')).default;
        return StaffModel.find();
    } else {
        const db = (await import('../models/db.js')).default;
        const [rows] = await db.execute('SELECT * FROM staff');
        return rows;
    }
}

async function getStaffCases(staffId) {
    const dbType = process.env.DB_TYPE || 'mongo';
    if (dbType === 'mongo') {
        const CaseModel = (await import('../models/case.js')).default;
        return CaseModel.find({ 
            $or: [
                { staff_id: staffId },
                { staff_ids: staffId }
            ]
        });
    } else {
        const db = (await import('../models/db.js')).default;
        const [rows] = await db.execute('SELECT * FROM cases WHERE staff_id = ?', [staffId]);
        return rows;
    }
}

export default router;