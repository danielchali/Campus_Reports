import express from "express";
import InstitutionConfigModel from "../models/institutionConfig.js";
import { DEFAULT_INSTITUTION_CONFIG } from "../data/defaultFormSchemas.js";
import {
  buildPortalConfig,
  resolveFormSchema,
} from "../utils/formSchemaValidation.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();
const INSTITUTION_ID = "default";

let seedPromise = null;

async function ensureDefaultInstitutionConfig() {
  const existing = await InstitutionConfigModel.findOne({ institutionId: INSTITUTION_ID });
  if (existing) return existing;

  const created = await InstitutionConfigModel.create({
    ...DEFAULT_INSTITUTION_CONFIG,
    institutionId: INSTITUTION_ID,
  });
  console.log("✅ Default institution form schemas seeded");
  return created;
}

function getSeedPromise() {
  if (!seedPromise) {
    seedPromise = ensureDefaultInstitutionConfig().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

async function loadInstitutionConfig() {
  await getSeedPromise();
  return InstitutionConfigModel.findOne({ institutionId: INSTITUTION_ID });
}

function sanitizeConfigForPublic(config) {
  if (!config) return null;
  const plain = config.toObject ? config.toObject() : config;
  return {
    institutionId: plain.institutionId,
    institutionName: plain.institutionName,
    version: plain.version,
    portal: buildPortalConfig(plain),
    forms: plain.forms,
  };
}

// GET /api/v1/form-schemas — public read for forms + portal integration
router.get("/", async (req, res) => {
  try {
    const config = await loadInstitutionConfig();
    const formType = req.query.form;
    const publicConfig = sanitizeConfigForPublic(config);

    if (formType) {
      const schema = resolveFormSchema(config, formType);
      if (!schema) {
        return res.status(404).json({ error: "Form schema not found." });
      }
      return res.json({
        institutionName: publicConfig.institutionName,
        version: publicConfig.version,
        portal: publicConfig.portal,
        form: schema,
      });
    }

    return res.json(publicConfig);
  } catch (error) {
    console.error("Failed to load form schemas:", error);
    return res.status(500).json({ error: "Failed to load form schemas." });
  }
});

// GET /api/v1/form-schemas/portal — embed integration metadata
router.get("/portal", async (req, res) => {
  try {
    const config = await loadInstitutionConfig();
    const portal = buildPortalConfig(config);
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

    return res.json({
      ...portal,
      embedUrl: `${frontendUrl}/embed/report`,
      integrationGuide: {
        iframeExample: `<iframe src="${frontendUrl}/embed/report?category=maintenance_issue" title="Campus Reports" width="100%" height="720" style="border:0;border-radius:12px;"></iframe>`,
        postMessageEvents: {
          parentToChild: ["campus-reports:prefill"],
          childToParent: ["campus-reports:ready", "campus-reports:submitted", "campus-reports:error"],
        },
        queryParams: ["category", "title", "location", "guided"],
      },
    });
  } catch (error) {
    console.error("Failed to load portal config:", error);
    return res.status(500).json({ error: "Failed to load portal configuration." });
  }
});

// PUT /api/v1/form-schemas — admin update institution form configuration
router.put("/", authenticate, authorize(["admin"]), async (req, res) => {
  try {
    const config = await loadInstitutionConfig();
    const {
      institutionName,
      portal,
      forms,
    } = req.body || {};

    if (institutionName !== undefined) {
      config.institutionName = String(institutionName).trim() || config.institutionName;
    }

    if (portal && typeof portal === "object") {
      config.portal = {
        ...config.portal?.toObject?.() || config.portal || {},
        ...portal,
        allowedEmbedOrigins: Array.isArray(portal.allowedEmbedOrigins)
          ? portal.allowedEmbedOrigins.map((origin) => String(origin).trim()).filter(Boolean)
          : config.portal?.allowedEmbedOrigins || [],
      };
    }

    if (forms && typeof forms === "object") {
      for (const formType of ["anonymous_report", "student_report"]) {
        if (forms[formType]) {
          config.forms[formType] = forms[formType];
          config.markModified(`forms.${formType}`);
        }
      }
    }

    config.version = (config.version || 1) + 1;
    config.updatedBy = req.user?.username || "admin";
    config.updatedAt = new Date();
    await config.save();

    return res.json(sanitizeConfigForPublic(config));
  } catch (error) {
    console.error("Failed to update form schemas:", error);
    return res.status(500).json({ error: "Failed to update form schemas." });
  }
});

export default router;
