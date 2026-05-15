import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import StudentReportModel from "../models/studentReport.js";
import StudentModel from "../models/student.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { createNotification } from "../utils/notifications.js";
import { getUploadDirectory } from "../utils/uploadPaths.js";

const router = express.Router();
const REPORT_ATTACHMENT_DIR = getUploadDirectory("student-reports");
const REPORT_CATEGORIES = ["disciplinary_case", "maintenance_issue"];
const CATEGORY_LABELS = {
  disciplinary_case: "Disciplinary Case",
  maintenance_issue: "Maintenance Issue",
};

const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, REPORT_ATTACHMENT_DIR);
    },
    filename: function (_req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const safeOriginalName = file.originalname.replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      );
      cb(null, `${uniqueSuffix}-${safeOriginalName}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
});

// Generate tracking code
function generateTrackingCode() {
  return `KMU-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
}

// Helper: map DB doc to frontend shape
function mapReport(doc, ownerNameOverride = "") {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(obj._id),
    trackingCode: obj.tracking_code,
    title: obj.title,
    description: obj.description,
    category: obj.category,
    anonymous: obj.anonymous,
    location: obj.location,
    incidentDate: obj.incident_date,
    submittedAt: obj.createdAt?.toISOString?.() || obj.createdAt,
    status: obj.status,
    ownerId: obj.owner_id,
    ownerUsername: obj.owner_username,
    ownerName: ownerNameOverride || obj.owner_name,
    ownerRole: obj.owner_role,
    studentInvolved: !!obj.student_involved,
    routedToMaintenance: !!obj.routed_to_maintenance,
    routedByRole: obj.routed_by_role || "",
    maintenanceWorkOrderId: obj.maintenance_work_order_id || "",
    seenBy: obj.seen_by || [],
    details: obj.details || {},
    attachments: (obj.attachments || []).map((attachment) => ({
      id: String(attachment._id),
      originalName: attachment.originalName,
      filename: attachment.filename,
      mimeType: attachment.mimeType || "",
      size: attachment.size || 0,
      uploadedAt:
        attachment.uploadedAt?.toISOString?.() || attachment.uploadedAt,
    })),
    updates: (obj.updates || []).map((u) => ({
      id: String(u._id),
      status: u.status,
      message: u.message,
      createdByRole: u.createdByRole || "",
      createdAt: u.createdAt?.toISOString?.() || u.createdAt,
    })),
  };
}

function getStudentFullName(student) {
  const obj = student?.toObject
    ? student.toObject({ virtuals: true })
    : student;
  return String(
    obj?.fullName ||
      [obj?.personalInfo?.firstName, obj?.personalInfo?.surName]
        .filter(Boolean)
        .join(" "),
  ).trim();
}

async function getStudentDisplayNameByUsername(username) {
  const studentId = String(username || "").trim();
  if (!studentId) return "";
  const student = await StudentModel.findOne({ studentId });
  return getStudentFullName(student);
}

async function mapReportsWithStudentNames(reports) {
  const studentIds = [
    ...new Set(
      reports
        .filter((report) => report.owner_role === "student")
        .map((report) => report.owner_username)
        .filter(Boolean),
    ),
  ];

  if (studentIds.length === 0) {
    return reports.map((report) => mapReport(report));
  }

  const students = await StudentModel.find({ studentId: { $in: studentIds } });
  const studentNames = new Map(
    students
      .map((student) => [student.studentId, getStudentFullName(student)])
      .filter(([, fullName]) => fullName),
  );

  return reports.map((report) =>
    mapReport(report, studentNames.get(report.owner_username) || ""),
  );
}

function parseDetails(rawDetails) {
  if (!rawDetails) return {};
  if (typeof rawDetails === "object") return rawDetails;
  try {
    const parsed = JSON.parse(rawDetails);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function mapUploadedFiles(files = []) {
  return files.map((file) => ({
    originalName: file.originalname,
    filename: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
  }));
}

function canViewReport(user, report) {
  const userId = String(user.id || user._id);
  if (report.owner_id === userId || report.owner_username === user.username)
    return true;

  const role = user?.role;
  if (
    [
      "admin",
      "chief_security_officer",
      "assistant_dean",
      "security_officer",
    ].includes(role)
  ) {
    return true;
  }
  if (role === "dean_of_students") {
    return report.owner_role === "student" || !!report.student_involved;
  }
  if (["secretary", "registrar"].includes(role)) {
    return (
      report.owner_role === "general_user" &&
      (report.category === "maintenance_issue" || !report.student_involved)
    );
  }
  if (role === "maintenance") {
    return (
      report.category === "maintenance_issue" && !!report.routed_to_maintenance
    );
  }
  return false;
}

function getStaffReportScope(user) {
  const role = user?.role;
  if (role === "dean_of_students") {
    return { $or: [{ owner_role: "student" }, { student_involved: true }] };
  }
  if (["secretary", "registrar"].includes(role)) {
    return {
      $or: [
        { owner_role: "general_user", category: "maintenance_issue" },
        {
          owner_role: "general_user",
          category: "disciplinary_case",
          student_involved: false,
        },
      ],
    };
  }
  if (role === "maintenance") {
    return { category: "maintenance_issue", routed_to_maintenance: true };
  }
  return null;
}

function addSearchToScope(scopeQuery, search) {
  if (!search) return scopeQuery || {};
  const regex = { $regex: search, $options: "i" };
  const searchQuery = {
    $or: [
      { title: regex },
      { description: regex },
      { tracking_code: regex },
      { location: regex },
      { category: regex },
      { owner_name: regex },
      { owner_username: regex },
    ],
  };
  if (!scopeQuery || Object.keys(scopeQuery).length === 0) return searchQuery;
  return { $and: [scopeQuery, searchQuery] };
}

// POST / — Student creates a report
router.post(
  "/",
  authenticate,
  authorize(["student", "general_user"]),
  attachmentUpload.array("attachments", 5),
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        anonymous,
        location,
        incidentDate,
        studentInvolved,
      } = req.body;
      const details = parseDetails(req.body.details);
      const hasStudentInvolved =
        req.user.role === "student" ||
        details.studentInvolved === true ||
        details.studentInvolved === "true" ||
        studentInvolved === true ||
        studentInvolved === "true";

      if (!title || !description || !category || !location || !incidentDate) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (!REPORT_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: "Invalid report category" });
      }

      const ownerDisplayName =
        req.user.role === "student"
          ? await getStudentDisplayNameByUsername(req.user.username)
          : "";

      const report = await StudentReportModel.create({
        tracking_code: generateTrackingCode(),
        title: title.trim(),
        description: description.trim(),
        category,
        anonymous: anonymous === true || anonymous === "true",
        details,
        attachments: mapUploadedFiles(req.files),
        location: location.trim(),
        incident_date: incidentDate,
        status: "Submitted",
        owner_id: String(req.user.id || req.user._id),
        owner_username: req.user.username,
        owner_name: ownerDisplayName || req.user.name || req.user.username,
        owner_role: req.user.role,
        student_involved: hasStudentInvolved,
        seen_by: [],
        updates: [
          {
            status: "Submitted",
            message:
              "Your report has been received and is waiting for review by the appropriate office.",
            createdBy: req.user.username,
            createdByRole: req.user.role,
          },
        ],
      });

      res.status(201).json(mapReport(report));
    } catch (err) {
      console.error("Create student report error:", err);
      res.status(500).json({ error: "Failed to create report" });
    }
  },
);

// GET /mine — Student gets their own reports
router.get(
  "/mine",
  authenticate,
  authorize(["student", "general_user"]),
  async (req, res) => {
    try {
      const userId = String(req.user.id || req.user._id);
      const username = req.user.username;
      const search = req.query.search;

      const query = {
        $or: [{ owner_id: userId }, { owner_username: username }],
      };
      if (search) {
        const regex = { $regex: search, $options: "i" };
        query.$and = [
          { $or: [{ owner_id: userId }, { owner_username: username }] },
          {
            $or: [
              { title: regex },
              { description: regex },
              { tracking_code: regex },
              { location: regex },
              { category: regex },
            ],
          },
        ];
        delete query.$or;
      }

      const reports = await StudentReportModel.find(query).sort({
        createdAt: -1,
      });

      res.json(await mapReportsWithStudentNames(reports));
    } catch (err) {
      console.error("Fetch my reports error:", err);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  },
);

// GET /metrics — Student gets their report metrics
router.get(
  "/metrics",
  authenticate,
  authorize(["student", "general_user"]),
  async (req, res) => {
    try {
      const userId = String(req.user.id || req.user._id);
      const username = req.user.username;

      const reports = await StudentReportModel.find({
        $or: [{ owner_id: userId }, { owner_username: username }],
      })
        .sort({ createdAt: -1 })
        .limit(100);

      const total = reports.length;
      const anonymous = reports.filter((r) => r.anonymous).length;
      const open = reports.filter((r) => r.status !== "Resolved").length;
      const resolved = reports.filter((r) => r.status === "Resolved").length;
      const recent = reports.slice(0, 5).map(mapReport);

      res.json({ total, anonymous, open, resolved, recent });
    } catch (err) {
      console.error("Fetch student metrics error:", err);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  },
);

// GET / — Staff gets all student reports
router.get(
  "/",
  authenticate,
  authorize([
    "admin",
    "chief_security_officer",
    "dean_of_students",
    "assistant_dean",
    "secretary",
    "registrar",
    "security_officer",
    "maintenance",
  ]),
  async (req, res) => {
    try {
      const search = req.query.search;
      const query = addSearchToScope(getStaffReportScope(req.user), search);

      const reports = await StudentReportModel.find(query).sort({
        createdAt: -1,
      });
      res.json(await mapReportsWithStudentNames(reports));
    } catch (err) {
      console.error("Fetch all reports error:", err);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  },
);

// GET /unread-count — Staff gets count of unseen reports
router.get(
  "/unread-count",
  authenticate,
  authorize([
    "admin",
    "chief_security_officer",
    "dean_of_students",
    "assistant_dean",
    "secretary",
    "registrar",
    "security_officer",
    "maintenance",
  ]),
  async (req, res) => {
    try {
      const userId = String(req.user.id || req.user._id);
      const scopeQuery = getStaffReportScope(req.user) || {};
      const count = await StudentReportModel.countDocuments({
        ...scopeQuery,
        seen_by: { $ne: userId },
      });
      res.json({ count });
    } catch (err) {
      console.error("Fetch unread count error:", err);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  },
);

// GET /:id/attachments/:attachmentId/download — Download a report attachment
router.get(
  "/:id/attachments/:attachmentId/download",
  authenticate,
  async (req, res) => {
    try {
      const report = await StudentReportModel.findById(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      if (!canViewReport(req.user, report)) {
        return res
          .status(403)
          .json({ error: "Not authorized to access this attachment" });
      }

      const attachment = report.attachments.id(req.params.attachmentId);
      if (!attachment) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      const filePath = path.join(REPORT_ATTACHMENT_DIR, attachment.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      res.download(filePath, attachment.originalName);
    } catch (err) {
      console.error("Download report attachment error:", err);
      res.status(500).json({ error: "Failed to download attachment" });
    }
  },
);

// PATCH /:id/seen — Mark a report as seen
router.patch("/:id/seen", authenticate, async (req, res) => {
  try {
    const userId = String(req.user.id || req.user._id);
    const report = await StudentReportModel.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (!report.seen_by.includes(userId)) {
      report.seen_by.push(userId);
      await report.save();
    }

    res.json(mapReport(report));
  } catch (err) {
    console.error("Mark seen error:", err);
    res.status(500).json({ error: "Failed to mark as seen" });
  }
});

// PATCH /mark-all-seen — Mark all reports as seen
router.patch(
  "/mark-all-seen",
  authenticate,
  authorize([
    "admin",
    "chief_security_officer",
    "dean_of_students",
    "assistant_dean",
    "secretary",
    "registrar",
    "security_officer",
    "maintenance",
  ]),
  async (req, res) => {
    try {
      const userId = String(req.user.id || req.user._id);
      const scopeQuery = getStaffReportScope(req.user) || {};
      await StudentReportModel.updateMany(
        { ...scopeQuery, seen_by: { $ne: userId } },
        { $addToSet: { seen_by: userId } },
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Mark all seen error:", err);
      res.status(500).json({ error: "Failed to mark all as seen" });
    }
  },
);

// PATCH /:id/category — Staff reroutes a report to the correct category
router.patch(
  "/:id/category",
  authenticate,
  authorize([
    "admin",
    "chief_security_officer",
    "dean_of_students",
    "assistant_dean",
    "secretary",
    "registrar",
    "security_officer",
  ]),
  async (req, res) => {
    try {
      const { category, message } = req.body;
      if (!REPORT_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: "Invalid report category" });
      }

      const report = await StudentReportModel.findById(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      if (!canViewReport(req.user, report)) {
        return res
          .status(403)
          .json({ error: "Not authorized to reroute this report" });
      }
      if (report.category === category) {
        return res
          .status(409)
          .json({
            error: `Report is already marked as ${CATEGORY_LABELS[category]}.`,
          });
      }

      const previousCategory = report.category;
      report.category = category;
      report.routed_by_role = req.user.role || report.routed_by_role || "";
      if (category !== "maintenance_issue") {
        report.routed_to_maintenance = false;
        report.maintenance_work_order_id = "";
      }
      report.updates.unshift({
        status: report.status,
        message:
          message?.trim() ||
          `Report category rerouted from ${CATEGORY_LABELS[previousCategory] || previousCategory} to ${CATEGORY_LABELS[category] || category}.`,
        createdBy: req.user.username || req.user.name || "system",
        createdByRole: req.user.role,
      });
      report.updatedAt = new Date();
      await report.save();

      await createNotification({
        userId: report.owner_id,
        type: "report_update",
        message: `Your report "${report.title}" was rerouted to ${CATEGORY_LABELS[category] || category}.`,
        link: "/my-reports",
      });

      res.json(mapReport(report));
    } catch (err) {
      console.error("Reroute report category error:", err);
      res.status(500).json({ error: "Failed to reroute report category" });
    }
  },
);

// PATCH /:id/status — Staff updates a report's status
router.patch(
  "/:id/status",
  authenticate,
  authorize([
    "admin",
    "chief_security_officer",
    "dean_of_students",
    "assistant_dean",
    "secretary",
    "registrar",
    "security_officer",
    "maintenance",
  ]),
  async (req, res) => {
    try {
      const { status, message } = req.body;

      if (!status || !message) {
        return res
          .status(400)
          .json({ error: "Status and message are required" });
      }

      const validStatuses = [
        "Submitted",
        "Under Review",
        "In Progress",
        "Resolved",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const report = await StudentReportModel.findById(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      if (report.status === status) {
        return res
          .status(409)
          .json({ error: `Report is already in "${status}" status.` });
      }

      if (
        req.user.role === "dean_of_students" &&
        report.owner_role !== "student" &&
        !report.student_involved
      ) {
        return res
          .status(403)
          .json({ error: "Dean can only handle reports involving students." });
      }
      if (
        ["secretary", "registrar"].includes(req.user.role) &&
        (report.owner_role !== "general_user" ||
          (report.category !== "maintenance_issue" && report.student_involved))
      ) {
        return res.status(403).json({
          error:
            "Registrar can only handle general-user maintenance requests or non-student incidents.",
        });
      }
      if (req.user.role === "maintenance") {
        if (
          report.category !== "maintenance_issue" ||
          !report.routed_to_maintenance
        ) {
          return res.status(403).json({
            error:
              "Maintenance can only handle routed maintenance work orders.",
          });
        }
      }

      const userId = String(req.user.id || req.user._id);
      if (!report.seen_by.includes(userId)) {
        report.seen_by.push(userId);
      }

      report.status = status;
      report.updates.unshift({
        status,
        message: message.trim(),
        createdBy: req.user.username || req.user.name,
        createdByRole: req.user.role,
      });
      report.updatedAt = new Date();

      await report.save();
      await createNotification({
        userId: report.owner_id,
        type: "report_update",
        message: `Your report "${report.title}" is now ${status}. ${message.trim()}`,
        link: "/my-reports",
      });
      res.json(mapReport(report));
    } catch (err) {
      console.error("Update status error:", err);
      res.status(500).json({ error: "Failed to update status" });
    }
  },
);

// POST /migrate — One-time migration from localStorage data
router.post(
  "/migrate",
  authenticate,
  authorize(["student", "general_user"]),
  async (req, res) => {
    try {
      const { reports } = req.body;

      if (!Array.isArray(reports) || reports.length === 0) {
        return res.json({ migrated: 0 });
      }

      const userId = String(req.user.id || req.user._id);
      let migrated = 0;

      for (const r of reports) {
        // Only migrate reports owned by this user
        if (r.ownerId !== userId && r.ownerUsername !== req.user.username)
          continue;

        // Skip if already migrated (by tracking code)
        const existing = await StudentReportModel.findOne({
          tracking_code: r.trackingCode,
        });
        if (existing) continue;

        await StudentReportModel.create({
          tracking_code: r.trackingCode,
          title: r.title,
          description: r.description,
          category: r.category,
          anonymous: r.anonymous,
          location: r.location,
          incident_date: r.incidentDate,
          details: r.details || {},
          attachments: r.attachments || [],
          status: r.status,
          owner_id: r.ownerId || userId,
          owner_username: r.ownerUsername || req.user.username,
          owner_name: r.ownerName || req.user.username,
          seen_by: r.seenBy || [],
          updates: (r.updates || []).map((u) => ({
            status: u.status,
            message: u.message,
            createdBy: "",
          })),
          createdAt: r.submittedAt ? new Date(r.submittedAt) : new Date(),
        });

        migrated++;
      }

      res.json({ migrated });
    } catch (err) {
      console.error("Migration error:", err);
      res.status(500).json({ error: "Migration failed" });
    }
  },
);

export default router;
