import { PageBreak, Paragraph, TextRun } from 'docx';
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
        kmuLogoParagraph(),
        centeredTitle('KAPASA MAKASA UNIVERSITY', 32, 60),
        centeredTitle('SECURITY DEPARTMENT', 28, 60),
        centeredTitle('CALL OUT', 32, 180),
        fieldParagraph('Full Names', personName(person), {
            fallback: '................................................................',
        }),
        combinedFieldParagraph([
            ['Sex', person.sex],
            ['Age', person.age],
            ['SIN', person.sin],
        ]),
        combinedFieldParagraph([
            ['Program of study', person.programOfStudy || person.program],
            ['Year of study', person.yearOfStudy],
        ]),
        combinedFieldParagraph([
            ['Residential Address', person.residentialAddress],
            ['Phone No', person.phoneNo],
        ]),
        new Paragraph({
            children: [
                new TextRun({ text: 'You are required to report to the Security Officer\'s office at ' }),
                new TextRun({ text: displayValue(summon.reportTime), bold: true }),
                new TextRun({ text: ' hours (Time) on ' }),
                new TextRun({ text: displayValue(summon.reportDate), bold: true }),
                new TextRun({ text: ' (Day & Date) without fail.' }),
            ],
            spacing: { before: 100, after: 100 },
        }),
        fieldParagraph('Appointment', summon.appointment, {
            fallback: '........................................................',
        }),
        signatureInlineParagraph('Officer Signature', summon.officerSignature),
        signatureInlineParagraph('Student Signature', studentSignature),
    ];
}

export function buildCalloutDocChildren(callouts = []) {
    const children = [];

    callouts.forEach((item, index) => {
        children.push(borderedSection(buildCalloutCardParagraphs(item)));

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
