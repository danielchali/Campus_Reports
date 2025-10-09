import express from 'express';
import db from '../models/db.js';
import CaseModel from '../models/case.js';
import StudentModel from '../models/student.js';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, ImageRun } from 'docx';
import { authenticate, authorize } from '../middleware/auth.js';
const dbType = process.env.DB_TYPE || 'mongo';
const router = express.Router();

router.use(authenticate, authorize(['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'security_officer']));

router.post('/docx', async(req, res) => {
    try {
        console.log('DOCX export requested');
        const { type, ids, entity, data, filters, studentId } = req.body;

        let allCases, allStudents;

        // Determine what data to export based on type
        if (studentId) {
            // Export cases for specific student
            if (dbType === 'mongo') {
                allCases = await CaseModel.find({ student_id: studentId });
            } else if (dbType === 'mysql') {
                const [casesRows] = await db.execute('SELECT * FROM cases WHERE student_id = ?', [studentId]);
                allCases = casesRows;
            }
        } else if (type === 'selected' && ids && ids.length > 0) {
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

        console.log(`Created ${tableRows.length} table rows`);

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

// Export students list as DOCX
router.post('/students-docx', async(req, res) => {
    try {
        console.log('Students DOCX export requested');
        const { filters } = req.body;

        let allStudents;

        // Get students based on filters
        if (filters && Object.keys(filters).length > 0) {
            let query = {};
            if (filters.department) query.department = { $regex: filters.department, $options: 'i' };
            if (filters.year) query.year = filters.year;
            if (filters.gender) query.gender = filters.gender;
            if (filters.search) {
                query.$or = [
                    { fullName: { $regex: filters.search, $options: 'i' } },
                    { studentId: { $regex: filters.search, $options: 'i' } }
                ];
            }

            if (dbType === 'mongo') {
                allStudents = await StudentModel.find(query);
            } else if (dbType === 'mysql') {
                let sql = 'SELECT * FROM students WHERE 1=1';
                const params = [];
                if (filters.department) {
                    sql += ' AND department LIKE ?';
                    params.push(`%${filters.department}%`);
                }
                if (filters.year) {
                    sql += ' AND year = ?';
                    params.push(filters.year);
                }
                if (filters.gender) {
                    sql += ' AND gender = ?';
                    params.push(filters.gender);
                }
                if (filters.search) {
                    sql += ' AND (fullName LIKE ? OR studentId LIKE ?)';
                    const searchTerm = `%${filters.search}%`;
                    params.push(searchTerm, searchTerm);
                }
                const [studentsRows] = await db.execute(sql, params);
                allStudents = studentsRows;
            }
        } else {
            // Export all students
            if (dbType === 'mongo') {
                allStudents = await StudentModel.find();
            } else if (dbType === 'mysql') {
                const [studentsRows] = await db.execute('SELECT * FROM students');
                allStudents = studentsRows;
            }
        }

        // Build DOCX table rows for students
        const tableRows = [
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph('Student ID')],
                        width: { size: 20, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph('Full Name')],
                        width: { size: 30, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph('Department')],
                        width: { size: 25, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph('Year')],
                        width: { size: 12, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph('Gender')],
                        width: { size: 13, type: WidthType.PERCENTAGE }
                    }),
                ],
            }),
            ...allStudents.map(s => {
                return new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph(String(s.studentId || ''))],
                            width: { size: 20, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            children: [new Paragraph(s.fullName || '')],
                            width: { size: 30, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            children: [new Paragraph(s.department || '')],
                            width: { size: 25, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            children: [new Paragraph(s.year || '')],
                            width: { size: 12, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            children: [new Paragraph(s.gender || '')],
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
                        children: [new TextRun({ text: 'Students List Report', bold: true, size: 28 })],
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
        res.setHeader('Content-Disposition', 'attachment; filename=students_list.docx');
        res.send(buffer);
        console.log('Students DOCX export completed successfully');
    } catch (err) {
        console.error('Students DOCX export error:', err);
        res.status(500).json({ error: 'Export failed: ' + err.message });
    }
});

// Export cases list as DOCX
router.post('/cases-docx', async(req, res) => {
    try {
        console.log('Cases DOCX export requested');
        const { filters } = req.body;

        let allCases, allStudents;

        // Get cases based on filters
        if (filters && Object.keys(filters).length > 0) {
            let query = {};
            if (filters.studentId) query.student_id = filters.studentId;
            if (filters.status) query.status = filters.status;
            if (filters.severity) query.severity = filters.severity;
            if (filters.search) {
                query.$or = [
                    { offense_type: { $regex: filters.search, $options: 'i' } },
                    { description: { $regex: filters.search, $options: 'i' } }
                ];
            }

            if (dbType === 'mongo') {
                allCases = await CaseModel.find(query);
            } else if (dbType === 'mysql') {
                let sql = 'SELECT * FROM cases WHERE 1=1';
                const params = [];
                if (filters.studentId) {
                    sql += ' AND student_id = ?';
                    params.push(filters.studentId);
                }
                if (filters.status) {
                    sql += ' AND status = ?';
                    params.push(filters.status);
                }
                if (filters.severity) {
                    sql += ' AND severity = ?';
                    params.push(filters.severity);
                }
                if (filters.search) {
                    sql += ' AND (offense_type LIKE ? OR description LIKE ?)';
                    const searchTerm = `%${filters.search}%`;
                    params.push(searchTerm, searchTerm);
                }
                const [casesRows] = await db.execute(sql, params);
                allCases = casesRows;
            }
        } else {
            // Export all cases
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

        // Build DOCX table rows for cases
        const tableRows = [
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph('Case ID')],
                        width: { size: 15, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph('Student Name')],
                        width: { size: 20, type: WidthType.PERCENTAGE }
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
                        width: { size: 12, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph('Status')],
                        width: { size: 10, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [new Paragraph('Severity')],
                        width: { size: 8, type: WidthType.PERCENTAGE }
                    }),
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
                        new TableCell({
                            children: [new Paragraph(String(c._id || c.id || ''))],
                            width: { size: 15, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            children: [new Paragraph(studentName || 'Unknown')],
                            width: { size: 20, type: WidthType.PERCENTAGE }
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
                            width: { size: 12, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            children: [new Paragraph(c.status || '')],
                            width: { size: 10, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({
                            children: [new Paragraph(c.severity || '')],
                            width: { size: 8, type: WidthType.PERCENTAGE }
                        }),
                    ],
                });
            }),
        ];

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: 'Cases List Report', bold: true, size: 28 })],
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
        res.setHeader('Content-Disposition', 'attachment; filename=cases_list.docx');
        res.send(buffer);
        console.log('Cases DOCX export completed successfully');
    } catch (err) {
        console.error('Cases DOCX export error:', err);
        res.status(500).json({ error: 'Export failed: ' + err.message });
    }
});

router.post('/export-excel', async(req, res) => {
    try {
        const { type, ids, entity, data, filters, studentId } = req.body;

        let allCases, allStudents;

        // Determine what data to export based on type
        if (studentId) {
            // Export cases for specific student
            if (dbType === 'mongo') {
                allCases = await CaseModel.find({ student_id: studentId });
            } else if (dbType === 'mysql') {
                const [casesRows] = await db.execute('SELECT * FROM cases WHERE student_id = ?', [studentId]);
                allCases = casesRows;
            }
        } else if (type === 'selected' && ids && ids.length > 0) {
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

// Export with charts
router.post('/with-charts', async(req, res) => {
    try {
        console.log('DOCX export with charts requested');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        const { charts, pageInfo, data, filters, studentId } = req.body;

        // Validate required data
        if (!charts || !Array.isArray(charts)) {
            console.error('Invalid charts data:', charts);
            return res.status(400).json({ error: 'Invalid charts data provided' });
        }

        console.log(`Processing ${charts.length} charts`);

        // Validate each chart has required properties
        for (let i = 0; i < charts.length; i++) {
            const chart = charts[i];
            if (!chart.title || !chart.imageData) {
                console.error(`Chart ${i} missing required properties:`, chart);
                return res.status(400).json({ error: `Chart ${i} missing required properties` });
            }
        }

        let allCases, allStudents;

        // Get data based on parameters
        if (studentId) {
            // Export cases for specific student
            if (dbType === 'mongo') {
                allCases = await CaseModel.find({ student_id: studentId });
            } else if (dbType === 'mysql') {
                const [casesRows] = await db.execute('SELECT * FROM cases WHERE student_id = ?', [studentId]);
                allCases = casesRows;
            }
        } else if (filters && Object.keys(filters).length > 0) {
            // Export based on filters
            let query = {};
            if (filters.studentId) query.student_id = filters.studentId;
            if (filters.status) query.status = filters.status;
            if (filters.severity) query.severity = filters.severity;
            if (filters.search) {
                query.$or = [
                    { offense_type: { $regex: filters.search, $options: 'i' } },
                    { description: { $regex: filters.search, $options: 'i' } }
                ];
            }

            if (dbType === 'mongo') {
                allCases = await CaseModel.find(query);
            } else if (dbType === 'mysql') {
                let sql = 'SELECT * FROM cases WHERE 1=1';
                const params = [];
                if (filters.studentId) {
                    sql += ' AND student_id = ?';
                    params.push(filters.studentId);
                }
                if (filters.status) {
                    sql += ' AND status = ?';
                    params.push(filters.status);
                }
                if (filters.severity) {
                    sql += ' AND severity = ?';
                    params.push(filters.severity);
                }
                if (filters.search) {
                    sql += ' AND (offense_type LIKE ? OR description LIKE ?)';
                    const searchTerm = `%${filters.search}%`;
                    params.push(searchTerm, searchTerm);
                }
                const [casesRows] = await db.execute(sql, params);
                allCases = casesRows;
            }
        } else {
            // Export all cases
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

        // Build document sections
        const sections = [];

        // Title section
        sections.push(
            new Paragraph({
                children: [new TextRun({ text: (pageInfo && pageInfo.title) ? pageInfo.title : 'KMU Discipline Desk Report', bold: true, size: 32 })],
                spacing: { after: 400 },
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                children: [new TextRun({ text: `Generated on ${new Date().toLocaleDateString()}`, size: 20 })],
                spacing: { after: 600 },
                alignment: AlignmentType.CENTER
            })
        );

        // Add charts if provided
        if (charts && charts.length > 0) {
            sections.push(
                new Paragraph({
                    children: [new TextRun({ text: 'Analytics & Charts', bold: true, size: 24 })],
                    spacing: { before: 400, after: 300 },
                    alignment: AlignmentType.CENTER
                })
            );

            for (const chart of charts) {
                try {
                    // Convert base64 to buffer
                    const base64Data = chart.imageData.replace(/^data:image\/png;base64,/, '');
                    const imageBuffer = Buffer.from(base64Data, 'base64');

                    sections.push(
                        new Paragraph({
                            children: [new TextRun({ text: chart.title, bold: true, size: 18 })],
                            spacing: { before: 300, after: 200 }
                        }),
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: imageBuffer,
                                    transformation: {
                                        width: 500,
                                        height: 300
                                    }
                                })
                            ],
                            spacing: { after: 300 }
                        })
                    );

                    if (chart.description) {
                        sections.push(
                            new Paragraph({
                                children: [new TextRun({ text: chart.description, size: 14 })],
                                spacing: { after: 200 }
                            })
                        );
                    }
                } catch (error) {
                    console.error('Error processing chart:', error);
                    sections.push(
                        new Paragraph({
                            children: [new TextRun({ text: `Error loading chart: ${chart.title}`, color: 'FF0000' })],
                            spacing: { after: 200 }
                        })
                    );
                }
            }
        }

        // Add data table if cases exist
        if (allCases && allCases.length > 0) {
            sections.push(
                new Paragraph({
                    children: [new TextRun({ text: 'Case Data', bold: true, size: 24 })],
                    spacing: { before: 400, after: 300 },
                    alignment: AlignmentType.CENTER
                })
            );

            // Build table rows
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

            sections.push(
                new Table({
                    rows: tableRows,
                    width: { size: 100, type: WidthType.PERCENTAGE }
                })
            );
        }

        const doc = new Document({
            sections: [{
                children: sections
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=report_with_charts.docx');
        res.send(buffer);
        console.log('DOCX export with charts completed successfully');
    } catch (err) {
        console.error('DOCX export with charts error:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ error: 'Export failed: ' + err.message, details: err.stack });
    }
});

// Export all cases in document format with charts (dashboard export)
router.post('/dashboard-cases', async(req, res) => {
    try {
        console.log('Dashboard cases DOCX export requested');
        const { charts, pageInfo } = req.body;

        let allCases, allStudents;

        // Get all cases (not filtered)
        if (dbType === 'mongo') {
            allCases = await CaseModel.find();
        } else if (dbType === 'mysql') {
            const [casesRows] = await db.execute('SELECT * FROM cases');
            allCases = casesRows;
        }

        // Get all students for reference
        if (dbType === 'mongo') {
            allStudents = await StudentModel.find();
        } else if (dbType === 'mysql') {
            const [studentsRows] = await db.execute('SELECT * FROM students');
            allStudents = studentsRows;
        }

        // Build document sections
        const sections = [];

        // Title section
        sections.push(
            new Paragraph({
                children: [new TextRun({ text: (pageInfo && pageInfo.title) ? pageInfo.title : 'KMU Discipline Desk - All Cases Report', bold: true, size: 32 })],
                spacing: { after: 400 },
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                children: [new TextRun({ text: `Generated on ${new Date().toLocaleDateString()}`, size: 20 })],
                spacing: { after: 600 },
                alignment: AlignmentType.CENTER
            })
        );

        // Add charts if provided
        if (charts && charts.length > 0) {
            sections.push(
                new Paragraph({
                    children: [new TextRun({ text: 'Analytics & Charts', bold: true, size: 24 })],
                    spacing: { before: 400, after: 300 },
                    alignment: AlignmentType.CENTER
                })
            );

            for (const chart of charts) {
                try {
                    // Convert base64 to buffer
                    const base64Data = chart.imageData.replace(/^data:image\/png;base64,/, '');
                    const imageBuffer = Buffer.from(base64Data, 'base64');

                    sections.push(
                        new Paragraph({
                            children: [new TextRun({ text: chart.title, bold: true, size: 18 })],
                            spacing: { before: 300, after: 200 }
                        }),
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: imageBuffer,
                                    transformation: {
                                        width: 500,
                                        height: 300
                                    }
                                })
                            ],
                            spacing: { after: 300 }
                        })
                    );

                    if (chart.description) {
                        sections.push(
                            new Paragraph({
                                children: [new TextRun({ text: chart.description, size: 14 })],
                                spacing: { after: 200 }
                            })
                        );
                    }
                } catch (error) {
                    console.error('Error processing chart:', error);
                    sections.push(
                        new Paragraph({
                            children: [new TextRun({ text: `Error loading chart: ${chart.title}`, color: 'FF0000' })],
                            spacing: { after: 200 }
                        })
                    );
                }
            }
        }

        // Add cases in document format (not table)
        if (allCases && allCases.length > 0) {
            sections.push(
                new Paragraph({
                    children: [new TextRun({ text: 'All Disciplinary Cases', bold: true, size: 24 })],
                    spacing: { before: 400, after: 300 },
                    alignment: AlignmentType.CENTER
                })
            );

            // Add each case as a document section
            allCases.forEach((c, index) => {
                // Find student name
                let studentName = '';
                if (dbType === 'mongo') {
                    const student = allStudents.find(s => s.studentId === (c.student_id || c.studentId));
                    studentName = student ? student.fullName : '';
                } else {
                    const student = allStudents.find(s => s.studentId === (c.student_id || c.studentId));
                    studentName = student ? student.fullName : '';
                }

                sections.push(
                    new Paragraph({
                        children: [new TextRun({ text: `Case ${index + 1}`, bold: true, size: 18 })],
                        spacing: { before: 300, after: 200 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Student Name: ', bold: true }),
                            new TextRun({ text: studentName || 'Unknown' })
                        ],
                        spacing: { after: 100 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Student ID: ', bold: true }),
                            new TextRun({ text: String(c.student_id || c.studentId || '') })
                        ],
                        spacing: { after: 100 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Offense Type: ', bold: true }),
                            new TextRun({ text: c.offense_type || c.offenseType || '' })
                        ],
                        spacing: { after: 100 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Incident Date: ', bold: true }),
                            new TextRun({ text: c.incident_date || c.incidentDate || '' })
                        ],
                        spacing: { after: 100 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Description: ', bold: true }),
                            new TextRun({ text: c.description || '' })
                        ],
                        spacing: { after: 100 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Sanctions: ', bold: true }),
                            new TextRun({ text: c.sanctions || '' })
                        ],
                        spacing: { after: 100 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Attachments: ', bold: true }),
                            new TextRun({ text: (c.attachments && c.attachments.length) ? c.attachments.join(', ') : 'None' })
                        ],
                        spacing: { after: 200 }
                    })
                );
            });
        }

        const doc = new Document({
            sections: [{
                children: sections
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=dashboard_cases_report.docx');
        res.send(buffer);
        console.log('Dashboard cases DOCX export completed successfully');
    } catch (err) {
        console.error('Dashboard cases DOCX export error:', err);
        res.status(500).json({ error: 'Export failed: ' + err.message });
    }
});

export default router;