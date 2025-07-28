import express from 'express';
import db from '../models/db.js';
import CaseModel from '../models/case.js';
import StudentModel from '../models/student.js';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
import { authenticate, authorize } from '../middleware/auth.js';
const dbType = process.env.DB_TYPE || 'mongo';
const router = express.Router();

router.use(authenticate, authorize(['admin', 'academic_office', 'security_officer']));

router.post('/docx', async(req, res) => {
    try {
        console.log('DOCX export requested');
        const { type, ids, entity, data, filters } = req.body;

        let allCases, allStudents;

        // Determine what data to export based on type
        if (type === 'selected' && ids && ids.length > 0) {
            // Export only selected items
            if (dbType === 'mongo') {
                allCases = await CaseModel.find({ _id: { $in: ids } });
            } else if (dbType === 'mysql') {
                const placeholders = ids.map(() => '?').join(',');
                const [casesRows] = await db.execute(`SELECT * FROM cases WHERE id IN (${placeholders})`, ids);
                allCases = casesRows;
            }
        } else if (type === 'current_page' && data) {
            // Export current page data (data is already provided)
            allCases = data;
        } else if (type === 'filtered' && filters) {
            // Export based on filters
            let query = {};
            if (filters.studentId) query.student_id = filters.studentId;
            if (filters.search) {
                query.$or = [
                    { offenseType: { $regex: filters.search, $options: 'i' } },
                    { description: { $regex: filters.search, $options: 'i' } }
                ];
            }
            if (filters.statusFilter) query.status = filters.statusFilter;
            if (filters.severityFilter) query.severity = filters.severityFilter;

            if (dbType === 'mongo') {
                allCases = await CaseModel.find(query);
            } else if (dbType === 'mysql') {
                let sql = 'SELECT * FROM cases WHERE 1=1';
                const params = [];
                if (filters.studentId) {
                    sql += ' AND student_id = ?';
                    params.push(filters.studentId);
                }
                if (filters.search) {
                    sql += ' AND (offense_type LIKE ? OR description LIKE ?)';
                    const searchTerm = `%${filters.search}%`;
                    params.push(searchTerm, searchTerm);
                }
                if (filters.statusFilter) {
                    sql += ' AND status = ?';
                    params.push(filters.statusFilter);
                }
                if (filters.severityFilter) {
                    sql += ' AND severity = ?';
                    params.push(filters.severityFilter);
                }
                const [casesRows] = await db.execute(sql, params);
                allCases = casesRows;
            }
        } else {
            // Default: export all
            if (dbType === 'mongo') {
                allCases = await CaseModel.find();
            } else if (dbType === 'mysql') {
                const [casesRows] = await db.execute('SELECT * FROM cases');
                allCases = casesRows;
            }
        }

        // Get students for reference
        if (dbType === 'mongo') {
            allStudents = await StudentModel.find();
        } else if (dbType === 'mysql') {
            const [studentsRows] = await db.execute('SELECT * FROM students');
            allStudents = studentsRows;
        }

        console.log(`Found ${allCases.length} cases and ${allStudents.length} students`);

        // Build DOCX table rows
        const tableRows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph('ID')] }),
                    new TableCell({ children: [new Paragraph('Student ID')] }),
                    new TableCell({ children: [new Paragraph('Student Name')] }),
                    new TableCell({ children: [new Paragraph('Offense')] }),
                    new TableCell({ children: [new Paragraph('Date')] }),
                    new TableCell({ children: [new Paragraph('Description')] }),
                    new TableCell({ children: [new Paragraph('Severity')] }),
                    new TableCell({ children: [new Paragraph('Status')] }),
                    new TableCell({ children: [new Paragraph('Sanctions')] }),
                ],
            }),
            ...allCases.map(c => {
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
                        new TableCell({ children: [new Paragraph(String(c.id || c._id || ''))] }),
                        new TableCell({ children: [new Paragraph(String(c.student_id || c.studentId || ''))] }),
                        new TableCell({ children: [new Paragraph(studentName)] }),
                        new TableCell({ children: [new Paragraph(c.offense_type || c.offenseType || '')] }),
                        new TableCell({ children: [new Paragraph(c.incident_date || c.incidentDate || '')] }),
                        new TableCell({ children: [new Paragraph(c.description || '')] }),
                        new TableCell({ children: [new Paragraph(c.severity || '')] }),
                        new TableCell({ children: [new Paragraph(c.status || '')] }),
                        new TableCell({ children: [new Paragraph(c.sanctions || '')] }),
                    ],
                });
            }),
        ];

        console.log(`Created ${tableRows.length} table rows`);

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: 'Disciplinary Cases Report', bold: true, size: 32 })],
                        spacing: { after: 300 },
                    }),
                    new Table({ rows: tableRows })
                ]
            }],
        });

        console.log('Document created, generating buffer...');
        const buffer = await Packer.toBuffer(doc);
        console.log(`Buffer generated, size: ${buffer.length} bytes`);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics.docx');
        res.send(buffer);
        console.log('DOCX export completed successfully');
    } catch (err) {
        console.error('DOCX export error:', err);
        res.status(500).json({ error: 'Export failed: ' + err.message });
    }
});

router.post('/export-excel', async(req, res) => {
    try {
        const { type, ids, entity, data, filters } = req.body;

        let allCases, allStudents;

        // Determine what data to export based on type
        if (type === 'selected' && ids && ids.length > 0) {
            // Export only selected items
            if (dbType === 'mongo') {
                allCases = await CaseModel.find({ _id: { $in: ids } });
            } else if (dbType === 'mysql') {
                const placeholders = ids.map(() => '?').join(',');
                const [casesRows] = await db.execute(`SELECT * FROM cases WHERE id IN (${placeholders})`, ids);
                allCases = casesRows;
            }
        } else if (type === 'current_page' && data) {
            // Export current page data (data is already provided)
            allCases = data;
        } else if (type === 'filtered' && filters) {
            // Export based on filters
            let query = {};
            if (filters.studentId) query.student_id = filters.studentId;
            if (filters.search) {
                query.$or = [
                    { offenseType: { $regex: filters.search, $options: 'i' } },
                    { description: { $regex: filters.search, $options: 'i' } }
                ];
            }
            if (filters.statusFilter) query.status = filters.statusFilter;
            if (filters.severityFilter) query.severity = filters.severityFilter;

            if (dbType === 'mongo') {
                allCases = await CaseModel.find(query);
            } else if (dbType === 'mysql') {
                let sql = 'SELECT * FROM cases WHERE 1=1';
                const params = [];
                if (filters.studentId) {
                    sql += ' AND student_id = ?';
                    params.push(filters.studentId);
                }
                if (filters.search) {
                    sql += ' AND (offense_type LIKE ? OR description LIKE ?)';
                    const searchTerm = `%${filters.search}%`;
                    params.push(searchTerm, searchTerm);
                }
                if (filters.statusFilter) {
                    sql += ' AND status = ?';
                    params.push(filters.statusFilter);
                }
                if (filters.severityFilter) {
                    sql += ' AND severity = ?';
                    params.push(filters.severityFilter);
                }
                const [casesRows] = await db.execute(sql, params);
                allCases = casesRows;
            }
        } else {
            // Default: export all
            if (dbType === 'mongo') {
                allCases = await CaseModel.find();
            } else if (dbType === 'mysql') {
                const [casesRows] = await db.execute('SELECT * FROM cases');
                allCases = casesRows;
            }
        }

        // Get students for reference
        if (dbType === 'mongo') {
            allStudents = await StudentModel.find();
        } else if (dbType === 'mysql') {
            const [studentsRows] = await db.execute('SELECT * FROM students');
            allStudents = studentsRows;
        }

        // Create Excel workbook with cases data
        const workbook = new ExcelJS.Workbook();
        const casesSheet = workbook.addWorksheet('Cases');

        // Add headers
        casesSheet.addRow(['ID', 'Student ID', 'Student Name', 'Offense', 'Date', 'Description', 'Severity', 'Status', 'Sanctions']);

        // Add case data
        allCases.forEach(c => {
            // Find student name
            let studentName = '';
            if (dbType === 'mongo') {
                const student = allStudents.find(s => s.studentId === (c.student_id || c.studentId));
                studentName = student ? student.fullName : '';
            } else {
                const student = allStudents.find(s => s.studentId === (c.student_id || c.studentId));
                studentName = student ? student.fullName : '';
            }

            casesSheet.addRow([
                c.id || c._id || '',
                c.student_id || c.studentId || '',
                studentName,
                c.offense_type || c.offenseType || '',
                c.incident_date || c.incidentDate || '',
                c.description || '',
                c.severity || '',
                c.status || '',
                c.sanctions || ''
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

// Keep original GET endpoint for backward compatibility
router.get('/export-excel', async(req, res) => {
    try {
        let allCases, allStudents;
        if (dbType === 'mongo') {
            allCases = await CaseModel.find();
            allStudents = await StudentModel.find();
        } else if (dbType === 'mysql') {
            const [casesRows] = await db.execute('SELECT * FROM cases');
            allCases = casesRows;
            const [studentsRows] = await db.execute('SELECT * FROM students');
            allStudents = studentsRows;
        }
        // Offense Trends
        const offenseTrends = {};
        allCases.forEach(c => {
            const offense = c.offense_type || '';
            if (offense) offenseTrends[offense] = (offenseTrends[offense] || 0) + 1;
        });
        // Department Stats
        const studentDept = {};
        allStudents.forEach(s => {
            const sid = s.studentId || s.id || s._id;
            const dept = s.department || '';
            if (sid && dept) studentDept[sid] = dept;
        });
        const departmentStats = {};
        allCases.forEach(c => {
            const sid = c.student_id || c.studentId;
            const dept = sid && studentDept[sid] ? studentDept[sid] : '';
            if (dept) departmentStats[dept] = (departmentStats[dept] || 0) + 1;
        });
        // Excel
        const workbook = new ExcelJS.Workbook();
        const offenseSheet = workbook.addWorksheet('Offense Trends');
        offenseSheet.addRow(['Offense', 'Count']);
        Object.entries(offenseTrends).forEach(([offense, count]) => {
            offenseSheet.addRow([offense, count]);
        });
        const deptSheet = workbook.addWorksheet('Department Stats');
        deptSheet.addRow(['Department', 'Count']);
        Object.entries(departmentStats).forEach(([dept, count]) => {
            deptSheet.addRow([dept, count]);
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: 'Export failed' });
    }
});

router.get('/analytics', async(req, res) => {
    try {
        let allCases, allStudents;
        if (dbType === 'mongo') {
            allCases = await CaseModel.find();
            allStudents = await StudentModel.find();
        } else if (dbType === 'mysql') {
            const [casesRows] = await db.execute('SELECT * FROM cases');
            allCases = casesRows;
            const [studentsRows] = await db.execute('SELECT * FROM students');
            allStudents = studentsRows;
        }
        // Offense Trends
        const offenseTrendsMap = {};
        allCases.forEach(c => {
            const offense = c.offense_type || c.offenseType || '';
            if (offense) offenseTrendsMap[offense] = (offenseTrendsMap[offense] || 0) + 1;
        });
        const offenseTrends = Object.entries(offenseTrendsMap).map(([k, v]) => ({ _id: k, count: v }));
        // Department Stats
        const studentDept = {};
        allStudents.forEach(s => {
            const sid = s.studentId || s.id || s._id;
            const dept = s.department || '';
            if (sid && dept) studentDept[sid] = dept;
        });
        const departmentStatsMap = {};
        allCases.forEach(c => {
            const sid = c.student_id || c.studentId;
            const dept = sid && studentDept[sid] ? studentDept[sid] : '';
            if (dept) departmentStatsMap[dept] = (departmentStatsMap[dept] || 0) + 1;
        });
        const departmentStats = Object.entries(departmentStatsMap).map(([k, v]) => ({ _id: k, count: v }));
        res.json({ offenseTrends, departmentStats });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load analytics' });
    }
});

export default router;