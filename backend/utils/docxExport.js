import fs from 'fs';
import path from 'path';
import { AlignmentType, ImageRun, Paragraph, TextRun } from 'docx';

export function loadKmuLogo() {
    const logoSvgPath = path.resolve(process.cwd(), '../frontend/public/kmu_logo.svg');
    const logoPngPath = path.resolve(process.cwd(), '../frontend/public/kmu_logo.png');
    const hasSvgLogo = fs.existsSync(logoSvgPath);

    if (hasSvgLogo) {
        return { buffer: fs.readFileSync(logoSvgPath), type: 'svg' };
    }

    if (fs.existsSync(logoPngPath)) {
        return { buffer: fs.readFileSync(logoPngPath), type: 'png' };
    }

    return null;
}

export function kmuLogoParagraph() {
    const logo = loadKmuLogo();
    if (!logo) {
        return new Paragraph('');
    }

    return new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
            new ImageRun({
                data: logo.buffer,
                type: logo.type,
                transformation: { width: 110, height: 55 },
            }),
        ],
    });
}

export function parseSignatureBuffer(value) {
    if (!value || typeof value !== 'string') {
        return null;
    }

    const match = value.match(/^data:image\/(png|jpe?g|gif|webp);base64,(.+)$/i);
    if (!match) {
        return null;
    }

    try {
        const type = match[1].toLowerCase() === 'jpg' ? 'jpg' : match[1].toLowerCase();
        return {
            buffer: Buffer.from(match[2], 'base64'),
            type,
        };
    } catch {
        return null;
    }
}

export function signatureParagraphs(label, value, { pendingText = 'Pending' } = {}) {
    const paragraphs = [
        new Paragraph({
            children: [new TextRun({ text: `${label}:`, bold: true })],
            spacing: { after: 80 },
        }),
    ];

    const parsed = parseSignatureBuffer(value);
    if (parsed) {
        paragraphs.push(new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
                new ImageRun({
                    data: parsed.buffer,
                    type: parsed.type,
                    transformation: { width: 110, height: 28 },
                }),
            ],
            spacing: { after: 160 },
        }));
        return paragraphs;
    }

    const text = value?.trim();
    paragraphs.push(new Paragraph({
        children: [new TextRun(text || pendingText)],
        spacing: { after: 160 },
    }));
    return paragraphs;
}
