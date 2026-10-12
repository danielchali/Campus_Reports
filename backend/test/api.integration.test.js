import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const tokenFor = (claims) => jwt.sign(claims, JWT_SECRET, { expiresIn: "5m" });
const authHeader = (claims) => `Bearer ${tokenFor(claims)}`;

function assertJsonError(response, status, error) {
  assert.equal(response.status, status);
  assert.equal(response.headers["content-type"].includes("application/json"), true);
  assert.equal(response.body.error, error);
}

test("authentication API rejects protected registration without a bearer token", async () => {
  const response = await request(app)
    .post("/api/v1/register")
    .send({ username: "new-admin", password: "secret", email: "admin@example.com" });

  assertJsonError(response, 401, "Missing or invalid token");
});

test("authentication API rejects malformed bearer tokens", async () => {
  const response = await request(app)
    .post("/api/v1/register")
    .set("Authorization", "Bearer not-a-jwt")
    .send({ username: "new-admin", password: "secret", email: "admin@example.com" });

  assertJsonError(response, 401, "Invalid token");
});

test("refresh-token API returns its explicit not-implemented contract", async () => {
  const response = await request(app).post("/api/v1/refresh-token");

  assertJsonError(response, 401, "Refresh token not implemented");
});

test("authentication API prevents non-admin users from registering users", async () => {
  const response = await request(app)
    .post("/api/v1/register")
    .set("Authorization", authHeader({ id: "student-1", username: "student.one", role: "student" }))
    .send({ username: "another-user", password: "secret", email: "user@example.com" });

  assertJsonError(response, 403, "Forbidden");
});

test("analytics API requires authentication", async () => {
  const response = await request(app).get("/api/v1/analytics/summary");
  assertJsonError(response, 401, "Missing or invalid token");
});

test("analytics API rejects a student token at the staff authorization boundary", async () => {
  const response = await request(app)
    .get("/api/v1/analytics/summary")
    .set("Authorization", authHeader({ id: "student-1", username: "student.one", role: "student" }));
  assertJsonError(response, 403, "Forbidden");
});

test("SUS UAT API requires authentication and keeps aggregate results admin-only", async () => {
  const unauthenticatedSubmit = await request(app)
    .post("/api/v1/sus-surveys")
    .send({ answers: Array(10).fill(3) });
  const studentSummary = await request(app)
    .get("/api/v1/sus-surveys/summary")
    .set("Authorization", authHeader({ id: "student-1", username: "student.one", role: "student" }));

  assertJsonError(unauthenticatedSubmit, 401, "Missing or invalid token");
  assertJsonError(studentSummary, 403, "Forbidden");
});

test("SUS UAT API validates all ten scaled answers before saving", async () => {
  const response = await request(app)
    .post("/api/v1/sus-surveys")
    .set("Authorization", authHeader({ id: "student-1", username: "student.one", role: "student" }))
    .send({ answers: [1, 2, 3] });

  assertJsonError(response, 400, "Provide all ten SUS responses as whole numbers from 1 to 5.");
});

test("reports API requires authentication for listing reports", async () => {
  const response = await request(app).get("/api/v1/reports");
  assertJsonError(response, 401, "Missing or invalid token");
});

test("reports API requires authentication for DOCX exports", async () => {
  const response = await request(app).post("/api/v1/reports/docx").send({ type: "current_page", data: [] });
  assertJsonError(response, 401, "Missing or invalid token");
});

test("reports API rejects a student token before reaching protected handlers", async () => {
  const response = await request(app)
    .get("/api/v1/reports/analytics")
    .set("Authorization", authHeader({ id: "student-1", username: "student.one", role: "student" }));

  assertJsonError(response, 403, "Forbidden");
});

test("students API requires authentication for listing students", async () => {
  const response = await request(app).get("/api/v1/students");
  assertJsonError(response, 401, "Missing or invalid token");
});

test("students API rejects a student token at the authorization boundary", async () => {
  const response = await request(app)
    .get("/api/v1/students")
    .set("Authorization", authHeader({ id: "student-1", username: "student.one", role: "student" }));

  assertJsonError(response, 403, "Forbidden");
});

test("students API requires authentication for create and delete operations", async () => {
  const createResponse = await request(app)
    .post("/api/v1/students")
    .send({ studentId: "STU-001", roomNumber: "A-101", email: "student@example.com" });
  const deleteResponse = await request(app).delete("/api/v1/students/student-1");

  assertJsonError(createResponse, 401, "Missing or invalid token");
  assertJsonError(deleteResponse, 401, "Missing or invalid token");
});

test("students API applies the stricter admin-only rule to deletes", async () => {
  const response = await request(app)
    .delete("/api/v1/students/student-1")
    .set("Authorization", authHeader({ id: "security-1", username: "security.one", role: "security_officer" }));

  assertJsonError(response, 403, "Forbidden");
});

test("student-reports API requires authentication for staff report intake", async () => {
  const response = await request(app).get("/api/v1/student-reports");
  assertJsonError(response, 401, "Missing or invalid token");
});

test("student-reports API rejects unauthorized roles from viewing intake queue", async () => {
  const response = await request(app)
    .get("/api/v1/student-reports")
    .set("Authorization", authHeader({ id: "student-1", username: "student.one", role: "student" }));

  assertJsonError(response, 403, "Forbidden");
});
