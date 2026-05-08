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

const app = express();
const API_V1_BASE = "/api/v1";

// CORS configuration - flexible for any deployment environment
const corsOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL;
// Handle multiple origins if provided as comma-separated values
let origins;
if (Array.isArray(corsOrigin)) {
  origins = corsOrigin;
} else if (typeof corsOrigin === "string") {
  // Split by comma for multiple origins, or use as single origin
  origins = corsOrigin.includes(",")
    ? corsOrigin.split(",").map((origin) => origin.trim())
    : corsOrigin;
} else {
  origins = "http://localhost:3000";
}

app.use(
  cors({
    origin: origins,
    credentials: true,
  }),
);
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
  res.status(500).json({ error: "Server error" });
});

export default app;
