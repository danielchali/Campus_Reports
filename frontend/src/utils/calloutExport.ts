import { API_BASE_URL } from "../config/constants";
import { authHeaders } from "./api";
import { signaturePrintHtml, signaturePrintStyles } from "./signatures";

export type CalloutPerson = {
  fullName?: string;
  name?: string;
  sex?: string;
  age?: string;
  sin?: string;
  programOfStudy?: string;
  program?: string;
  yearOfStudy?: string;
  residentialAddress?: string;
  phoneNo?: string;
};

export type CalloutSummon = {
  reportTime?: string;
  reportDate?: string;
  appointment?: string;
  officerSignature?: string;
  studentSignatures?: Record<string, string>;
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function personName(person: CalloutPerson) {
  return person.fullName || person.name || "................................................................";
}

function buildCalloutCardHtml(
  person: CalloutPerson,
  summon: CalloutSummon,
  index: number,
  logoUrl: string,
) {
  const reportTime = summon.reportTime || "....................";
  const reportDate = summon.reportDate || "....................";
  const appointment =
    summon.appointment || "........................................................";
  const studentSignature = summon.studentSignatures?.[String(index)] || "";

  return (
    `<div class="callout-card">`
    + `<div class="logo"><img src="${logoUrl}" alt="KMU Logo"/></div>`
    + `<div class="title">KAPASA MAKASA UNIVERSITY</div>`
    + `<div class="subtitle">SECURITY DEPARTMENT</div>`
    + `<div class="callout">CALL OUT</div>`
    + `<p><strong>Full Names:</strong> ${escapeHtml(personName(person))}</p>`
    + `<p><strong>Sex:</strong> ${escapeHtml(person.sex || "....................")} &nbsp;&nbsp;&nbsp; <strong>Age:</strong> ${escapeHtml(person.age || "....................")} &nbsp;&nbsp;&nbsp; <strong>SIN:</strong> ${escapeHtml(person.sin || "........................................")}</p>`
    + `<p><strong>Program of study:</strong> ${escapeHtml(person.programOfStudy || person.program || "........................................................")} &nbsp;&nbsp;&nbsp; <strong>Year of study:</strong> ${escapeHtml(person.yearOfStudy || "....................")}</p>`
    + `<p><strong>Residential Address:</strong> ${escapeHtml(person.residentialAddress || "........................................................")} &nbsp;&nbsp;&nbsp; <strong>Phone No:</strong> ${escapeHtml(person.phoneNo || "........................................")}</p>`
    + `<p>You are required to report to the Security Officer's office at <strong>${escapeHtml(reportTime)}</strong> hours (Time)<br/>on <strong>${escapeHtml(reportDate)}</strong> (Day & Date) without fail.</p>`
    + `<p><strong>Appointment:</strong> ${escapeHtml(appointment)}</p>`
    + signaturePrintHtml(summon.officerSignature, "Officer Signature")
    + signaturePrintHtml(studentSignature, "Student Signature")
    + `</div>`
  );
}

function buildCalloutDocumentHtml(cardsHtml: string) {
  return `<!DOCTYPE html><html><head><title>Call Out</title><style>
    body{font-family:Arial,sans-serif;padding:16px;background:#fff;margin:0;}
    .callout-card{max-width:800px;margin:0 auto;border:2px solid #111;padding:24px 28px;}
    .logo{text-align:center;margin-bottom:10px;}
    .logo img{height:64px;}
    .title,.subtitle,.callout{text-align:center;font-weight:700;}
    .title{font-size:22px;letter-spacing:.4px;}
    .subtitle{font-size:18px;margin-top:2px;}
    .callout{font-size:22px;margin:10px 0 18px;}
    p{font-size:16px;line-height:1.5;margin:10px 0;}
    ${signaturePrintStyles}
    .page-break{page-break-before:always;margin-top:20px;}
    @media print { body{padding:0;} .callout-card{border:2px solid #000;} }
  </style></head><body>${cardsHtml}</body></html>`;
}

export function printCallouts(
  accused: CalloutPerson[],
  summon: CalloutSummon,
  options?: { onlyIndex?: number },
) {
  if (!accused.length) {
    throw new Error("No accused persons found for callout printing.");
  }

  const logoUrl = `${window.location.origin}/kmu_logo.svg`;
  const indices =
    options?.onlyIndex !== undefined ? [options.onlyIndex] : accused.map((_, i) => i);

  const cardsHtml = indices
    .map((index) => {
      const person = accused[index];
      if (!person) return "";
      return buildCalloutCardHtml(person, summon, index, logoUrl);
    })
    .filter(Boolean)
    .join('<div class="page-break"></div>');

  const html = buildCalloutDocumentHtml(cardsHtml);
  const printWindow = window.open("", "_blank", "width=1000,height=900");
  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups to print callouts.");
  }

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export async function exportCalloutDocx(
  accused: CalloutPerson[],
  summon: CalloutSummon,
  options?: { onlyIndex?: number; filename?: string },
) {
  if (!accused.length) {
    throw new Error("No accused persons found for callout export.");
  }

  const indices =
    options?.onlyIndex !== undefined ? [options.onlyIndex] : accused.map((_, i) => i);

  const callouts = indices.map((index) => ({
    person: accused[index],
    summon,
    index,
    studentSignature: summon.studentSignatures?.[String(index)] || "",
  }));

  const res = await fetch(`${API_BASE_URL}/cases/export-callout-docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ callouts }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to export callout DOCX");
  }

  const blob = await res.blob();
  downloadBlob(blob, options?.filename || "callouts.docx");
}

export async function exportCaseCalloutDocx(caseId: string, filename?: string) {
  const res = await fetch(`${API_BASE_URL}/cases/${caseId}/export-callout-docx`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to export callout DOCX");
  }

  const blob = await res.blob();
  downloadBlob(blob, filename || "callout.docx");
}
