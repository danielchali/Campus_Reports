export function isSignatureDataUrl(value?: string | null): value is string {
  return Boolean(value && value.startsWith("data:image/"));
}

export function signaturePrintHtml(
  value?: string | null,
  label = "Signature",
): string {
  if (isSignatureDataUrl(value)) {
    return (
      `<p><strong>${label}:</strong></p>`
      + `<img src="${value}" alt="${label}" style="height:64px;max-width:280px;object-fit:contain;display:block;margin-top:4px;" />`
    );
  }

  const display = value?.trim() || "................................................................";
  return `<p><strong>${label}:</strong> ${display}</p>`;
}
