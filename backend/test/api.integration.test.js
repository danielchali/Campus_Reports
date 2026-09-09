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
