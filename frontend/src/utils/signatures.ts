export function isSignatureDataUrl(value?: string | null): boolean {
  return Boolean(
    value &&
      /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(value),
  );
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function signaturePrintHtml(
  value?: string | null,
  label = "Signature",
): string {
  const raw = value ?? "";
  const safeLabel = escapeHtml(label);

  if (isSignatureDataUrl(raw)) {
    return (
      `<p class="signature-line"><strong>${safeLabel}:</strong> `
      + `<img src="${raw}" alt="${safeLabel}" class="signature-img" /></p>`
    );
  }

  const display = raw.trim() || "................................................................";
  return `<p class="signature-line"><strong>${safeLabel}:</strong> ${escapeHtml(display)}</p>`;
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
