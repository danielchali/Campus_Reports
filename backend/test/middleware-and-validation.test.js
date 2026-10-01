import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { authenticate, authorize } from "../middleware/auth.js";
import { loginRateLimit, recordFailedLoginAttempt, clearLoginAttempts } from "../middleware/loginRateLimit.js";
import { requestRateLimit, resetRateLimitForTests } from "../middleware/rateLimit.js";
import { resetCacheForTests } from "../middleware/cache.js";
import {
  getAllowedCategoryIds,
  resolveFormSchema,
  validateReportSubmission,
} from "../utils/formSchemaValidation.js";

function responseMock() {
  const response = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = String(value);
    },
    set(name, value) {
      this.headers[name] = String(value);
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return response;
}

function requestMock(overrides = {}) {
  return {
    headers: {},
    ip: "192.0.2.10",
    socket: { remoteAddress: "192.0.2.10" },
    body: {},
    query: {},
    ...overrides,
  };
}

function customSchema() {
  return {
    commonFields: [
      { id: "title", label: "Title", type: "text", required: true },
      { id: "email", label: "Email", type: "email" },
    ],
    categories: [
      {
        id: "maintenance_issue",
        fields: [
          { id: "description", label: "Description", type: "textarea", required: true, minLength: 10 },
          { id: "priority", label: "Priority", type: "select", options: ["low", "high"] },
          { id: "studentInvolved", label: "Student involved", type: "toggle", mapsTo: "student_involved" },
        ],
      },
    ],
  };
}

beforeEach(() => {
  resetCacheForTests();
  resetRateLimitForTests();
  delete process.env.API_RATE_LIMIT_MAX;
  delete process.env.API_RATE_LIMIT_WINDOW_SECONDS;
  delete process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS;
  delete process.env.LOGIN_RATE_LIMIT_WINDOW_MS;
});

afterEach(() => {
  resetCacheForTests();
  resetRateLimitForTests();
  delete process.env.API_RATE_LIMIT_MAX;
  delete process.env.API_RATE_LIMIT_WINDOW_SECONDS;
  delete process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS;
  delete process.env.LOGIN_RATE_LIMIT_WINDOW_MS;
});

test("authenticate rejects a missing authorization header", () => {
  const req = requestMock();
  const res = responseMock();
  let called = false;

  authenticate(req, res, () => { called = true; });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "Missing or invalid token" });
  assert.equal(called, false);
});

test("authenticate rejects malformed and invalid bearer tokens", () => {
  for (const authorization of ["Basic abc", "Bearer", "Bearer invalid-token"]) {
    const req = requestMock({ headers: { authorization } });
    const res = responseMock();
    authenticate(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, authorization === "Basic abc" || authorization === "Bearer"
      ? "Missing or invalid token"
      : "Invalid token");
  }
});

test("authenticate verifies a token and attaches its payload to the request", () => {
  const payload = { id: "staff-1", username: "staff.one", role: "admin" };
  const token = jwt.sign(payload, "changeme");
  const req = requestMock({ headers: { authorization: `Bearer ${token}` } });
  const res = responseMock();
  let nextCalled = false;

  authenticate(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, payload.id);
  assert.equal(req.user.role, payload.role);
});

test("authorize allows an authenticated user with an accepted role", () => {
  const req = requestMock({ user: { role: "registrar" } });
  const res = responseMock();
  let nextCalled = false;

  authorize(["admin", "registrar"])(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.body, undefined);
});

test("authorize rejects missing users and users with disallowed roles", () => {
  for (const user of [undefined, { role: "student" }]) {
    const req = requestMock({ user });
    const res = responseMock();
    let nextCalled = false;
    authorize(["admin"])(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { error: "Forbidden" });
    assert.equal(nextCalled, false);
  }
});

test("authorize permits every authenticated role when no roles are configured", () => {
  const req = requestMock({ user: { role: "student" } });
  const res = responseMock();
  let nextCalled = false;
  authorize()(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test("loginRateLimit records the attempt key and permits requests below the limit", () => {
  process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS = "2";
  const req = requestMock({
    ip: "198.51.100.20",
    headers: { "x-forwarded-for": "198.51.100.20, 10.0.0.1" },
    body: { username: "  User@Example.COM " },
  });
  const res = responseMock();
  let nextCalled = false;

  loginRateLimit(req, res, () => { nextCalled = true; });

  assert.equal(req.loginAttemptKey, "198.51.100.20::user@example.com");
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test("loginRateLimit blocks requests after the configured failed-login limit", () => {
  process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS = "2";
  const req = requestMock({ ip: "198.51.100.21", body: { username: "student" } });
  const first = responseMock();
  loginRateLimit(req, first, () => {});
  recordFailedLoginAttempt(req.loginAttemptKey);
  const second = responseMock();
  loginRateLimit(req, second, () => {});
  recordFailedLoginAttempt(req.loginAttemptKey);
  const blocked = responseMock();
  let nextCalled = false;

  loginRateLimit(req, blocked, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(blocked.statusCode, 429);
  assert.match(blocked.body.error, /Too many login attempts/);
  assert.match(blocked.headers["Retry-After"], /^\d+$/);
});

test("clearLoginAttempts removes a user's failed-login lockout", () => {
  process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS = "1";
  const req = requestMock({ ip: "198.51.100.22", body: { username: "student" } });
  const initial = responseMock();
  loginRateLimit(req, initial, () => {});
  recordFailedLoginAttempt(req.loginAttemptKey);
  const blocked = responseMock();
  loginRateLimit(req, blocked, () => {});
  assert.equal(blocked.statusCode, 429);

  clearLoginAttempts(req.loginAttemptKey);
  const afterClear = responseMock();
  let nextCalled = false;
  loginRateLimit(req, afterClear, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(afterClear.statusCode, 200);
});

test("requestRateLimit uses the in-memory fallback and emits rate-limit headers", async () => {
  const middleware = requestRateLimit({ prefix: "test", limit: 2, windowSeconds: 60 });
  const run = async () => {
    const req = requestMock({ ip: "203.0.113.30" });
    const res = responseMock();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    return { res, nextCalled };
  };

  const first = await run();
  const second = await run();
  const third = await run();

  assert.equal(first.nextCalled, true);
  assert.equal(second.nextCalled, true);
  assert.equal(third.nextCalled, false);
  assert.equal(third.res.statusCode, 429);
  assert.equal(third.res.headers["X-RateLimit-Limit"], "2");
  assert.equal(third.res.headers["X-RateLimit-Remaining"], "0");
  assert.equal(third.res.body.error, "Too many requests. Please try again later.");
});

test("requestRateLimit reads environment defaults for limits and windows", async () => {
  process.env.API_RATE_LIMIT_MAX = "1";
  process.env.API_RATE_LIMIT_WINDOW_SECONDS = "30";
  const middleware = requestRateLimit();
  const req = requestMock({ ip: "203.0.113.31" });
  const first = responseMock();
  await middleware(req, first, () => {});
  const second = responseMock();
  await middleware(req, second, () => {});

  assert.equal(first.headers["X-RateLimit-Limit"], "1");
  assert.equal(second.statusCode, 429);
});

test("resolveFormSchema prefers a stored institution schema and falls back to defaults", () => {
  const stored = customSchema();
  const config = { forms: { student_report: stored } };
  assert.equal(resolveFormSchema(config, "student_report"), stored);
  assert.equal(resolveFormSchema({}, "student_report").categories.length > 0, true);
  assert.equal(resolveFormSchema({}, "not-a-form"), null);
});

test("getAllowedCategoryIds returns configured category identifiers", () => {
  const config = { forms: { student_report: customSchema() } };
  assert.deepEqual(getAllowedCategoryIds(config, "student_report"), ["maintenance_issue"]);
  assert.deepEqual(getAllowedCategoryIds({}, "unknown"), []);
});

test("validateReportSubmission rejects unknown form types and categories", () => {
  assert.deepEqual(
    validateReportSubmission({ formType: "unknown", category: "anything" }),
    { valid: false, error: "Unknown form type." },
  );
  assert.deepEqual(
    validateReportSubmission({ institutionConfig: { forms: { custom: customSchema() } }, formType: "custom", category: "invalid" }),
    { valid: false, error: "Invalid report category." },
  );
});

test("validateReportSubmission reports required, email, length and option errors", () => {
  const result = validateReportSubmission({
    institutionConfig: { forms: { custom: customSchema() } },
    formType: "custom",
    category: "maintenance_issue",
    coreValues: { email: "not-an-email" },
    detailValues: { description: "short", priority: "urgent" },
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 4);
  assert.equal(result.errors[0], "Title is required.");
  assert.equal(result.errors[1], "Email must be a valid email address.");
  assert.equal(result.errors[2], "Description must be at least 10 characters.");
  assert.equal(result.errors[3], "Priority has an invalid option.");
});

test("validateReportSubmission normalizes values and maps the student-involved toggle", () => {
  const result = validateReportSubmission({
    institutionConfig: { forms: { custom: customSchema() } },
    formType: "custom",
    category: "maintenance_issue",
    coreValues: { title: "  Broken light  ", email: "user@example.com" },
    detailValues: {
      description: "  The light is broken.  ",
      priority: "high",
      studentInvolved: "true",
    },
  });

  assert.deepEqual(result, {
    valid: true,
    details: { description: "The light is broken.", priority: "high" },
    studentInvolved: true,
  });
});

test("validateReportSubmission applies default detail values and false toggle values", () => {
  const schema = customSchema();
  schema.categories[0].fields[1].defaultValue = "low";
  const result = validateReportSubmission({
    institutionConfig: { forms: { custom: schema } },
    formType: "custom",
    category: "maintenance_issue",
    coreValues: { title: "Broken door" },
    detailValues: { description: "The door will not close", studentInvolved: false },
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.details, { description: "The door will not close", priority: "low" });
  assert.equal(result.studentInvolved, false);
});
