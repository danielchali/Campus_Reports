"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageSkeleton } from "../../../components/PageSkeleton";

export default function FormSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/system-settings");
  }, [router]);

  return <PageSkeleton />;
}
