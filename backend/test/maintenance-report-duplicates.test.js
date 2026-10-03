import test from "node:test";
import assert from "node:assert/strict";
import {
  findActiveMaintenanceReportDuplicate,
  getMaintenanceDuplicateMessage,
} from "../utils/maintenanceReportDuplicates.js";

function modelFrom(records) {
  return {
    find(query) {
      const activeRecords = records.filter(
        (record) => !query.status.$nin.includes(record.status),
      );
      return {
        select: async () => activeRecords,
      };
    },
  };
}

test("blocks an active maintenance report for the same normalized room and issue type", async () => {
  const duplicate = await findActiveMaintenanceReportDuplicate({
    StudentReportModel: modelFrom([
      {
        _id: "student-report-1",
        category: "maintenance_issue",
        status: "Under Review",
        location: "  A-101 ",
        details: { issueType: "Electrical" },
      },
    ]),
    AnonymousReportModel: modelFrom([]),
    location: "a-101",
    issueType: " electrical ",
  });

  assert.equal(duplicate?._id, "student-report-1");
});

test("allows a replacement report after the prior issue is resolved, completed, or closed", async () => {
  const duplicate = await findActiveMaintenanceReportDuplicate({
    StudentReportModel: modelFrom([
      {
        _id: "resolved-report",
        category: "maintenance_issue",
        status: "Resolved",
        location: "A-101",
        details: { issueType: "Electrical" },
      },
      {
        _id: "completed-report",
        category: "maintenance_issue",
        status: "Completed",
        location: "A-101",
        details: { issueType: "Electrical" },
      },
      {
        _id: "closed-report",
        category: "maintenance_issue",
        status: "Closed",
        location: "A-101",
        details: { issueType: "Electrical" },
      },
    ]),
    AnonymousReportModel: modelFrom([]),
    location: "A-101",
    issueType: "Electrical",
  });

  assert.equal(duplicate, null);
  assert.match(
    getMaintenanceDuplicateMessage("A-101", "Electrical"),
    /completed or closed/i,
  );
});
