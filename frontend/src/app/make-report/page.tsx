"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, FilePenLine, ShieldAlert, Wrench } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../../components/PageSkeleton';
import { createStudentReport, type StudentReportCategory } from '../../utils/studentReports';

const categoryOptions: Array<{
  value: StudentReportCategory;
  label: string;
  description: string;
}> = [
  {
    value: 'disciplinary_case',
    label: 'Disciplinary Case',
    description: 'Misconduct, harassment, theft, intimidation, violence, or other behavior that needs formal review.',
  },
  {
    value: 'maintenance_issue',
    label: 'Maintenance Issue',
    description: 'Damaged classrooms, broken equipment, lighting issues, leaks, or safety hazards around campus.',
  },
];

export default function MakeReportPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [category, setCategory] = useState<StudentReportCategory>('disciplinary_case');
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (typeof window !== 'undefined') {
    if (!authLoading && !token) {
      router.replace('/login');
    }
    if (!token) {
      return <PageSkeleton />;
    }

    if (!user || user.role !== 'student') {
      return <div className="text-red-600">Access denied.</div>;
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (!user) {
        throw new Error('You must be logged in to submit a report.');
      }

      const report = await createStudentReport(
        {
          title,
          description,
          category,
          anonymous,
          location,
          incidentDate,
        },
        {
          id: user.id,
          username: user.username,
          name: user.name,
        },
      );

      setSuccess('Your report has been submitted successfully.');
      setTrackingCode(report.trackingCode);
      setTitle('');
      setDescription('');
      setLocation('');
      setIncidentDate('');
      setAnonymous(false);
      setCategory('disciplinary_case');
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-4xl mx-auto space-y-6 md:space-y-8">
      <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-gray-800 p-4 md:p-8 shadow">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 md:gap-4">
          <div className="rounded-lg md:rounded-2xl bg-kmuGreen/10 p-2 md:p-3 text-kmuGreen flex-shrink-0">
            <FilePenLine size={22} />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-kmuGreen">Make a Report</h1>
            <p className="mt-2 md:mt-3 text-gray-600 dark:text-gray-400 text-sm md:text-lg">
              Submit a concern, choose the type of issue, and decide whether the report should be handled anonymously.
            </p>
          </div>
        </div>
      </div>

      {success && (
        <div className="rounded-lg md:rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-3 md:p-4 text-emerald-800 dark:text-emerald-300">
          <div className="flex items-start gap-2 md:gap-3">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm md:text-base">{success}</p>
              {trackingCode && (
                <p className="text-xs md:text-sm mt-1">
                  Tracking code: <span className="font-semibold">{trackingCode}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg md:rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 md:p-4 text-red-700 dark:text-red-300">
          <div className="flex items-start gap-2 md:gap-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <p className="text-sm md:text-base">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl md:rounded-3xl bg-white dark:bg-gray-800 p-4 md:p-8 shadow space-y-6 md:space-y-8">
        <div>
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">Reporting Form</h2>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-2">
            Provide enough detail for follow-up and review. You can still track anonymous submissions from your account.
          </p>
        </div>

        {/* Mobile dropdown */}
        <div className="md:hidden">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as StudentReportCategory)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-kmuGreen"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {categoryOptions.find(o => o.value === category)?.description}
          </p>
        </div>

        {/* Desktop cards */}
        <div className="hidden md:grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
          {categoryOptions.map((option) => (
            <label
              key={option.value}
              className={`rounded-lg md:rounded-2xl border p-3 md:p-5 cursor-pointer transition ${
                category === option.value
                  ? 'border-kmuGreen bg-kmuGreen/5'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start gap-2 md:gap-3">
                <input
                  type="radio"
                  name="reportCategory"
                  value={option.value}
                  checked={category === option.value}
                  onChange={() => setCategory(option.value)}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                    {option.value === 'disciplinary_case' ? <ShieldAlert size={16} /> : <Wrench size={16} />}
                    {option.label}
                  </div>
                  <p className="mt-1 md:mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="title" className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base">
              Report Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Briefly describe the issue"
              className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="location" className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Hostel, classroom, lab, walkway, or building"
              className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="incidentDate" className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base">
            Date of Incident or Observation
          </label>
          <input
            id="incidentDate"
            type="date"
            value={incidentDate}
            onChange={(e) => setIncidentDate(e.target.value)}
            className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block mb-2 font-medium text-gray-900 dark:text-white text-sm md:text-base">
            Full Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder="Explain what happened, who or what was involved, and why this needs attention."
            className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
            required
          />
        </div>

        <div className="rounded-lg md:rounded-2xl border border-gray-200 dark:border-gray-700 p-3 md:p-5">
          <div className="flex items-start justify-between gap-3 md:gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Anonymous Report</h3>
              <p className="mt-1 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Turn this on if you want the report handled as anonymous. You will still be able to track it from your account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAnonymous((current) => !current)}
              className={`relative inline-flex h-7 md:h-8 w-12 md:w-14 items-center rounded-full transition flex-shrink-0 ${
                anonymous ? 'bg-kmuGreen' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-pressed={anonymous}
              aria-label="Toggle anonymous report"
            >
              <span
                className={`inline-block h-5 md:h-6 w-5 md:w-6 transform rounded-full bg-white transition ${
                  anonymous ? 'translate-x-6 md:translate-x-7' : 'translate-x-0.5 md:translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg md:rounded-xl bg-kmuGreen px-4 md:px-6 py-2 md:py-3 text-sm md:text-base text-white font-semibold hover:bg-kmuOrange transition disabled:opacity-60 w-full sm:w-auto"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/my-reports')}
            className="rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700 px-4 md:px-6 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition w-full sm:w-auto"
          >
            Go to My Reports
          </button>
        </div>
      </form>
    </section>
  );
}
