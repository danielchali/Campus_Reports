import express from 'express';
import CaseModel from '../models/case.js';
import StudentModel from '../models/student.js';
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, ImageRun } from 'docx';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize(['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'registrar', 'security_officer', 'maintenance']));

function buildCaseQuery(filters = {}) {
    const query = {};
    if (filters.studentId) query.student_id = filters.studentId;
    if (filters.status || filters.statusFilter) query.status = filters.status || filters.statusFilter;
    if (filters.severity || filters.severityFilter) query.severity = filters.severity || filters.severityFilter;
    if (filters.search) {
        query.$or = [
            { offense_type: { $regex: filters.search, $options: 'i' } },
            { description: { $regex: filters.search, $options: 'i' } }
        ];
    }
    return query;
}

function buildStudentQuery(filters = {}) {
    const query = {};
    if (filters.program) query.program = { $regex: filters.program, $options: 'i' };
    if (filters.year) query.year = filters.year;
    if (filters.gender) query['personalInfo.gender'] = filters.gender;
    if (filters.search) {
        query.$or = [
            { 'personalInfo.firstName': { $regex: filters.search, $options: 'i' } },
            { 'personalInfo.surName': { $regex: filters.search, $options: 'i' } },
            { studentId: { $regex: filters.search, $options: 'i' } }
        ];
    }
    return query;
}

async function fetchCasesFromRequest({ type, ids, data, filters, studentId }) {
    if (studentId) {
        return CaseModel.find({ student_id: studentId });
    }
    if (type === 'selected' && ids && ids.length > 0) {
        return CaseModel.find({ _id: { $in: ids } });
    }
    if (type === 'current_page' && data) {
        return data;
    }
    if (type === 'filtered' && filters) {
        return CaseModel.find(buildCaseQuery(filters));
    }
    return CaseModel.find();
}

async function fetchStudents(filters = null) {
    if (filters && Object.keys(filters).length > 0) {
        return StudentModel.find(buildStudentQuery(filters));
    }
    return StudentModel.find();
}

function getStudentName(allStudents, caseItem) {
    const student = allStudents.find(s => s.studentId === (caseItem.student_id || caseItem.studentId));
    return student ? student.fullName : '';
}

function caseTableRows(allCases, allStudents, includeCaseId = false) {
    const headers = includeCaseId ? ['Case ID', 'Student Name', 'Student ID', 'Offense', 'Date', 'Status', 'Severity'] : ['Student Name', 'Student ID', 'Offense', 'Date', 'Status', 'Severity'];
    const widths = includeCaseId ? [15, 20, 15, 20, 12, 10, 8] : [25, 15, 20, 15, 12, 13];

    return [
        new TableRow({
            children: headers.map((header, index) => new TableCell({
                children: [new Paragraph(header)],
                width: { size: widths[index], type: WidthType.PERCENTAGE }
            }))
        }),
        ...allCases.map(c => {
            const studentName = getStudentName(allStudents, c);
            const values = includeCaseId ? [
                String(c._id || c.id || ''),
                studentName || 'Unknown',
                String(c.student_id || c.studentId || ''),
                c.offense_type || c.offenseType || '',
                c.incident_date || c.incidentDate || '',
                c.status || '',
                c.severity || ''
            ] : [
                studentName || 'Unknown',
                String(c.student_id || c.studentId || ''),
                c.offense_type || c.offenseType || '',
                c.incident_date || c.incidentDate || '',
                c.status || '',
                c.severity || ''
            ];

            return new TableRow({
                children: values.map((value, index) => new TableCell({
                    children: [new Paragraph(value)],
                    width: { size: widths[index], type: WidthType.PERCENTAGE }
                }))
            });
        })
    ];
}

function createTitledDocument(title, children) {
    return new Document({
        sections: [{
            children: [
                new Paragraph({
                    children: [new TextRun({ text: title, bold: true, size: 28 })],
                    spacing: { after: 300 },
                    alignment: AlignmentType.CENTER
                }),
                new Paragraph({
                    children: [new TextRun({ text: `Generated on ${new Date().toLocaleDateString()}`, size: 20 })],
                    spacing: { after: 400 },
                    alignment: AlignmentType.CENTER
                }),
                ...children
            ]
        }]
    });
}

router.post('/docx', async(req, res) => {
    try {
        console.log('DOCX export requested');
        const allCases = await fetchCasesFromRequest(req.body);
        const allStudents = await fetchStudents();

        const doc = createTitledDocument('Disciplinary Cases Report', [
            new Table({
                rows: caseTableRows(allCases, allStudents),
                width: { size: 100, type: WidthType.PERCENTAGE }
            })
        ]);

        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics.docx');
        res.send(buffer);
    } catch (err) {
        console.error('DOCX export error:', err);
        res.status(500).json({ error: 'Export failed: ' + err.message });
    }
});

router.post('/students-docx', async(req, res) => {
    try {
        console.log('Students DOCX export requested');
        const allStudents = await fetchStudents(req.body.filters || null);

        const rows = [
            new TableRow({
                children: ['Student ID', 'Full Name', 'Program', 'Year', 'Gender'].map((header, index) => new TableCell({
                    children: [new Paragraph(header)],
                    width: { size: [20, 30, 25, 12, 13][index], type: WidthType.PERCENTAGE }
                }))
            }),
            ...allStudents.map(s => new TableRow({
                children: [
                    String(s.studentId || ''),
                    s.fullName || '',
                    s.program || '',
                    s.year || '',
                    s.gender || ''
                ].map((value, index) => new TableCell({
                    children: [new Paragraph(value)],
                    width: { size: [20, 30, 25, 12, 13][index], type: WidthType.PERCENTAGE }
                }))
            }))
        ];

        const doc = createTitledDocument('Students List Report', [
            new Table({
                rows,
                width: { size: 100, type: WidthType.PERCENTAGE }
            })
        ]);

        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=students_list.docx');
        res.send(buffer);
    } catch (err) {
        console.error('Students DOCX export error:', err);
        res.status(500).json({ error: 'Export failed: ' + err.message });
    }
});

router.post('/cases-docx', async(req, res) => {
    try {
        console.log('Cases DOCX export requested');
        const filters = req.body.filters || {};
        const allCases = await CaseModel.find(buildCaseQuery(filters));
        const allStudents = await fetchStudents();

        const doc = createTitledDocument('Cases List Report', [
            new Table({
                rows: caseTableRows(allCases, allStudents, true),
                width: { size: 100, type: WidthType.PERCENTAGE }
            })
        ]);

        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=cases_list.docx');
        res.send(buffer);
    } catch (err) {
        console.error('Cases DOCX export error:', err);
        res.status(500).json({ error: 'Export failed: ' + err.message });
    }
});

router.post('/export-excel', async(req, res) => {
    try {
        const allCases = await fetchCasesFromRequest(req.body);
        const allStudents = await fetchStudents();

        const workbook = new ExcelJS.Workbook();
        const casesSheet = workbook.addWorksheet('Cases');
        casesSheet.addRow(['ID', 'Student ID', 'Student Name', 'Offense', 'Date', 'Description', 'Severity', 'Status', 'Sanctions']);

        allCases.forEach(c => {
            casesSheet.addRow([
                c.id || c._id || '',
                c.student_id || c.studentId || '',
                getStudentName(allStudents, c),
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

router.get('/export-excel', async(req, res) => {
    try {
        const allCases = await CaseModel.find();
        const allStudents = await fetchStudents();

        const offenseTrends = {};
        allCases.forEach(c => {
            const offense = c.offense_type || '';
            if (offense) offenseTrends[offense] = (offenseTrends[offense] || 0) + 1;
        });

        const studentProgram = {};
        allStudents.forEach(s => {
            const sid = s.studentId || s.id || s._id;
            const program = s.program || '';
            if (sid && program) studentProgram[sid] = program;
        });

        const programStats = {};
        allCases.forEach(c => {
            const sid = c.student_id || c.studentId;
            const program = sid && studentProgram[sid] ? studentProgram[sid] : '';
            if (program) programStats[program] = (programStats[program] || 0) + 1;
        });

        const workbook = new ExcelJS.Workbook();
        const offenseSheet = workbook.addWorksheet('Offense Trends');
        offenseSheet.addRow(['Offense', 'Count']);
        Object.entries(offenseTrends).forEach(([offense, count]) => offenseSheet.addRow([offense, count]));

        const programSheet = workbook.addWorksheet('Program Stats');
        programSheet.addRow(['Program', 'Count']);
        Object.entries(programStats).forEach(([program, count]) => programSheet.addRow([program, count]));

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
        const allCases = await CaseModel.find();
        const allStudents = await fetchStudents();

        const offenseTrendsMap = {};
        allCases.forEach(c => {
            const offense = c.offense_type || c.offenseType || '';
            if (offense) offenseTrendsMap[offense] = (offenseTrendsMap[offense] || 0) + 1;
        });
        const offenseTrends = Object.entries(offenseTrendsMap).map(([k, v]) => ({ _id: k, count: v }));

        const studentProgram = {};
        allStudents.forEach(s => {
            const sid = s.studentId || s.id || s._id;
            const program = s.program || '';
            if (sid && program) studentProgram[sid] = program;
        });

        const programStatsMap = {};
        allCases.forEach(c => {
            const sid = c.student_id || c.studentId;
            const program = sid && studentProgram[sid] ? studentProgram[sid] : '';
            if (program) programStatsMap[program] = (programStatsMap[program] || 0) + 1;
        });
        const departmentStats = Object.entries(programStatsMap).map(([k, v]) => ({ _id: k, count: v }));

        res.json({ offenseTrends, departmentStats });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load analytics' });
    }
});

router.post('/with-charts', async(req, res) => {
    try {
        console.log('DOCX export with charts requested');
        const { charts, pageInfo, filters, studentId } = req.body;

        if (!charts || !Array.isArray(charts)) {
            return res.status(400).json({ error: 'Invalid charts data provided' });
        }

        const allCases = await fetchCasesFromRequest({ type: filters ? 'filtered' : undefined, filters, studentId });
        const allStudents = await fetchStudents();
        const sections = [
            new Paragraph({
                children: [new TextRun({ text: (pageInfo && pageInfo.title) ? pageInfo.title : 'KMU Discipline Desk Report', bold: true, size: 32 })],
                spacing: { after: 400 },
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                children: [new TextRun({ text: `Generated on ${new Date().toLocaleDateString()}`, size: 20 })],
                spacing: { after: 600 },
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                children: [new TextRun({ text: 'Analytics & Charts', bold: true, size: 24 })],
                spacing: { before: 400, after: 300 },
                alignment: AlignmentType.CENTER
            })
        ];

        for (const chart of charts) {
            try {
                const base64Data = chart.imageData.replace(/^data:image\/png;base64,/, '');
                const imageBuffer = Buffer.from(base64Data, 'base64');
                sections.push(
                    new Paragraph({
                        children: [new TextRun({ text: chart.title, bold: true, size: 18 })],
                        spacing: { before: 300, after: 200 }
                    }),
                    new Paragraph({
                        children: [new ImageRun({ data: imageBuffer, transformation: { width: 500, height: 300 } })],
                        spacing: { after: 300 }
                    })
                );
                if (chart.description) {
                    sections.push(new Paragraph({
                        children: [new TextRun({ text: chart.description, size: 14 })],
                        spacing: { after: 200 }
                    }));
                }
            } catch (error) {
                console.error('Error processing chart:', error);
                sections.push(new Paragraph({
                    children: [new TextRun({ text: `Error loading chart: ${chart.title}`, color: 'FF0000' })],
                    spacing: { after: 200 }
                }));
            }
        }

        if (allCases && allCases.length > 0) {
            sections.push(
                new Paragraph({
                    children: [new TextRun({ text: 'Case Data', bold: true, size: 24 })],
                    spacing: { before: 400, after: 300 },
                    alignment: AlignmentType.CENTER
                }),
                new Table({
                    rows: caseTableRows(allCases, allStudents),
                    width: { size: 100, type: WidthType.PERCENTAGE }
                })
            );
        }

        const doc = new Document({ sections: [{ children: sections }] });
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=report_with_charts.docx');
        res.send(buffer);
    } catch (err) {
        console.error('DOCX export with charts error:', err);
        res.status(500).json({ error: 'Export failed: ' + err.message, details: err.stack });
    }
});

router.post('/dashboard-cases', async(req, res) => {
    try {
        console.log('Dashboard cases DOCX export requested');
        const { charts, pageInfo } = req.body;
        const allCases = await CaseModel.find();
        const allStudents = await fetchStudents();

        const sections = [
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
        ];

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
                    const base64Data = chart.imageData.replace(/^data:image\/png;base64,/, '');
                    const imageBuffer = Buffer.from(base64Data, 'base64');
                    sections.push(
                        new Paragraph({
                            children: [new TextRun({ text: chart.title, bold: true, size: 18 })],
                            spacing: { before: 300, after: 200 }
                        }),
                        new Paragraph({
                            children: [new ImageRun({ data: imageBuffer, transformation: { width: 500, height: 300 } })],
                            spacing: { after: 300 }
                        })
                    );
                    if (chart.description) {
                        sections.push(new Paragraph({
                            children: [new TextRun({ text: chart.description, size: 14 })],
                            spacing: { after: 200 }
                        }));
                    }
                } catch (error) {
                    console.error('Error processing chart:', error);
                    sections.push(new Paragraph({
                        children: [new TextRun({ text: `Error loading chart: ${chart.title}`, color: 'FF0000' })],
                        spacing: { after: 200 }
                    }));
                }
            }
        }

        if (allCases && allCases.length > 0) {
            sections.push(
                new Paragraph({
                    children: [new TextRun({ text: 'All Disciplinary Cases', bold: true, size: 24 })],
                    spacing: { before: 400, after: 300 },
                    alignment: AlignmentType.CENTER
                })
            );

            allCases.forEach((c, index) => {
                const studentName = getStudentName(allStudents, c);
                sections.push(
                    new Paragraph({
                        children: [new TextRun({ text: `Case ${index + 1}`, bold: true, size: 18 })],
                        spacing: { before: 300, after: 200 }
                    }),
                    new Paragraph({ children: [new TextRun({ text: 'Student Name: ', bold: true }), new TextRun({ text: studentName || 'Unknown' })], spacing: { after: 100 } }),
                    new Paragraph({ children: [new TextRun({ text: 'Student ID: ', bold: true }), new TextRun({ text: String(c.student_id || c.studentId || '') })], spacing: { after: 100 } }),
                    new Paragraph({ children: [new TextRun({ text: 'Offense Type: ', bold: true }), new TextRun({ text: c.offense_type || c.offenseType || '' })], spacing: { after: 100 } }),
                    new Paragraph({ children: [new TextRun({ text: 'Incident Date: ', bold: true }), new TextRun({ text: c.incident_date || c.incidentDate || '' })], spacing: { after: 100 } }),
                    new Paragraph({ children: [new TextRun({ text: 'Description: ', bold: true }), new TextRun({ text: c.description || '' })], spacing: { after: 100 } }),
                    new Paragraph({ children: [new TextRun({ text: 'Sanctions: ', bold: true }), new TextRun({ text: c.sanctions || '' })], spacing: { after: 100 } }),
                    new Paragraph({ children: [new TextRun({ text: 'Attachments: ', bold: true }), new TextRun({ text: (c.attachments && c.attachments.length) ? c.attachments.join(', ') : 'None' })], spacing: { after: 200 } })
                );
            });
        }

        const doc = new Document({ sections: [{ children: sections }] });
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=dashboard_cases_report.docx');
        res.send(buffer);
    } catch (err) {
        console.error('Dashboard cases DOCX export error:', err);
        res.status(500).json({ error: 'Export failed: ' + err.message });
    }
});

export default router;
