"use client";

import { FilePenLine, LifeBuoy, ShieldCheck, Wrench } from '@/components/icons';
import { useAuth } from '../../context/AuthContext';

export default function HelpPage() {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  if (isStudent) {
    return (
      <section className="w-full space-y-8">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kmuGreen/10 text-kmuGreen">
                <LifeBuoy size={18} />
              </div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Help</h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 md:text-right">
              Everything you need to submit reports confidently and track them from your student dashboard.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow">
            <div className="flex items-center gap-3 mb-4">
              <FilePenLine className="text-kmuGreen" size={22} />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">How to make a report</h2>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li>Open the `Make a Report` page from the sidebar.</li>
              <li>Select whether the issue is a disciplinary case or a maintenance issue.</li>
              <li>Fill in the title, location, date, and full description.</li>
              <li>Use the anonymous toggle if you want the report handled anonymously.</li>
              <li>Submit the form and keep your tracking code for reference.</li>
            </ol>
          </div>

          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow">
            <div className="flex items-center gap-3 mb-4">
              <LifeBuoy className="text-kmuOrange" size={22} />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">How tracking works</h2>
            </div>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>Your reports appear on the `My Reports` page.</li>
              <li>Each report has a tracking code and a status timeline.</li>
              <li>Anonymous reports can still be tracked from your account.</li>
              <li>Open a report card to review its description, status, and updates.</li>
            </ul>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="text-red-600 dark:text-red-300" size={20} />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Disciplinary cases</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              Use disciplinary reporting for misconduct, harassment, intimidation, vandalism, theft, or safety concerns involving behavior.
            </p>
          </div>

          <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Wrench className="text-blue-600 dark:text-blue-300" size={20} />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Maintenance issues</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              Use maintenance reporting for broken facilities, damaged furniture, electrical faults, plumbing problems, or unsafe campus spaces.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kmuGreen/10 text-kmuGreen">
              <LifeBuoy size={18} />
            </div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Help & Documentation</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 md:text-right">
            Welcome to Campus Reports. Use this guide to navigate the system and complete your daily work.
          </p>
        </div>
      </div>

      <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-kmuOrange">Quick Start</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3 text-kmuGreen">Core navigation</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>Use the sidebar to move between dashboards, cases, reports, and profile tools.</li>
              <li>Open your role dashboard to view current activity and quick actions.</li>
              <li>Use the profile page to manage your account details and password.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3 text-kmuGreen">Operational tips</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>Use search and filters to narrow large datasets quickly.</li>
              <li>Keep evidence and case descriptions clear and complete.</li>
              <li>Use export tools when you need records for formal reporting.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
        <h2 className="text-2xl font-semibold mb-4 text-kmuOrange">Key Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3 text-kmuGreen">Case Management</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>Create and track student or staff disciplinary cases.</li>
              <li>Manage offense types, severity, sanctions, and case status.</li>
              <li>Review detailed case histories and linked evidence.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3 text-kmuGreen">System Support</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>Offline support helps preserve work in limited connectivity.</li>
              <li>Audit and reporting tools improve transparency and oversight.</li>
              <li>Profile settings let users maintain their own account details.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
