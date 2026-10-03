import PDFDocument from 'pdfkit';
import { loadKmuLogo, signatureDisplayValue } from './docxExport.js';

const FALLBACK = '................................................................';

function valueOrFallback(value, fallback = FALLBACK) {
    const text = String(value ?? '').trim();
    return text || fallback;
}

function personName(person = {}) {
    return person.fullName || person.name || '';
}

function signatureFor(item = {}) {
    const summon = item.summon || {};
    const index = item.index ?? 0;
    return item.studentSignature
        || summon.studentSignatures?.[String(index)]
        || summon.studentSignatures?.[index]
        || '';
}

function fieldHeight(doc, label, value, width) {
    doc.font('Helvetica-Bold').fontSize(8);
    const labelHeight = doc.heightOfString(label, { width });
    doc.font('Helvetica').fontSize(9);
    const valueHeight = Math.max(doc.heightOfString(valueOrFallback(value), { width }), 12);
    return labelHeight + valueHeight + 12;
}

function writeField(doc, label, value, x, y, width) {
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text(label, x, y, { width });
    const labelHeight = doc.heightOfString(label, { width });
    doc.fillColor('#1E293B').font('Helvetica').fontSize(9).text(valueOrFallback(value), x, y + labelHeight + 3, { width });
}

function writeFieldRow(doc, leftField, rightField, x, y, width) {
    const columnGap = 24;
    const columnWidth = (width - columnGap) / 2;
    const rowHeight = Math.max(
        fieldHeight(doc, leftField.label, leftField.value, columnWidth),
        fieldHeight(doc, rightField.label, rightField.value, columnWidth),
    );

    writeField(doc, leftField.label, leftField.value, x, y, columnWidth);
    writeField(doc, rightField.label, rightField.value, x + columnWidth + columnGap, y, columnWidth);
    return rowHeight;
}

function writeFullField(doc, field, x, y, width) {
    writeField(doc, field.label, field.value, x, y, width);
    return fieldHeight(doc, field.label, field.value, width);
}

function writeSignature(doc, label, value, x, y, width) {
    const signature = signatureDisplayValue(value);
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text(label, x, y, { width });
    const labelHeight = doc.heightOfString(label, { width });
    const signatureY = y + labelHeight + 4;

    if (signature.image) {
        doc.image(signature.image.buffer, x, signatureY, { fit: [110, 28] });
    } else {
        doc.fillColor('#1E293B').font('Helvetica').fontSize(9).text(signature.text, x, signatureY, { width });
    }

    return labelHeight + 44;
}

function writeInstruction(doc, summon, x, y, width) {
    const reportTime = valueOrFallback(summon.reportTime, '....................');
    const reportDate = valueOrFallback(summon.reportDate, '....................');
    const parts = [
        { text: "You are required to report to the Security Officer's office at " },
        { text: reportTime, bold: true },
        { text: ' hours (Time) on ' },
        { text: reportDate, bold: true },
        { text: ' (Day & Date) without fail.' },
    ];
    const height = doc.font('Helvetica').fontSize(9).heightOfString(parts.map((part) => part.text).join(''), { width });
    doc.fillColor('#1E293B').fontSize(9).text('', x, y, { width, continued: true });
    parts.forEach((part, index) => {
        doc.font(part.bold ? 'Helvetica-Bold' : 'Helvetica').text(part.text, {
            continued: index < parts.length - 1,
        });
    });
    return height + 12;
}

function writeCalloutPage(doc, item, position, total) {
    const person = item.person || {};
    const summon = item.summon || {};
    const pageLeft = doc.page.margins.left;
    const pageTop = doc.page.margins.top;
    const pageWidth = doc.page.width - pageLeft - doc.page.margins.right;
    const pageHeight = doc.page.height - pageTop - doc.page.margins.bottom;
    const contentLeft = pageLeft + 20;
    const contentWidth = pageWidth - 40;
    let y = pageTop + 18;

    doc.lineWidth(1.25).strokeColor('#0F172A').rect(pageLeft, pageTop, pageWidth, pageHeight).stroke();

    const logo = loadKmuLogo();
    const logoSize = 48;
    if (logo) {
        doc.image(logo.buffer, (doc.page.width - logoSize) / 2, y, { fit: [logoSize, logoSize] });
    }
    y += logoSize + 8;

    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(11)
        .text('KAPASA MAKASA UNIVERSITY SECURITY DEPARTMENT', contentLeft, y, { width: contentWidth, align: 'center' });
    y += 20;
    doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(14)
        .text('CALL OUT', contentLeft, y, { width: contentWidth, align: 'center' });
    y += 25;
    doc.strokeColor('#CBD5E1').lineWidth(0.75).moveTo(contentLeft, y).lineTo(contentLeft + contentWidth, y).stroke();
    y += 14;

    y += writeFieldRow(doc,
        { label: 'Full Names', value: personName(person) },
        { label: 'SIN', value: person.sin },
        contentLeft, y, contentWidth,
    );
    y += 4;
    y += writeFieldRow(doc,
        { label: 'Sex', value: person.sex },
        { label: 'Age', value: person.age },
        contentLeft, y, contentWidth,
    );
    y += 4;
    y += writeFieldRow(doc,
        { label: 'Program of Study', value: person.programOfStudy || person.program },
        { label: 'Year of Study', value: person.yearOfStudy },
        contentLeft, y, contentWidth,
    );
    y += 4;
    y += writeFieldRow(doc,
        { label: 'Residential Address', value: person.residentialAddress },
        { label: 'Phone No', value: person.phoneNo },
        contentLeft, y, contentWidth,
    );
    y += 4;
    y += writeFieldRow(doc,
        { label: 'Report Time', value: summon.reportTime },
        { label: 'Day & Date', value: summon.reportDate },
        contentLeft, y, contentWidth,
    );
    y += 4;
    y += writeFullField(doc, { label: 'Appointment', value: summon.appointment }, contentLeft, y, contentWidth);
    y += 4;
    y += writeInstruction(doc, summon, contentLeft, y, contentWidth);
    y += 6;
    y += writeSignature(doc, 'Officer Signature', summon.officerSignature, contentLeft, y, contentWidth);
    y += 4;
    writeSignature(doc, 'Student Signature', signatureFor(item), contentLeft, y, contentWidth);

    doc.fillColor('#64748B').font('Helvetica').fontSize(8).text(
        `Call Out ${position + 1} of ${total}`,
        contentLeft,
        pageTop + pageHeight - 20,
        { width: contentWidth, align: 'right' },
    );
}

export function createCalloutPdfBuffer(callouts = []) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 42 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('error', reject);
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        callouts.forEach((item, index) => {
            if (index > 0) {
                doc.addPage();
            }
            writeCalloutPage(doc, { ...item, index: item.index ?? index }, index, callouts.length);
        });

        doc.end();
    });
}
