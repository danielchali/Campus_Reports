import express from 'express';
import { listUsers, getUser, createUser, updateUser, deleteUser, updateOwnProfile, changeOwnPassword, getOwnProfile } from '../controllers/usersController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
const router = express.Router();

// Authenticated user routes (must be BEFORE admin routes to prevent /:id from matching /me)
router.use(authenticate);
router.get('/me', (req, res, next) => {
    console.log('Route /api/users/me hit', req.user);
    console.log('User ID from token:', req.user && req.user.id);
    console.log('User ID type:', typeof(req.user && req.user.id));
    next();
}, getOwnProfile);
router.put('/me', updateOwnProfile);
router.put('/me/password', changeOwnPassword);

// Admin-only routes (must be after user self routes)
router.use(authorize(['admin']));

router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

// Excel export
router.get('/export-excel', async(req, res) => {
    try {
        const users = await listUsersRaw();
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Users');
        sheet.addRow(['ID', 'Username', 'Name', 'Role']);
        users.forEach(u => {
            sheet.addRow([u.id || u._id, u.username, u.name, u.role]);
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// DOCX export
router.post('/export-docx', async(req, res) => {
    try {
        const users = await listUsersRaw();
        const tableRows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph('ID')] }),
                    new TableCell({ children: [new Paragraph('Username')] }),
                    new TableCell({ children: [new Paragraph('Name')] }),
                    new TableCell({ children: [new Paragraph('Role')] }),
                ],
            }),
            ...users.map(u => new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(String(u.id || u._id))] }),
                    new TableCell({ children: [new Paragraph(u.username)] }),
                    new TableCell({ children: [new Paragraph(u.name)] }),
                    new TableCell({ children: [new Paragraph(u.role)] }),
                ],
            })),
        ];
        const doc = new Document({
            sections: [{ children: [new Paragraph('Users'), new Table({ rows: tableRows })] }],
        });
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=users.docx');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// Helper to get all users (raw, no pagination)
async function listUsersRaw() {
    const dbType = process.env.DB_TYPE || 'mongo';
    if (dbType === 'mongo') {
        const UserModel = (await
            import ('../models/user.js')).default;
        return UserModel.find({}, '-password');
    } else {
        const db = (await
            import ('../models/db.js')).default;
        const [rows] = await db.execute('SELECT id, username, name, role FROM users');
        return rows;
    }
}

export default [router];