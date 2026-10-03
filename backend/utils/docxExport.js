import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    AlignmentType,
    BorderStyle,
    ImageRun,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
} from 'docx';

let cachedLogo = null;
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

function extractPngFromSvgFile(svgPath) {
    const content = fs.readFileSync(svgPath, 'utf8');
    const match = content.match(/data:image\/png;base64,([A-Za-z0-9+/=\r\n]+)/);
    if (!match) {
        return null;
    }

    const base64 = match[1].replace(/\s+/g, '');
    try {
        return Buffer.from(base64, 'base64');
    } catch {
        return null;
    }
}

export function loadKmuLogo() {
    if (cachedLogo) {
        return cachedLogo;
    }

    const backendLogoPath = path.resolve(moduleDirectory, '../assets/kmu_logo_pdf.png');
    const pngPaths = [
        backendLogoPath,
        path.resolve(process.cwd(), '../frontend/public/kmu_logo_pdf.png'),
        path.resolve(process.cwd(), 'frontend/public/kmu_logo_pdf.png'),
    ];
    const svgPaths = [
        path.resolve(process.cwd(), '../frontend/public/kmu_logo.svg'),
        path.resolve(process.cwd(), 'frontend/public/kmu_logo.svg'),
    ];

    for (const pngPath of pngPaths) {
        if (fs.existsSync(pngPath)) {
            cachedLogo = { buffer: fs.readFileSync(pngPath), type: 'png' };
            return cachedLogo;
        }
    }

    for (const svgPath of svgPaths) {
        if (!fs.existsSync(svgPath)) {
            continue;
        }

        const extracted = extractPngFromSvgFile(svgPath);
        if (extracted?.length) {
            try {
                fs.mkdirSync(path.dirname(backendLogoPath), { recursive: true });
                fs.writeFileSync(backendLogoPath, extracted);
            } catch {
                // Ignore write failures and use the in-memory buffer.
            }
            cachedLogo = { buffer: extracted, type: 'png' };
            return cachedLogo;
        }
    }

    return null;
}

export function displayValue(value, fallback = '....................') {
    const text = String(value ?? '').trim();
    return text || fallback;
}

export function kmuLogoParagraph({ width = 96, height = 96 } = {}) {
    const logo = loadKmuLogo();
    if (!logo) {
        return new Paragraph('');
    }

    return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
            new ImageRun({
                data: logo.buffer,
                type: 'png',
                transformation: { width, height },
            }),
        ],
    });
}

export function centeredTitle(text, size = 32, spacingAfter = 80) {
    return new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, size })],
        spacing: { after: spacingAfter },
    });
}

export function fieldParagraph(label, value, { fallback } = {}) {
    return new Paragraph({
        children: [
            new TextRun({ text: `${label}: `, bold: true }),
            new TextRun(displayValue(value, fallback)),
        ],
        spacing: { after: 100 },
    });
}

export function combinedFieldParagraph(fields) {
    const children = [];

    fields.forEach(([label, value], index) => {
        if (index > 0) {
            children.push(new TextRun({ text: '    ' }));
        }
        children.push(new TextRun({ text: `${label}: `, bold: true }));
        children.push(new TextRun(displayValue(value)));
    });

    return new Paragraph({
        children,
        spacing: { after: 100 },
    });
}

export function borderedSection(paragraphs) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        margins: {
                            top: 220,
                            bottom: 220,
                            left: 280,
                            right: 280,
                        },
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                            bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                            left: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                            right: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                        },
                        children: paragraphs,
                    }),
                ],
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

export function signatureDisplayValue(value, fallback = '................................................................') {
    const parsed = parseSignatureBuffer(value);
    if (parsed) {
        return { image: parsed, text: '' };
    }

    const text = String(value ?? '').trim();
    return {
        image: null,
        text: text.startsWith('data:image/') ? fallback : (text || fallback),
    };
}

export function signatureInlineParagraph(label, value, { pendingText = '................................................................' } = {}) {
    const children = [new TextRun({ text: `${label}: `, bold: true })];
    const signature = signatureDisplayValue(value, pendingText);

    if (signature.image) {
        children.push(new ImageRun({
            data: signature.image.buffer,
            type: signature.image.type,
            transformation: { width: 110, height: 28 },
        }));
    } else {
        children.push(new TextRun(signature.text));
    }

    return new Paragraph({
        children,
        spacing: { after: 100 },
    });
}

export function signatureParagraphs(label, value, { pendingText = 'Pending', inline = true } = {}) {
    if (inline) {
        return [signatureInlineParagraph(label, value, { pendingText })];
    }

    const paragraphs = [
        new Paragraph({
            children: [new TextRun({ text: `${label}:`, bold: true })],
            spacing: { after: 80 },
        }),
    ];

    const signature = signatureDisplayValue(value, pendingText);
    if (signature.image) {
        paragraphs.push(new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
                new ImageRun({
                    data: signature.image.buffer,
                    type: signature.image.type,
                    transformation: { width: 110, height: 28 },
                }),
            ],
            spacing: { after: 160 },
        }));
        return paragraphs;
    }

    paragraphs.push(new Paragraph({
        children: [new TextRun(signature.text)],
        spacing: { after: 160 },
    }));
    return paragraphs;
}
