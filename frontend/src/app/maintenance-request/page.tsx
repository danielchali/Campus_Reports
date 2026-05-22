import { redirect } from "next/navigation";

export default function MaintenanceRequestPage() {
  redirect("/make-report?category=maintenance_issue");
}
