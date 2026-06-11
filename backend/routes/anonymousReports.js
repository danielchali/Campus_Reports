import express from "express";
import crypto from "crypto";
import AnonymousReportModel from "../models/anonymousReport.js";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  isEmailEnabled,
  isValidContactEmail,
  sendAnonymousReportNotification,
  sendAnonymousReporterConfirmation,
  sendAnonymousReporterStatusUpdate,
  sendAnonymousReporterCategoryUpdate,
} from "../utils/emailService.js";
import { applyNlpToDocument } from "../utils/nlpAnalytics.js";
import { emitDashboardRefresh } from "../utils/socket.js";
import InstitutionConfigModel from "../models/institutionConfig.js";
import { DEFAULT_INSTITUTION_CONFIG } from "../data/defaultFormSchemas.js";
import {
  getAllowedCategoryIds,
  validateReportSubmission,
} from "../utils/formSchemaValidation.js";
import {
  mapAnonymousReportForStaff,
  mapAnonymousReportsForStaff,
} from "../utils/reportRedaction.js";

const router = express.Router();
const ANONYMOUS_REPORT_CATEGORIES = [
  "disciplinary_case",
  "maintenance_issue",
  "other",
];

function parseDetails(rawDetails) {
  if (!rawDetails) return {};
  if (typeof rawDetails === "object" && !Array.isArray(rawDetails)) return rawDetails;
  try {
    const parsed = JSON.parse(rawDetails);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function loadInstitutionConfig() {
  const existing = await InstitutionConfigModel.findOne({ institutionId: "default" });
  if (existing) return existing;
  return InstitutionConfigModel.create({
    ...DEFAULT_INSTITUTION_CONFIG,
    institutionId: "default",
  });
}
const CATEGORY_LABELS = {
  disciplinary_case: "Disciplinary Case",
  maintenance_issue: "Maintenance Issue",
  other: "Other",
};
const STAFF_ROLES = [
  "admin",
  "chief_security_officer",
  "dean_of_students",
  "assistant_dean",
  "secretary",
  "registrar",
  "security_officer",
  "maintenance",
];
const CATEGORY_REROUTE_ROLES = [
  "admin",
  "chief_security_officer",
  "dean_of_students",
  "assistant_dean",
  "secretary",
  "registrar",
  "security_officer",
];

// --- Helpers ---

function generateTrackingCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "KMU-";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function hashIp(ip) {
  if (!ip) return "";
  return crypto
    .createHash("sha256")
    .update(ip + (process.env.IP_SALT || "campus-reports-salt"))
    .digest("hex")
    .slice(0, 16);
}

// --- PUBLIC ROUTES (no auth required) ---

// POST /api/anonymous-reports — submit a new anonymous report
router.post("/", async (req, res) => {
  try {
    const {
      category,
      title,
      description,
      location,
      incident_date,
      contact_email,
      details: rawDetails,
    } = req.body;

    const institutionConfig = await loadInstitutionConfig();
    const allowedCategories = getAllowedCategoryIds(institutionConfig, "anonymous_report");
    const detailsInput = parseDetails(rawDetails);

    const validation = validateReportSubmission({
      institutionConfig,
      formType: "anonymous_report",
      category,
      coreValues: {
        title,
        description,
        location,
        incident_date,
        contact_email,
      },
      detailValues: detailsInput,
    });

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || "Invalid report submission." });
    }

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: "Invalid report category." });
    }
    if (contact_email?.trim() && !isValidContactEmail(contact_email)) {
      return res.status(400).json({ error: "Invalid contact email address." });
    }

    // Generate a unique tracking code
    let tracking_code;
    let attempts = 0;
    do {
      tracking_code = generateTrackingCode();
      attempts++;
    } while (
      (await AnonymousReportModel.exists({ tracking_code })) &&
      attempts < 10
    );

    const ip =
      req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "";
    const ip_hash = hashIp(ip);

    const report = await AnonymousReportModel.create({
      tracking_code,
      category,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      incident_date,
      contact_email: contact_email ? contact_email.trim() : "",
      details: validation.details || {},
      ip_hash,
    });

    if (isEmailEnabled()) {
      sendAnonymousReportNotification(report).catch((err) => {
        console.error("Failed to send admin anonymous report notification:", err);
      });
      if (report.contact_email) {
        sendAnonymousReporterConfirmation(report).catch((err) => {
          console.error("Failed to send anonymous reporter confirmation email:", err);
        });
      }
    }

    applyNlpToDocument(AnonymousReportModel, report._id, report)
      .then(() => emitDashboardRefresh("anonymous-reports"))
      .catch((err) => {
        console.error("Failed NLP analysis for anonymous report:", err);
        emitDashboardRefresh("anonymous-reports");
      });

    emitDashboardRefresh("anonymous-reports");

    res.status(201).json({
      message: "Report submitted successfully.",
      tracking_code: report.tracking_code,
      status: report.status,
      submitted_at: report.createdAt,
    });
  } catch (err) {
    console.error("Anonymous report submission error:", err);
    res
      .status(500)
      .json({ error: "Failed to submit report. Please try again." });
  }
});

// GET /api/anonymous-reports/track/:code — public tracking endpoint
router.get("/track/:code", async (req, res) => {
  try {
    const report = await AnonymousReportModel.findOne({
      tracking_code: req.params.code,
    });
    if (!report) {
      return res
        .status(404)
        .json({ error: "Report not found. Please check your tracking code." });
    }

    // Return only safe public-facing fields
    res.json({
      tracking_code: report.tracking_code,
      category: report.category,
      title: report.title,
      location: report.location,
      incident_date: report.incident_date,
      status: report.status,
      submitted_at: report.createdAt,
    });
  } catch (err) {
    console.error("Anonymous report tracking error:", err);
    res.status(500).json({ error: "Failed to fetch report status." });
  }
});

// --- PROTECTED ROUTES (staff only) ---

// GET /api/anonymous-reports — list all anonymous reports (admin/staff only)
router.get("/", authenticate, authorize(STAFF_ROLES), async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const query = {};
    if (req.user.role === "maintenance") {
      query.category = "maintenance_issue";
    } else if (category) {
      query.category = category;
    }
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { tracking_code: { $regex: search, $options: "i" } },
      ];
    }

    const reports = await AnonymousReportModel.find(query).sort({
      createdAt: -1,
    });
    res.json(mapAnonymousReportsForStaff(reports, req.user.role));
  } catch (err) {
    console.error("Fetch anonymous reports error:", err);
    res.status(500).json({ error: "Failed to fetch reports." });
  }
});

// GET /api/anonymous-reports/:id — get a single anonymous report (staff only)
router.get("/:id", authenticate, authorize(STAFF_ROLES), async (req, res) => {
  try {
    const report = await AnonymousReportModel.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found." });
    if (
      req.user.role === "maintenance" &&
      report.category !== "maintenance_issue"
    ) {
      return res
        .status(403)
        .json({
          error: "Maintenance can only view anonymous maintenance issues.",
        });
    }
    res.json(mapAnonymousReportForStaff(report, req.user.role));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch report." });
  }
});

// PATCH /api/anonymous-reports/:id/category — reroute to the correct category (staff only)
router.patch(
  "/:id/category",
  authenticate,
  authorize(CATEGORY_REROUTE_ROLES),
  async (req, res) => {
    try {
      const { category } = req.body;
      if (!ANONYMOUS_REPORT_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: "Invalid category value." });
      }

      const report = await AnonymousReportModel.findById(req.params.id);
      if (!report) return res.status(404).json({ error: "Report not found." });
      if (report.category === category) {
        return res
          .status(409)
          .json({
            error: `Report is already marked as ${CATEGORY_LABELS[category] || category}.`,
          });
      }

      const previousCategory = report.category;
      report.category = category;
      report.updatedAt = new Date();
      await report.save();

      if (isEmailEnabled() && report.contact_email) {
        sendAnonymousReporterCategoryUpdate(report, {
          previousCategory,
          newCategory: category,
        }).catch((err) => {
          console.error("Failed to send anonymous reporter category email:", err);
        });
      }

      emitDashboardRefresh("anonymous-reports");
      res.json(mapAnonymousReportForStaff(report, req.user.role));
    } catch (err) {
      res.status(500).json({ error: "Failed to reroute category." });
    }
  },
);

// PATCH /api/anonymous-reports/:id/status — update status (staff only)
router.patch(
  "/:id/status",
  authenticate,
  authorize(STAFF_ROLES),
  async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = [
        "Submitted",
        "Under Review",
        "In Progress",
        "Resolved",
      ];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value." });
      }

      const report = await AnonymousReportModel.findById(req.params.id);
      if (!report) return res.status(404).json({ error: "Report not found." });
      if (
        req.user.role === "maintenance" &&
        report.category !== "maintenance_issue"
      ) {
        return res
          .status(403)
          .json({
            error: "Maintenance can only update anonymous maintenance issues.",
          });
      }
      const previousStatus = report.status;
      if (previousStatus === status) {
        return res.status(409).json({ error: `Report is already in "${status}" status.` });
      }

      report.status = status;
      report.updatedAt = new Date();
      await report.save();

      if (isEmailEnabled() && report.contact_email) {
        sendAnonymousReporterStatusUpdate(report, {
          previousStatus,
          newStatus: status,
        }).catch((err) => {
          console.error("Failed to send anonymous reporter status email:", err);
        });
      }

      emitDashboardRefresh("anonymous-reports");
      res.json(mapAnonymousReportForStaff(report, req.user.role));
    } catch (err) {
      res.status(500).json({ error: "Failed to update status." });
    }
  },
);

export default router;
