import express from "express";
import WorkOrderModel from "../models/workOrder.js";
import StudentReportModel from "../models/studentReport.js";
import AnonymousReportModel from "../models/anonymousReport.js";
import UserModel from "../models/user.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { createNotification } from "../utils/notifications.js";

const router = express.Router();
const WORK_ORDER_ROLES = [
  "admin",
  "dean_of_students",
  "assistant_dean",
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
    assistant_dean: "Assistant Dean, Student Affairs",
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
      message: `A maintenance work order has been created for "${report.title}".`,
      link: "/my-reports",
    });

    res.status(201).json(mapWorkOrder(workOrder));
  } catch (err) {
    console.error("Create work order error:", err);
    res
      .status(err.status || 500)
      .json({ error: err.message || "Failed to create work order" });
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

    workOrder.status = status;
    if (assignedTo !== undefined) workOrder.assigned_to = assignedTo;
    if (signatures && typeof signatures === "object") {
      workOrder.signatures = {
        partC: String(signatures.partC || ""),
        partD: String(signatures.partD || ""),
        partE: String(signatures.partE || ""),
      };
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
