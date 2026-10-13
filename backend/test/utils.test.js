import test from "node:test";
import assert from "node:assert/strict";
import { canViewReport, getStaffReportScope, isReportOwner } from "../utils/studentReportAccess.js";
import {
  mapAnonymousReportForStaff,
  redactStudentReportForViewer,
} from "../utils/reportRedaction.js";
import { buildPortalConfig } from "../utils/formSchemaValidation.js";
import { buildAnalyticsSummary, buildReportActivity, classifyDisciplinaryIssue, classifyMaintenanceIssue } from "../utils/analytics.js";
import { createTrustedDeviceToken, getTrustedDeviceTtlMs, hashTrustedDeviceToken } from "../utils/twoFactorAuth.js";

const report = {
  owner_id: "student-1",
  owner_username: "student.one",
  owner_role: "student",
  student_involved: true,
  category: "disciplinary_case",
};

test("trusted-device tokens are random, hashable, and expire within the configured default window", () => {
  const first = createTrustedDeviceToken();
  const second = createTrustedDeviceToken();

  assert.notEqual(first.token, second.token);
  assert.equal(first.tokenHash, hashTrustedDeviceToken(first.token));
  assert.equal(first.tokenHash.length, 64);
  assert.ok(first.expiresAt.getTime() > Date.now());
  assert.ok(first.expiresAt.getTime() - Date.now() <= getTrustedDeviceTtlMs());
});

test("isReportOwner accepts either the user id or username", () => {
  assert.equal(isReportOwner({ id: "student-1" }, report), true);
  assert.equal(isReportOwner({ username: "student.one" }, report), true);
  assert.equal(isReportOwner({ id: "other-user" }, report), false);
});

test("canViewReport applies role-specific report access rules", () => {
  assert.equal(canViewReport({ role: "admin" }, report), true);
  assert.equal(canViewReport({ role: "dean_of_students" }, report), true);
  assert.equal(canViewReport({ role: "maintenance" }, report), false);
  assert.equal(canViewReport({ role: "student", id: "other-student" }, report), false);
});

test("getStaffReportScope returns the correct query for scoped roles", () => {
  assert.deepEqual(getStaffReportScope({ role: "maintenance" }), {
    category: "maintenance_issue",
    routed_to_maintenance: true,
  });
  assert.deepEqual(getStaffReportScope({ role: "admin" }), null);
});

test("redactStudentReportForViewer hides anonymous owner fields from non-owners", () => {
  const mapped = { ownerId: "student-1", ownerName: "Student One", title: "Example" };
  const redacted = redactStudentReportForViewer(mapped, { anonymous: true, ...report }, { id: "staff-1" });

  assert.equal(redacted.ownerId, undefined);
  assert.equal(redacted.ownerName, undefined);
  assert.equal(redacted.reporterHidden, true);
  assert.equal(redactStudentReportForViewer(mapped, { anonymous: true, ...report }, { id: "student-1" }), mapped);
});

test("mapAnonymousReportForStaff limits contact email to approved roles", () => {
  const doc = {
    _id: "report-1",
    tracking_code: "TRACK-1",
    category: "maintenance_issue",
    title: "Broken light",
    description: "The light is broken",
    location: "Block A",
    status: "open",
    contact_email: "reporter@example.com",
  };

  assert.equal(mapAnonymousReportForStaff(doc, "maintenance").contact_email, undefined);
  assert.equal(mapAnonymousReportForStaff(doc, "admin").contact_email, "reporter@example.com");
});

test("classifies common maintenance and disciplinary issues", () => {
  assert.equal(classifyMaintenanceIssue({ title: "Broken classroom light", description: "The bulb and socket need replacement" }), "lighting");
  assert.equal(classifyMaintenanceIssue({ title: "Hostel leak", description: "Water is leaking from the bathroom pipe" }), "plumbing");
  assert.equal(classifyDisciplinaryIssue({ title: "Missing laptop", description: "A laptop was stolen from the lab" }), "theft");
  assert.equal(classifyDisciplinaryIssue({ title: "Exam cheating", description: "The student copied answers" }), "academic_integrity");
});

test("buildAnalyticsSummary aggregates report types, issue categories, and admin system metrics", () => {
  const summary = buildAnalyticsSummary({
    studentReports: [
      { category: "maintenance_issue", title: "Broken light", description: "Bulb not working", status: "Submitted", createdAt: new Date() },
      { category: "disciplinary_case", title: "Fighting", description: "Physical fight", status: "Resolved", createdAt: new Date() },
    ],
    anonymousReports: [{ category: "maintenance_issue", title: "Water leak", description: "Pipe leak", status: "Submitted", createdAt: new Date() }],
    cases: [{ offense_type: "Fighting", description: "Altercation" }],
    users: [{ role: "admin" }, { role: "student" }, { role: "student" }],
  });

  assert.deepEqual(summary.reportTypes, [
    { label: "Maintenance", count: 2 },
    { label: "Disciplinary / Security", count: 1 },
  ]);
  assert.equal(summary.maintenanceIssues[0].label, "lighting");
  assert.equal(summary.maintenanceIssues[1].label, "plumbing");
  assert.equal(summary.disciplinaryIssues[0].label, "violence");
  assert.equal(summary.system.totalUsers, 3);
  assert.deepEqual(summary.system.usersByRole[0], { label: "student", count: 2 });
});

test("buildReportActivity keeps dashboard report groups for daily, monthly, and source distributions", () => {
  const activity = buildReportActivity({
    studentReports: [
      { category: "maintenance_issue", createdAt: "2026-10-10T09:00:00.000Z" },
      { category: "disciplinary_case", createdAt: "2026-10-10T11:00:00.000Z" },
    ],
    anonymousReports: [
      { category: "maintenance_issue", createdAt: "2026-10-11T08:00:00.000Z" },
    ],
    generatedAt: "2026-10-11T12:00:00.000Z",
  });

  assert.deepEqual(activity.distribution, [
    { label: "Maintenance", count: 1 },
    { label: "Discipline", count: 1 },
    { label: "Anonymous", count: 1 },
  ]);
  assert.deepEqual(activity.daily.at(-2), {
    period: "2026-10-10",
    maintenance: 1,
    discipline: 1,
    anonymous: 0,
  });
  assert.deepEqual(activity.daily.at(-1), {
    period: "2026-10-11",
    maintenance: 0,
    discipline: 0,
    anonymous: 1,
  });
  assert.deepEqual(activity.monthly, [{
    period: "2026-10",
    maintenance: 1,
    discipline: 1,
    anonymous: 1,
  }]);
});

test("buildPortalConfig merges environment and institution origins without duplicates", () => {
  const previous = process.env.PORTAL_EMBED_ORIGINS;
  process.env.PORTAL_EMBED_ORIGINS = "https://portal.example.com https://shared.example.com";
  const config = buildPortalConfig({
    institutionName: "KMU",
    portal: {
      enabled: true,
      allowedEmbedOrigins: ["https://shared.example.com", "https://campus.example.com"],
    },
  });

  assert.deepEqual(config.allowedEmbedOrigins, [
    "https://portal.example.com",
    "https://shared.example.com",
    "https://campus.example.com",
  ]);
  assert.equal(config.institutionName, "KMU");
  if (previous === undefined) delete process.env.PORTAL_EMBED_ORIGINS;
  else process.env.PORTAL_EMBED_ORIGINS = previous;
});
