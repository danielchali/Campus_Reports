import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import { register, registerGeneralUser, registerStudent } from "../controllers/authController.js";
import { createStatementRequest } from "../controllers/statementRequestsController.js";
import { deleteEvidence, downloadEvidence, uploadEvidence } from "../controllers/evidenceController.js";
import EvidenceModel from "../models/evidence.js";
import NotificationModel from "../models/notification.js";
import StudentModel from "../models/student.js";
import { getUploadDirectory } from "../utils/uploadPaths.js";

function responseMock() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    download() {
      this.downloadCalled = true;
      return this;
    },
  };
}

function requestMock(body = {}, overrides = {}) {
  return {
    body,
    params: {},
    query: {},
    ip: "127.0.0.1",
    user: { username: "staff.one", role: "admin" },
    get: () => "test-agent",
    ...overrides,
  };
}

test("root endpoint reports that the backend is running", async () => {
  const response = await request(app).get("/");
  assert.equal(response.status, 200);
  assert.equal(response.body.message, "Campus Reports Backend API");
  assert.equal(response.body.status, "running");
  assert.equal(typeof response.body.timestamp, "string");
});

test("versioned and legacy health endpoints return a minimal healthy response", async () => {
  const [versioned, legacy] = await Promise.all([
    request(app).get("/api/v1/health"),
    request(app).get("/api/health"),
  ]);
  assert.equal(versioned.status, 200);
  assert.equal(versioned.body.status, "ok");
  assert.equal(versioned.body.service, "Campus Reports Backend");
  assert.equal(legacy.status, 200);
  assert.equal(legacy.body.status, "ok");
  assert.equal(legacy.body.service, "Campus Reports Backend");
});

test("detailed health route exposes service and database status", async () => {
  const response = await request(app).get("/api/v1/health/");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.service, "Campus Reports Backend");
  assert.equal(response.body.database.type, "mongo");
  assert.equal(response.body.database.status, "disconnected");
  assert.match(response.body.system.memory.rss, /MB$/);
});

test("unknown API routes return a JSON 404 response", async () => {
  const response = await request(app).get("/api/v1/does-not-exist");
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: "API endpoint not found" });
});

test("CORS allows local origins and blocks unknown origins", async () => {
  const allowed = await request(app)
    .options("/api/v1/health")
    .set("Origin", "http://localhost:3000")
    .set("Access-Control-Request-Method", "GET");
  const blocked = await request(app)
    .options("/api/v1/health")
    .set("Origin", "https://untrusted.example")
    .set("Access-Control-Request-Method", "GET");

  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers["access-control-allow-origin"], "http://localhost:3000");
  assert.equal(blocked.status, 200);
  assert.equal(blocked.headers["access-control-allow-origin"], undefined);
});

test("register rejects requests without an email before accessing the database", async () => {
  const req = requestMock({ password: "secret", name: "New User", role: "admin" });
  const res = responseMock();
  await register(req, res);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: "Email is required" });
});

test("register validates student IDs and warden hostels", async () => {
  const missingStudentId = responseMock();
  await register(requestMock({ email: "student@example.com", password: "secret", role: "student" }), missingStudentId);
  assert.equal(missingStudentId.statusCode, 400);
  assert.equal(missingStudentId.body.error, "Student ID is required");

  const missingHostel = responseMock();
  await register(requestMock({ email: "warden@example.com", password: "secret", role: "warden" }), missingHostel);
  assert.equal(missingHostel.statusCode, 400);
  assert.equal(missingHostel.body.error, "Hostel is required for Warden users");
});

test("general-user signup returns all validation errors for an empty payload", async () => {
  const res = responseMock();
  await registerGeneralUser(requestMock(), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Password is required");
  assert.deepEqual(res.body.details, [
    "Password is required",
    "Password must be at least 6 characters",
    "Full name is required",
    "Email is required",
  ]);
});

test("general-user signup accepts profile aliases during validation", async () => {
  const res = responseMock();
  await registerGeneralUser(requestMock({ password: "123", fullName: "General User", profile: { email: "user@example.com" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Password must be at least 6 characters");
  assert.deepEqual(res.body.details, ["Password must be at least 6 characters"]);
});

test("student signup reports required fields in a stable order", async () => {
  const res = responseMock();
  await registerStudent(requestMock({}), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Student ID is required");
  assert.deepEqual(res.body.details, [
    "Student ID is required",
    "Password is required",
    "Password must be at least 6 characters",
    "Program is required",
    "First name is required",
    "Surname is required",
    "Email is required",
    "Room number is required",
  ]);
});

test("statement-request creation validates required fields before database access", async () => {
  const res = responseMock();
  await createStatementRequest(requestMock({ studentId: "STU-001", title: "" }), res);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: "studentId, title, and prompt are required" });
});

test("statement-request creation rejects unknown students before resolving linked cases", async () => {
  const originalFindOne = StudentModel.findOne;
  StudentModel.findOne = async () => null;
  const res = responseMock();
  try {
    await createStatementRequest(
      requestMock({ studentId: "STU-001", title: "Explain incident", prompt: "Please provide details", caseId: "not-an-object-id" }),
      res,
    );
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { error: "Student not found" });
  } finally {
    StudentModel.findOne = originalFindOne;
  }
});

test("evidence upload validates file and case ID before writing files", async () => {
  const noFile = responseMock();
  await uploadEvidence(requestMock({ caseId: "CASE-1" }, { file: undefined }), noFile);
  assert.equal(noFile.statusCode, 400);
  assert.deepEqual(noFile.body, { error: "No file uploaded" });

  const noCase = responseMock();
  await uploadEvidence(requestMock({}, { file: { originalname: "photo.png" } }), noCase);
  assert.equal(noCase.statusCode, 400);
  assert.deepEqual(noCase.body, { error: "Case ID is required" });
});

test("evidence download and deletion return not-found responses when records do not exist", async () => {
  const originalFindById = EvidenceModel.findById;
  EvidenceModel.findById = async () => null;
  const downloadResponse = responseMock();
  try {
    await downloadEvidence(requestMock({}, { params: { id: "507f1f77bcf86cd799439011" } }), downloadResponse);
    assert.equal(downloadResponse.statusCode, 404);
    assert.deepEqual(downloadResponse.body, { error: "Evidence not found" });

    const deleteResponse = responseMock();
    await deleteEvidence(requestMock({}, { params: { id: "507f1f77bcf86cd799439012" } }), deleteResponse);
    assert.equal(deleteResponse.statusCode, 404);
    assert.deepEqual(deleteResponse.body, { error: "Evidence not found" });
  } finally {
    EvidenceModel.findById = originalFindById;
  }
});

test("notification and student models enforce required fields", () => {
  const notification = new NotificationModel({});
  const student = new StudentModel({});
  const notificationErrors = notification.validateSync().errors;
  const studentErrors = student.validateSync().errors;
  assert.deepEqual(Object.keys(notificationErrors).sort(), ["message", "type", "userId"]);
  assert.deepEqual(Object.keys(studentErrors), ["studentId"]);
});

test("student model exposes a full-name virtual and JSON virtuals", () => {
  const student = new StudentModel({
    studentId: "STU-001",
    personalInfo: { firstName: "Ada", surName: "Lovelace", gender: "female" },
  });
  assert.equal(student.fullName, "Ada Lovelace");
  assert.equal(student.gender, "female");
  assert.equal(student.toJSON().fullName, "Ada Lovelace");
});

test("getUploadDirectory creates the normal and Vercel upload locations", () => {
  const previousVercel = process.env.VERCEL;
  delete process.env.VERCEL;
  const normalPath = getUploadDirectory("test", "normal");
  assert.match(normalPath, /backend[\\/]uploads[\\/]test[\\/]normal$/);

  process.env.VERCEL = "1";
  const vercelPath = getUploadDirectory("test", "vercel");
  assert.match(vercelPath, /campus-reports[\\/]uploads[\\/]test[\\/]vercel$/);

  if (previousVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = previousVercel;
});
