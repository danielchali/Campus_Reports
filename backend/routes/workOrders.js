import express from "express";
import WorkOrderModel from "../models/workOrder.js";
import StudentReportModel from "../models/studentReport.js";
import AnonymousReportModel from "../models/anonymousReport.js";
import UserModel from "../models/user.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { createNotification } from "../utils/notifications.js";
import { emitDashboardRefresh } from "../utils/socket.js";
import { AlignmentType, BorderStyle, Document, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { kmuLogoParagraph, loadKmuLogo, parseSignatureBuffer } from "../utils/docxExport.js";
import PDFDocument from "pdfkit";

const router = express.Router();
const WORK_ORDER_ROLES = [
  "admin",
  "dean_of_students",
  "warden",
  "secretary",
  "registrar",
  "maintenance",
];
const WORK_ORDER_STATUSES = [
  "Open",
  "Assigned",
  "In Progress",
  "Completed",
  "Cancelled",
];

const PART_EDIT_ROLES = {
  partA: [
    "admin",
    "secretary",
    "registrar",
    "dean_of_students",
    "warden",
    "chief_security_officer",
  ],
  partB: ["admin", "maintenance"],
  partC: [
    "admin",
    "secretary",
    "registrar",
    "dean_of_students",
    "warden",
    "chief_security_officer",
  ],
  partD: [
    "admin",
    "secretary",
    "registrar",
    "dean_of_students",
    "warden",
    "chief_security_officer",
  ],
  partE: ["admin", "maintenance"],
};

function canEditWorkOrderPart(role, part) {
  if (!role) return false;
  if (role === "admin") return true;
  return PART_EDIT_ROLES[part]?.includes(role) || false;
}

function mapJobCard(obj = {}) {
  const notes = Array.isArray(obj.part_b_notes) ? obj.part_b_notes : ["", ""];
  return {
    partBNotes: [String(notes[0] || ""), String(notes[1] || "")],
    partCApprovedBy: obj.part_c_approved_by || "",
    partCDate: obj.part_c_date || "",
    partDName: obj.part_d_name || "",
    partDDate: obj.part_d_date || "",
    partEName: obj.part_e_name || "",
    partEDate: obj.part_e_date || "",
    partEWorkDone: obj.part_e_work_done || "",
  };
}

function generateWorkOrderId() {
  return `WO-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
}

function mapWorkOrder(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(obj._id),
    workOrderId: obj.work_order_id,
    sourceReportId: obj.source_report_id,
    sourceTrackingCode: obj.source_tracking_code,
    title: obj.title,
    description: obj.description,
    location: obj.location,
    issueType: obj.issue_type,
    priority: obj.priority,
    affectedAsset: obj.affected_asset,
    accessInstructions: obj.access_instructions,
    status: obj.status,
    assignedTo: obj.assigned_to,
    requestedByName: obj.requested_by_name || obj.created_by || "",
    requestingDepartment: obj.requesting_department || "",
    createdBy: obj.created_by,
    createdByRole: obj.created_by_role,
    attachments: obj.attachments || [],
    signatures: {
      partC: obj.signatures?.partC || "",
      partD: obj.signatures?.partD || "",
      partE: obj.signatures?.partE || "",
    },
    jobCard: mapJobCard(obj.job_card),
    updates: (obj.updates || []).map((update) => ({
      id: String(update._id),
      status: update.status,
      message: update.message,
      createdBy: update.createdBy || "",
      createdByRole: update.createdByRole || "",
      createdAt: update.createdAt?.toISOString?.() || update.createdAt,
    })),
    createdAt: obj.createdAt?.toISOString?.() || obj.createdAt,
    updatedAt: obj.updatedAt?.toISOString?.() || obj.updatedAt,
  };
}

function mapMaintenanceIssue(doc, source) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const details = obj.details || {};
  return {
    id: String(obj._id),
    source,
    trackingCode: obj.tracking_code,
    title: obj.title,
    description: obj.description,
    location: obj.location,
    incidentDate: obj.incident_date,
    submittedAt: obj.createdAt?.toISOString?.() || obj.createdAt,
    status: obj.status,
    issueType: details.issueType || "Other",
    priority: details.priority || "Normal",
    affectedAsset: details.affectedAsset || "",
    accessInstructions: details.accessInstructions || "",
    maintenanceWorkOrderId: obj.maintenance_work_order_id || "",
    routedToMaintenance: !!obj.routed_to_maintenance,
    canCreateWorkOrder:
      source === "student_report" && !obj.maintenance_work_order_id,
  };
}

function getDepartmentForRole(role = "") {
  const departmentByRole = {
    dean_of_students: "Dean of Students",
    warden: "Warden, Student Affairs",
    registrar: "Registrar",
    secretary: "Registrar",
    maintenance: "Maintenance Department",
    admin: "Administration",
  };
  return (
    departmentByRole[role] || role.replace(/_/g, " ") || "Requesting Department"
  );
}

async function getRequesterInfo(user = {}) {
  let displayName = user.name || user.username || "System";
  if (user.id) {
    try {
      const dbUser = await UserModel.findById(user.id, "name username role");
      if (dbUser) {
        displayName = dbUser.name || dbUser.username || displayName;
      }
    } catch (err) {
      console.warn(
        "Unable to resolve work order requester profile:",
        err.message,
      );
    }
  }

  return {
    requestedByName: displayName,
    requestingDepartment: getDepartmentForRole(user.role),
  };
}

function normalizeManualWorkOrderPayload(body = {}) {
  return {
    title: String(body.title || "").trim(),
    description: String(body.description || "").trim(),
    location: String(body.location || "").trim(),
    issueType: String(body.issueType || body.issue_type || "Other").trim(),
    priority: String(body.priority || "Normal").trim(),
    affectedAsset: String(
      body.affectedAsset || body.affected_asset || "",
    ).trim(),
    accessInstructions: String(
      body.accessInstructions || body.access_instructions || "",
    ).trim(),
    assignedTo: String(body.assignedTo || body.assigned_to || "").trim(),
    requestedByName: String(
      body.requestedByName || body.requested_by_name || "",
    ).trim(),
    requestingDepartment: String(
      body.requestingDepartment || body.requesting_department || "",
    ).trim(),
    message: String(
      body.message || "Manual maintenance issue and work order created.",
    ).trim(),
  };
}

async function createManualWorkOrder(payload, user) {
  const normalized = normalizeManualWorkOrderPayload(payload);
  const errors = [];
  if (!normalized.title) errors.push("Title is required");
  if (!normalized.description) errors.push("Description is required");
  if (!normalized.location) errors.push("Location is required");
  if (
    !["Low", "Normal", "High", "Urgent safety risk"].includes(
      normalized.priority,
    )
  ) {
    errors.push("Invalid priority");
  }
  if (errors.length > 0) {
    const error = new Error(errors[0]);
    error.status = 400;
    throw error;
  }

  const requesterInfo = await getRequesterInfo(user);
  const workOrderId = generateWorkOrderId();
  return WorkOrderModel.create({
    work_order_id: workOrderId,
    source_report_id: `manual:${workOrderId}`,
    source_tracking_code: "Manual maintenance issue",
    title: normalized.title,
    description: normalized.description,
    location: normalized.location,
    issue_type: normalized.issueType || "Other",
    priority: normalized.priority || "Normal",
    affected_asset: normalized.affectedAsset,
    access_instructions: normalized.accessInstructions,
    status: normalized.assignedTo ? "Assigned" : "Open",
    assigned_to: normalized.assignedTo,
    requested_by_name:
      normalized.requestedByName || requesterInfo.requestedByName,
    requesting_department:
      normalized.requestingDepartment || requesterInfo.requestingDepartment,
    created_by: user.username || user.name || "system",
    created_by_role: user.role || "system",
    attachments: [],
    updates: [
      {
        status: normalized.assignedTo ? "Assigned" : "Open",
        message:
          normalized.message ||
          "Manual maintenance issue and work order created.",
        createdBy: user.username || user.name || "system",
        createdByRole: user.role || "system",
      },
    ],
  });
}

async function createWorkOrderFromReport(
  report,
  user,
  message = "Work order created from maintenance issue.",
) {
  if (report.category !== "maintenance_issue") {
    const error = new Error("Only maintenance issues can become work orders.");
    error.status = 400;
    throw error;
  }

  const existing = await WorkOrderModel.findOne({
    source_report_id: String(report._id),
  });
  if (existing) return existing;

  const details = report.details || {};
  const requesterInfo = await getRequesterInfo(user);
  const workOrder = await WorkOrderModel.create({
    work_order_id: generateWorkOrderId(),
    source_report_id: String(report._id),
    source_tracking_code: report.tracking_code,
    title: report.title,
    description: report.description,
    location: report.location,
    issue_type: details.issueType || "Other",
    priority: details.priority || "Normal",
    affected_asset: details.affectedAsset || "",
    access_instructions: details.accessInstructions || "",
    status: "Open",
    requested_by_name: requesterInfo.requestedByName,
    requesting_department: requesterInfo.requestingDepartment,
    created_by: user.username || user.name || "system",
    created_by_role: user.role || "system",
    attachments: report.attachments || [],
    updates: [
      {
        status: "Open",
        message,
        createdBy: user.username || user.name || "system",
        createdByRole: user.role || "system",
      },
    ],
  });

  report.routed_to_maintenance = true;
  report.routed_by_role = user.role || report.routed_by_role || "";
  report.maintenance_work_order_id = workOrder.work_order_id;
  if (report.status !== "In Progress" && report.status !== "Resolved") {
    report.status = "In Progress";
    report.updates.unshift({
      status: "In Progress",
      message: `${message} Maintenance work order ${workOrder.work_order_id} is now open.`,
      createdBy: user.username || user.name || "system",
      createdByRole: user.role || "system",
    });
  }
  report.updatedAt = new Date();
  await report.save();

  return workOrder;
}

router.use(authenticate, authorize(WORK_ORDER_ROLES));

router.get("/maintenance-issues", async (req, res) => {
  try {
    const { search, status, source } = req.query;
    const buildSearch = () => {
      if (!search) return {};
      const regex = { $regex: search, $options: "i" };
      return {
        $or: [
          { tracking_code: regex },
          { title: regex },
          { description: regex },
          { location: regex },
        ],
      };
    };

    const statusFilter = status ? { status } : {};
    const searchFilter = buildSearch();
    const studentQuery = {
      category: "maintenance_issue",
      ...statusFilter,
      ...searchFilter,
    };
    const anonymousQuery = {
      category: "maintenance_issue",
      ...statusFilter,
      ...searchFilter,
    };

    const [studentIssues, anonymousIssues] = await Promise.all([
      source === "anonymous"
        ? []
        : StudentReportModel.find(studentQuery).sort({ createdAt: -1 }),
      source === "student_report"
        ? []
        : AnonymousReportModel.find(anonymousQuery).sort({ createdAt: -1 }),
    ]);

    const issues = [
      ...studentIssues.map((issue) =>
        mapMaintenanceIssue(issue, "student_report"),
      ),
      ...anonymousIssues.map((issue) =>
        mapMaintenanceIssue(issue, "anonymous_report"),
      ),
    ].sort(
      (a, b) =>
        new Date(b.submittedAt || 0).getTime() -
        new Date(a.submittedAt || 0).getTime(),
    );

    res.json(issues);
  } catch (err) {
    console.error("Fetch maintenance issues error:", err);
    res.status(500).json({ error: "Failed to fetch maintenance issues" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { search, status, priority } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { work_order_id: regex },
        { source_tracking_code: regex },
        { title: regex },
        { description: regex },
        { location: regex },
        { issue_type: regex },
        { affected_asset: regex },
      ];
    }

    const workOrders = await WorkOrderModel.find(query).sort({ createdAt: -1 });
    res.json(workOrders.map(mapWorkOrder));
  } catch (err) {
    console.error("Fetch work orders error:", err);
    res.status(500).json({ error: "Failed to fetch work orders" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { reportId, message } = req.body;
    if (!reportId) {
      const workOrder = await createManualWorkOrder(req.body, req.user);
      emitDashboardRefresh("work-orders");
      return res.status(201).json(mapWorkOrder(workOrder));
    }

    const report = await StudentReportModel.findById(reportId);
    if (!report)
      return res.status(404).json({ error: "Maintenance issue not found" });

    const workOrder = await createWorkOrderFromReport(
      report,
      req.user,
      message || "Work order created from maintenance issue.",
    );
    await createNotification({
      userId: report.owner_id,
      type: "report_update",
      message: "Your report has been sent to maintenance.",
      link: "/my-reports",
    });

    emitDashboardRefresh("work-orders");
    emitDashboardRefresh("student-reports");
    res.status(201).json(mapWorkOrder(workOrder));
  } catch (err) {
    console.error("Create work order error:", err);
    res
      .status(err.status || 500)
      .json({ error: err.message || "Failed to create work order" });
  }
});


function exportSections(obj) {
  return [
    { title: "Part A — To be completed by tenant or requesting department", layout: "partA", fields: [
      ["Department", obj.requestingDepartment], ["Name", obj.requestedByName || obj.createdBy],
      ["Address / Location", obj.location], ["Date", obj.createdAt ? new Date(obj.createdAt).toLocaleDateString() : ""],
      ["Title", obj.title], ["Issue type", obj.issueType], ["Priority", obj.priority],
      ["Affected asset", obj.affectedAsset], ["Nature of complaint / request", obj.description],
      ["Access instructions", obj.accessInstructions],
    ] },
    { title: "Part B — Artisan's inspection report", layout: "stack", fields: [
      ["Inspection note 1", obj.jobCard.partBNotes[0]], ["Inspection note 2", obj.jobCard.partBNotes[1]],
    ] },
    { title: "Part C — Section supervisor approval", layout: "approval", fields: [
      ["Approved by", obj.jobCard.partCApprovedBy], ["Date", obj.jobCard.partCDate], ["Part C Signature", obj.signatures?.partC],
    ] },
    { title: "Part D — Completion of job", layout: "approval", fields: [
      ["Name", obj.jobCard.partDName], ["Date", obj.jobCard.partDDate], ["Part D Signature", obj.signatures?.partD],
    ] },
    { title: "Part E — Completed report (maintenance officer / foreman)", layout: "partE", fields: [
      ["Work done", obj.jobCard.partEWorkDone], ["Name", obj.jobCard.partEName], ["Date", obj.jobCard.partEDate], ["Part E Signature", obj.signatures?.partE],
    ] },
    { title: "Work order handling", layout: "handling", fields: [["Status", obj.status], ["Assigned to", obj.assignedTo]] },
  ];
}

function fieldChildren(label, value) {
  const signature = label.includes("Signature") ? parseSignatureBuffer(value) : null;
  return [
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: label, bold: true, size: 18, color: "475569" })],
    }),
      signature
      ? new Paragraph({ children: [new ImageRun({ data: signature.buffer, type: signature.type, transformation: { width: 110, height: 28 } })] })
      : new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: String(value || ""), size: 20 })] }),
  ];
}

function docxGridSection(section) {
  const rows = [new TableRow({ children: [new TableCell({ columnSpan: 2, children: [new Paragraph({ children: [new TextRun({ text: section.title, bold: true, size: 20, color: "087F4E" })] })] })] })];
  const fields = section.fields;
  const full = (field) => section.layout === "stack" || field[0].includes("Nature") || field[0].includes("Access") || field[0].includes("Work done") || field[0].includes("Signature");
  for (let i = 0; i < fields.length;) {
    if (full(fields[i])) {
      rows.push(new TableRow({ children: [new TableCell({ columnSpan: 2, children: fieldChildren(...fields[i]) })] }));
      i += 1;
    } else {
      rows.push(new TableRow({ children: [
        new TableCell({ children: fieldChildren(...fields[i]) }),
        new TableCell({ children: fields[i + 1] ? fieldChildren(...fields[i + 1]) : [] }),
      ] }));
      i += 2;
    }
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" }, bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" }, left: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" }, right: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" } }, rows });
}

function writePdfField(doc, label, value, x, y, width) {
  const signature = label.includes("Signature") ? parseSignatureBuffer(value) : null;
  doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8).text(label, x, y, { width });
  if (signature) doc.image(signature.buffer, x, y + 12, { fit: [110, 28] });
  else doc.fillColor("#1e293b").font("Helvetica").fontSize(9).text(String(value || ""), x, y + 12, { width });
  return signature ? 46 : 30;
}

function writePdfSection(doc, section) {
  doc.moveDown(0.55);
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  doc.roundedRect(left, doc.y, width, 22, 5).fill("#e8f5ef");
  doc.fillColor("#087f4e").fontSize(10).font("Helvetica-Bold").text(section.title, left + 9, doc.y + 6, { width: width - 18 });
  doc.y += 31;
  for (let i = 0; i < section.fields.length;) {
    const field = section.fields[i];
    const full = section.layout === "stack" || field[0].includes("Nature") || field[0].includes("Access") || field[0].includes("Work done") || field[0].includes("Signature");
    if (full) {
      doc.y += writePdfField(doc, ...field, left + 10, doc.y, width - 20);
      i += 1;
    } else {
      const height = Math.max(writePdfField(doc, ...field, left + 10, doc.y, width / 2 - 20), field[1] ? writePdfField(doc, ...(section.fields[i + 1] || ["", ""]), left + width / 2 + 10, doc.y, width / 2 - 20) : 0);
      doc.y += height;
      i += 2;
    }
  }
}

router.get("/:id/export-docx", async (req, res) => {
  try {
    const workOrder = await WorkOrderModel.findById(req.params.id);
    if (!workOrder) return res.status(404).json({ error: "Work order not found" });

    const obj = mapWorkOrder(workOrder);

    const docChildren = [kmuLogoParagraph()];

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "KAPASA MAKASA UNIVERSITY",
            bold: true,
            size: 30,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Maintenance Request & Job Card - ${obj.workOrderId}`,
            bold: true,
          }),
        ],
      }),
    );

    exportSections(obj).forEach((section) => {
      docChildren.push(docxGridSection(section));
    });

    const doc = new Document({
      sections: [{
        children: docChildren,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename=${obj.workOrderId}.docx`);
    res.send(buffer);
  } catch (err) {
    console.error("Export work order DOCX error:", err);
    res.status(500).json({ error: "Failed to export work order" });
  }
});

router.get("/:id/export-pdf", async (req, res) => {
  try {
    const workOrder = await WorkOrderModel.findById(req.params.id);
    if (!workOrder) return res.status(404).json({ error: "Work order not found" });

    const obj = mapWorkOrder(workOrder);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${obj.workOrderId}.pdf`);

    const doc = new PDFDocument({ size: "A4", margin: 42 });
    doc.pipe(res);
    const logo = loadKmuLogo();
    if (logo) {
      doc.image(logo.buffer, { fit: [72, 72], align: "center" });
      doc.moveDown(0.3);
    }
    doc.fillColor("#087f4e").font("Helvetica-Bold").fontSize(17).text("KAPASA MAKASA UNIVERSITY", { align: "center" });
    doc.moveDown(0.3).fillColor("#1e293b").fontSize(13).text("Maintenance Request & Job Card", { align: "center" });
    doc.fontSize(10).text(`No. ${obj.workOrderId}`, { align: "center" });
    doc.moveDown(0.8).strokeColor("#cbd5e1").moveTo(42, doc.y).lineTo(553, doc.y).stroke();
    exportSections(obj).forEach((section) => writePdfSection(doc, section));
    doc.end();
  } catch (err) {
    console.error("Export work order PDF error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to export work order" });
  }
});

router.patch("/:id/job-card", async (req, res) => {
  try {
    const {
      partA,
      jobCard,
      signatures,
      status,
      message,
      assignedTo,
    } = req.body;
    const role = req.user?.role || "";

    const workOrder = await WorkOrderModel.findById(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ error: "Work order not found" });
    }

    if (partA && canEditWorkOrderPart(role, "partA")) {
      if (partA.requestingDepartment !== undefined) {
        workOrder.requesting_department = String(partA.requestingDepartment || "");
      }
      if (partA.requestedByName !== undefined) {
        workOrder.requested_by_name = String(partA.requestedByName || "");
      }
      if (partA.location !== undefined) {
        workOrder.location = String(partA.location || "");
      }
      if (partA.description !== undefined) {
        workOrder.description = String(partA.description || "");
      }
      if (partA.affectedAsset !== undefined) {
        workOrder.affected_asset = String(partA.affectedAsset || "");
      }
      if (partA.title !== undefined) {
        workOrder.title = String(partA.title || "");
      }
      if (partA.issueType !== undefined) {
        workOrder.issue_type = String(partA.issueType || "");
      }
      if (partA.priority !== undefined) {
        workOrder.priority = String(partA.priority || workOrder.priority);
      }
      if (partA.accessInstructions !== undefined) {
        workOrder.access_instructions = String(partA.accessInstructions || "");
      }
    }

    if (jobCard && canEditWorkOrderPart(role, "partB")) {
      workOrder.job_card = workOrder.job_card || {};
      if (Array.isArray(jobCard.partBNotes)) {
        workOrder.job_card.part_b_notes = [
          String(jobCard.partBNotes[0] || ""),
          String(jobCard.partBNotes[1] || ""),
        ];
      }
    }

    if (jobCard && canEditWorkOrderPart(role, "partC")) {
      workOrder.job_card = workOrder.job_card || {};
      if (jobCard.partCApprovedBy !== undefined) {
        workOrder.job_card.part_c_approved_by = String(jobCard.partCApprovedBy || "");
      }
      if (jobCard.partCDate !== undefined) {
        workOrder.job_card.part_c_date = String(jobCard.partCDate || "");
      }
    }

    if (jobCard && canEditWorkOrderPart(role, "partD")) {
      workOrder.job_card = workOrder.job_card || {};
      if (jobCard.partDName !== undefined) {
        workOrder.job_card.part_d_name = String(jobCard.partDName || "");
      }
      if (jobCard.partDDate !== undefined) {
        workOrder.job_card.part_d_date = String(jobCard.partDDate || "");
      }
    }

    if (jobCard && canEditWorkOrderPart(role, "partE")) {
      workOrder.job_card = workOrder.job_card || {};
      if (jobCard.partEName !== undefined) {
        workOrder.job_card.part_e_name = String(jobCard.partEName || "");
      }
      if (jobCard.partEDate !== undefined) {
        workOrder.job_card.part_e_date = String(jobCard.partEDate || "");
      }
      if (jobCard.partEWorkDone !== undefined) {
        workOrder.job_card.part_e_work_done = String(jobCard.partEWorkDone || "");
      }
    }

    if (signatures && typeof signatures === "object") {
      const nextSignatures = {
        partC: workOrder.signatures?.partC || "",
        partD: workOrder.signatures?.partD || "",
        partE: workOrder.signatures?.partE || "",
      };

      if (signatures.partC !== undefined) {
        if (!canEditWorkOrderPart(role, "partC")) {
          return res.status(403).json({ error: "Not authorised to sign Part C." });
        }
        nextSignatures.partC = String(signatures.partC || "");
      }
      if (signatures.partD !== undefined) {
        if (!canEditWorkOrderPart(role, "partD")) {
          return res.status(403).json({ error: "Not authorised to sign Part D." });
        }
        nextSignatures.partD = String(signatures.partD || "");
      }
      if (signatures.partE !== undefined) {
        if (!canEditWorkOrderPart(role, "partE")) {
          return res.status(403).json({ error: "Not authorised to sign Part E." });
        }
        nextSignatures.partE = String(signatures.partE || "");
      }

      workOrder.signatures = nextSignatures;
    }

    if (status && WORK_ORDER_STATUSES.includes(status)) {
      workOrder.status = status;
      workOrder.updates.unshift({
        status,
        message: message?.trim() || `Work order updated to ${status}.`,
        createdBy: req.user.username || req.user.name,
        createdByRole: role,
      });
    } else if (message?.trim()) {
      workOrder.updates.unshift({
        status: workOrder.status,
        message: message.trim(),
        createdBy: req.user.username || req.user.name,
        createdByRole: role,
      });
    }

    if (assignedTo !== undefined) {
      workOrder.assigned_to = String(assignedTo || "");
    }

    workOrder.updatedAt = new Date();
    await workOrder.save();

    res.json(mapWorkOrder(workOrder));
  } catch (err) {
    console.error("Update work order job card error:", err);
    res.status(500).json({ error: "Failed to update work order job card" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { status, message, assignedTo, signatures } = req.body;
    if (!WORK_ORDER_STATUSES.includes(status))
      return res.status(400).json({ error: "Invalid work order status" });

    const workOrder = await WorkOrderModel.findById(req.params.id);
    if (!workOrder)
      return res.status(404).json({ error: "Work order not found" });

    const role = req.user?.role || "";
    workOrder.status = status;
    if (assignedTo !== undefined) workOrder.assigned_to = assignedTo;
    if (signatures && typeof signatures === "object") {
      const nextSignatures = {
        partC: workOrder.signatures?.partC || "",
        partD: workOrder.signatures?.partD || "",
        partE: workOrder.signatures?.partE || "",
      };
      if (signatures.partC !== undefined) {
        if (!canEditWorkOrderPart(role, "partC")) {
          return res.status(403).json({ error: "Not authorised to sign Part C." });
        }
        nextSignatures.partC = String(signatures.partC || "");
      }
      if (signatures.partD !== undefined) {
        if (!canEditWorkOrderPart(role, "partD")) {
          return res.status(403).json({ error: "Not authorised to sign Part D." });
        }
        nextSignatures.partD = String(signatures.partD || "");
      }
      if (signatures.partE !== undefined) {
        if (!canEditWorkOrderPart(role, "partE")) {
          return res.status(403).json({ error: "Not authorised to sign Part E." });
        }
        nextSignatures.partE = String(signatures.partE || "");
      }
      workOrder.signatures = nextSignatures;
    }
    workOrder.updates.unshift({
      status,
      message: message?.trim() || `Work order updated to ${status}.`,
      createdBy: req.user.username || req.user.name,
      createdByRole: req.user.role,
    });
    workOrder.updatedAt = new Date();
    await workOrder.save();

    const hasSourceReport = /^[a-fA-F0-9]{24}$/.test(
      String(workOrder.source_report_id || ""),
    );
    if (hasSourceReport) {
      const reportStatus = status === "Completed" ? "Resolved" : "In Progress";
      await StudentReportModel.findByIdAndUpdate(workOrder.source_report_id, {
        status: reportStatus,
        updatedAt: new Date(),
        $push: {
          updates: {
            $each: [
              {
                status: reportStatus,
                message: `Maintenance work order ${workOrder.work_order_id} is ${status}.`,
                createdBy: req.user.username || req.user.name,
                createdByRole: req.user.role,
              },
            ],
            $position: 0,
          },
        },
      });
    }

    res.json(mapWorkOrder(workOrder));
  } catch (err) {
    console.error("Update work order status error:", err);
    res.status(500).json({ error: "Failed to update work order" });
  }
});

export { createWorkOrderFromReport };
export default router;
