import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import usersRouter from "./routes/users.js";
import studentsRouter from "./routes/students.js";
import staffRouter from "./routes/staff.js";
import casesRouter from "./routes/cases.js";
import reportsRouter from "./routes/reports.js";
import authRouter from "./routes/auth.js";
import evidenceRouter from "./routes/evidence.js";
import auditRouter from "./routes/audit.js";
import healthRouter from "./routes/health.js";
import statementRequestsRouter from "./routes/statementRequests.js";
import anonymousReportsRouter from "./routes/anonymousReports.js";
import searchRouter from "./routes/search.js";
import notificationsRouter from "./routes/notifications.js";
import aiAssistantRouter from "./routes/aiAssistant.js";
import studentReportsRouter from "./routes/studentReports.js";
import workOrdersRouter from "./routes/workOrders.js";
import dashboardAnalyticsRouter from "./routes/dashboardAnalytics.js";
import formSchemasRouter from "./routes/formSchemas.js";

const app = express();
const API_V1_BASE = "/api/v1";

const LOCAL_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const DEFAULT_PRODUCTION_CORS_ORIGINS = ["https://campusreports.vercel.app"];

function stripCorsValueQuotes(value) {
  return String(value || "")
    .trim()
    .replace(/^["']+|["']+$/g, "");
}

function splitCorsValues(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => splitCorsValues(item));
  }

  if (typeof value !== "string") {
    return [];
  }

  return value.split(/[\s,]+/).map((item) => stripCorsValueQuotes(item));
}

function normalizeCorsOrigin(origin) {
  const trimmedOrigin = stripCorsValueQuotes(origin).replace(/[/:]+$/, "");

  if (!trimmedOrigin) {
    return "";
  }

  if (trimmedOrigin === "*") {
    return trimmedOrigin;
  }

  const originWithProtocol = /^https?:\/\//i.test(trimmedOrigin)
    ? trimmedOrigin
    : /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmedOrigin)
      ? `http://${trimmedOrigin}`
      : `https://${trimmedOrigin}`;

  try {
    return new URL(originWithProtocol).origin;
  } catch {
    return originWithProtocol.replace(/\/+$/, "");
  }
}

function parseCorsOrigins(...originValues) {
  const parsedOrigins = originValues
    .flatMap((originValue) => splitCorsValues(originValue))
    .map((origin) => normalizeCorsOrigin(origin))
    .filter(Boolean);

  return [
    ...new Set([
      ...LOCAL_CORS_ORIGINS,
      ...DEFAULT_PRODUCTION_CORS_ORIGINS,
      ...parsedOrigins,
    ]),
  ];
}

function parseCorsOriginPatterns(originPatterns = "") {
  return splitCorsValues(originPatterns)
    .filter(Boolean)
    .flatMap((pattern) => {
      try {
        return [new RegExp(pattern, "i")];
      } catch (err) {
        console.warn(
          `Ignoring invalid CORS origin pattern "${pattern}":`,
          err.message,
        );
        return [];
      }
    });
}

const allowedCorsOrigins = parseCorsOrigins(
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
);
const allowedCorsOriginPatterns = parseCorsOriginPatterns(
  process.env.CORS_ORIGIN_PATTERNS,
);
const allowAllCorsOrigins = allowedCorsOrigins.includes("*");

function isCorsOriginAllowed(origin) {
  if (!origin || allowAllCorsOrigins) {
    return true;
  }

  const normalizedOrigin = normalizeCorsOrigin(origin);
  return (
    allowedCorsOrigins.includes(normalizedOrigin) ||
    allowedCorsOriginPatterns.some((pattern) => pattern.test(normalizedOrigin))
  );
}

const corsOptions = {
  origin(origin, callback) {
    if (isCorsOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    console.warn(`Blocked CORS origin: ${origin}`);
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

function mountRoutes(basePath) {
  app.use(`${basePath}/users`, usersRouter);
  app.use(`${basePath}/students`, studentsRouter);
  app.use(`${basePath}/staff`, staffRouter);
  app.use(`${basePath}/cases`, casesRouter);
  app.use(`${basePath}/reports`, reportsRouter);
  app.use(basePath, authRouter);
  app.use(`${basePath}/evidence`, evidenceRouter);
  app.use(`${basePath}/audit`, auditRouter);
  app.use(`${basePath}/health`, healthRouter);
  app.use(`${basePath}/statement-requests`, statementRequestsRouter);
  app.use(`${basePath}/anonymous-reports`, anonymousReportsRouter);
  app.use(`${basePath}/search`, searchRouter);
  app.use(`${basePath}/notifications`, notificationsRouter);
  app.use(`${basePath}/ai-assistant`, aiAssistantRouter);
  app.use(`${basePath}/student-reports`, studentReportsRouter);
  app.use(`${basePath}/work-orders`, workOrdersRouter);
  app.use(`${basePath}/dashboard`, dashboardAnalyticsRouter);
  app.use(`${basePath}/form-schemas`, formSchemasRouter);
}

// Primary versioned API
mountRoutes(API_V1_BASE);
// Temporary legacy alias for backward compatibility during migration
mountRoutes("/api");

// Health check endpoint (legacy)
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.get("/api/v1/health", (req, res) => res.json({ status: "ok" }));

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Campus Reports Backend API",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// Catch-all for unhandled API routes
app.use("/api/*", (req, res) => {
  console.log("Unhandled API route:", req.method, req.originalUrl);
  res.status(404).json({ error: "API endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(500).json({ error: "Server error" });
});

export default app;
