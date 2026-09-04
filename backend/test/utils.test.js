import test from "node:test";
import assert from "node:assert/strict";
import { canViewReport, getStaffReportScope, isReportOwner } from "../utils/studentReportAccess.js";
import {
  mapAnonymousReportForStaff,
  redactStudentReportForViewer,
} from "../utils/reportRedaction.js";
import { buildPortalConfig } from "../utils/formSchemaValidation.js";

const report = {
  owner_id: "student-1",
  owner_username: "student.one",
  owner_role: "student",
  student_involved: true,
  category: "disciplinary_case",
};

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
