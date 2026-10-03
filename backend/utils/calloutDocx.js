import { AlignmentType, PageBreak, Paragraph, TextRun } from 'docx';
import {
    borderedSection,
    centeredTitle,
    combinedFieldParagraph,
    displayValue,
    fieldParagraph,
    kmuLogoParagraph,
    signatureInlineParagraph,
} from './docxExport.js';

function personName(person = {}) {
    return person.fullName || person.name || '';
}

export function buildCalloutCardParagraphs(item) {
    const person = item.person || {};
    const summon = item.summon || {};
    const index = item.index ?? 0;
    const studentSignature =
        item.studentSignature
        || summon.studentSignatures?.[String(index)]
        || summon.studentSignatures?.[index]
        || '';

    return [
        kmuLogoParagraph({ width: 56, height: 56 }),
        centeredTitle('KAPASA MAKASA UNIVERSITY SECURITY DEPARTMENT', 24, 60),
        centeredTitle('CALL OUT', 28, 180),
        combinedFieldParagraph([
            ['Full Names', personName(person)],
            ['SIN', person.sin],
        ]),
        combinedFieldParagraph([
            ['Sex', person.sex],
            ['Age', person.age],
        ]),
        combinedFieldParagraph([
            ['Program of Study', person.programOfStudy || person.program],
            ['Year of Study', person.yearOfStudy],
        ]),
        combinedFieldParagraph([
            ['Residential Address', person.residentialAddress],
            ['Phone No', person.phoneNo],
        ]),
        combinedFieldParagraph([
            ['Report Time', summon.reportTime],
            ['Day & Date', summon.reportDate],
        ]),
        fieldParagraph('Appointment', summon.appointment, {
            fallback: '........................................................',
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "You are required to report to the Security Officer's office at " }),
                new TextRun({ text: displayValue(summon.reportTime), bold: true }),
                new TextRun({ text: ' hours (Time) on ' }),
                new TextRun({ text: displayValue(summon.reportDate), bold: true }),
                new TextRun({ text: ' (Day & Date) without fail.' }),
            ],
            spacing: { before: 100, after: 100 },
        }),
        signatureInlineParagraph('Officer Signature', summon.officerSignature),
        signatureInlineParagraph('Student Signature', studentSignature),
        new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
                new TextRun({
                    text: `Call Out ${index + 1} of ${item.total || 1}`,
                    size: 16,
                    color: '64748B',
                }),
            ],
            spacing: { before: 80 },
        }),
    ];
}

export function buildCalloutDocChildren(callouts = []) {
    const children = [];

    callouts.forEach((item, index) => {
        children.push(borderedSection(buildCalloutCardParagraphs({
            ...item,
            index: item.index ?? index,
            total: callouts.length,
        })));

        if (index < callouts.length - 1) {
            children.push(new Paragraph({ children: [new PageBreak()] }));
        }
    });

    return children;
}

export function buildCalloutsFromCase(caseItem) {
    const occ = caseItem.student_case_process?.occurrenceCover || {};
    const summon = caseItem.student_case_process?.summon || {};
    const accused = occ.accusedPeople || [];

    return accused.map((person, index) => ({
        person,
        summon,
        index,
        studentSignature: summon.studentSignatures?.[String(index)] || summon.studentSignatures?.[index] || '',
    }));
}

export async function createCalloutDocBuffer(callouts = []) {
    const { Document, Packer } = await import('docx');
    const doc = new Document({
        sections: [{ children: buildCalloutDocChildren(callouts) }],
    });
    return Packer.toBuffer(doc);
}
