export type WorkOrderPart = "partA" | "partB" | "partC" | "partD" | "partE";

const PART_EDIT_ROLES: Record<WorkOrderPart, string[]> = {
  partA: [
    "admin",
    "secretary",
    "registrar",
    "dean_of_students",
    "assistant_dean",
    "chief_security_officer",
  ],
  partB: ["admin", "maintenance"],
  partC: [
    "admin",
    "secretary",
    "registrar",
    "dean_of_students",
    "assistant_dean",
    "chief_security_officer",
  ],
  partD: [
    "admin",
    "secretary",
    "registrar",
    "dean_of_students",
    "assistant_dean",
    "chief_security_officer",
  ],
  partE: ["admin", "maintenance"],
};

export function canEditWorkOrderPart(
  role: string | undefined,
  part: WorkOrderPart,
): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  return PART_EDIT_ROLES[part].includes(role);
}

export function workOrderPartLabel(part: WorkOrderPart): string {
  switch (part) {
    case "partA":
      return "Part A (requesting department)";
    case "partB":
      return "Part B (artisan inspection)";
    case "partC":
      return "Part C (supervisor approval)";
    case "partD":
      return "Part D (completion confirmation)";
    case "partE":
      return "Part E (maintenance officer report)";
    default:
      return part;
  }
}
