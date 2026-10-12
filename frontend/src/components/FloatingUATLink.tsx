"use client";

import Link from "next/link";
import { ClipboardList } from "@/components/icons";

export default function FloatingUATLink() {
  return (
    <Link
      href="/sus-uat"
      aria-label="Open UAT Survey"
      title="UAT Survey"
      className="fixed bottom-20 right-3 z-[90] inline-flex h-10 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-600 px-3 text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:border-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 dark:focus:ring-offset-slate-950 sm:bottom-24 sm:right-4 sm:gap-2 sm:px-4 md:bottom-6 md:right-24 md:h-auto md:py-2.5"
    >
      <ClipboardList className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="text-xs font-semibold sm:text-sm">UAT Survey</span>
    </Link>
  );
}
