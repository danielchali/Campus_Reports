import { redirect } from "next/navigation";

export default function SecurityDisciplinaryIssuePage() {
  redirect("/make-report?category=disciplinary_case");
}
