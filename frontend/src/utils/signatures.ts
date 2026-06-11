export function isSignatureDataUrl(value?: string | null): boolean {
  return Boolean(value && value.startsWith("data:image/"));
}

export function signaturePrintHtml(
  value?: string | null,
  label = "Signature",
): string {
  const raw = value ?? "";

  if (isSignatureDataUrl(raw)) {
    return (
      `<p class="signature-line"><strong>${label}:</strong> `
      + `<img src="${raw}" alt="${label}" class="signature-img" /></p>`
    );
  }

  const display = raw.trim() || "................................................................";
  return `<p class="signature-line"><strong>${label}:</strong> ${display}</p>`;
}

export const signaturePrintStyles = `
  .signature-line { font-size: 16px; line-height: 1.5; margin: 10px 0; }
  .signature-img {
    height: 1.15em;
    max-width: 10rem;
    vertical-align: baseline;
    object-fit: contain;
    display: inline;
    margin-left: 0.15rem;
  }
`;
