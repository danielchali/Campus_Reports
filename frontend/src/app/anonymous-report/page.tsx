"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Ghost,
  MapPin,
  Calendar,
  FileText,
  Mail,
  CheckCircle2,
  Copy,
  ArrowLeft,
  ChevronRight,
  Lock,
  AlertTriangle,
} from '@/components/icons';
import { API_BASE_URL } from '../../config/constants';
import SchemaCategoryPicker from '../../components/reporting/SchemaCategoryPicker';
import SchemaFormFields from '../../components/reporting/SchemaFormFields';
import { useFormSchema } from '../../hooks/useFormSchema';
import { subscribeGuidedApply } from '../../utils/guidedReportBridge';
import { applyGuidedFieldsToAnonymousReport } from '../../utils/applyGuidedReportFields';
import { getTodayDateInputValue } from '../../utils/dateTimeDefaults';
import { buildDefaultDetailValues, getCategoryById } from '../../utils/formSchemas';
import CampusBackground from '../../components/CampusBackground';

type Category = 'disciplinary_case' | 'maintenance_issue' | 'other';

type Step = 'form' | 'success';

export default function AnonymousReportPage() {
  const { schema, institutionName } = useFormSchema('anonymous_report');
  const [step, setStep] = useState<Step>('form');
  const [category, setCategory] = useState<Category>('disciplinary_case');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState(getTodayDateInputValue);
  const [contactEmail, setContactEmail] = useState('');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Track-report tab
  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackError, setTrackError] = useState('');
  const [tracking, setTracking] = useState(false);
  const [activeTab, setActiveTab] = useState<'report' | 'track'>('report');

  const activeCategory = getCategoryById(schema, category);
  const descriptionMinLength =
    schema.commonFields.find((field) => field.id === 'description')?.minLength || 10;

  useEffect(() => {
    setDetails(buildDefaultDetailValues(schema, category));
  }, [schema, category]);

  useEffect(() => {
    return subscribeGuidedApply((fields) => {
      applyGuidedFieldsToAnonymousReport(fields, {
        setCategory,
        setTitle,
        setDescription,
        setLocation,
        setIncidentDate,
        setContactEmail,
      });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/anonymous-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          incident_date: incidentDate,
          contact_email: contactEmail.trim(),
          details,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Submission failed. Please try again.');
        return;
      }

      setTrackingCode(data.tracking_code);
      setStep('success');
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setTracking(true);
    setTrackError('');
    setTrackResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/anonymous-reports/track/${trackInput.trim().toUpperCase()}`);
      const data = await res.json();

      if (!res.ok) {
        setTrackError(data.error || 'Report not found.');
        return;
      }
      setTrackResult(data);
    } catch {
      setTrackError('Network error. Please try again.');
    } finally {
      setTracking(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setStep('form');
    setTitle('');
    setDescription('');
    setLocation('');
    setIncidentDate(getTodayDateInputValue());
    setContactEmail('');
    setCategory('disciplinary_case');
    setDetails(buildDefaultDetailValues(schema, 'disciplinary_case'));
    setTrackingCode('');
    setError('');
  };

  const handleDetailChange = (fieldId: string, value: string) => {
    setDetails((current) => ({ ...current, [fieldId]: value }));
  };

  const statusColors: Record<string, string> = {
    Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'Under Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'In Progress': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    Resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 md:bg-transparent">
      <CampusBackground />
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="w-full px-4 md:px-8 py-3 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-kmuGreen transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
          <div className="flex items-center gap-2">
            <img src="/kmu_logo.svg" alt="KMU" className="h-8 w-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span className="font-bold text-kmuGreen hidden sm:block">{institutionName}</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 w-full px-4 md:px-8 py-4 md:py-6 flex flex-col gap-4 md:gap-6">

        {/* Page Title — compact two-line hero */}
        <div className="shrink-0">
          <div className="flex items-center justify-center gap-2.5 md:gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20 shrink-0">
              <Ghost className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Anonymous Reporting</h1>
          </div>
          <p className="mt-1.5 md:mt-2 text-center text-xs md:text-base text-slate-600 dark:text-slate-400 leading-snug md:leading-normal px-1">
            <span className="md:hidden">Confidential &amp; anonymous — tap AI below for guided help.</span>
            <span className="hidden md:inline">
              Submit confidentially without an account — your identity stays protected.{' '}
              <span className="text-slate-500">Use Campus Reports AI (bottom-right) for guided help.</span>
            </span>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl bg-slate-200/50 dark:bg-slate-900/50 p-1 gap-1 md:p-1.5 md:gap-1.5 backdrop-blur-sm shrink-0 w-full md:max-w-none">
          <button
            onClick={() => setActiveTab('report')}
            className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2.5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 ${
              activeTab === 'report'
                ? 'bg-white dark:bg-slate-800 text-kmuGreen dark:text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4 md:w-4.5 md:h-4.5" />
            <span className="sm:hidden">Submit</span>
            <span className="hidden sm:inline">Submit a Report</span>
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2.5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 ${
              activeTab === 'track'
                ? 'bg-white dark:bg-slate-800 text-kmuGreen dark:text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ChevronRight className="w-4 h-4 md:w-4.5 md:h-4.5" />
            <span className="hidden sm:inline">Track My Report</span>
            <span className="sm:hidden">Track</span>
          </button>
        </div>

        {/* ─────────────── SUBMIT TAB ─────────────── */}
        {activeTab === 'report' && (
          <div className="flex-1 flex flex-col min-h-0">
            {step === 'form' && (
              <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 md:p-8 lg:p-10 space-y-5 md:space-y-8">

                {error && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400 text-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                {/* Category Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-kmuGreen rounded-full"></div>
                    <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">Select Category</h2>
                  </div>

                  <SchemaCategoryPicker
                    categories={schema.categories}
                    value={category}
                    onChange={(nextCategory) => setCategory(nextCategory as Category)}
                  />
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                  {/* Title + Location + Date — three columns on large screens */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1.5">
                      <label htmlFor="anon-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Report Title <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="anon-title"
                          type="text"
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Brief title for the issue"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-kmuGreen focus:bg-white dark:focus:bg-slate-800 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="anon-location" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Location <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="anon-location"
                          type="text"
                          required
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Building, block, classroom, hostel..."
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-kmuGreen focus:bg-white dark:focus:bg-slate-800 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="anon-date" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Date of Incident <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="anon-date"
                          type="date"
                          required
                          value={incidentDate}
                          onChange={(e) => setIncidentDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-kmuGreen focus:bg-white dark:focus:bg-slate-800 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description + Email — side by side on large screens */}
                  <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
                  <div className="space-y-1.5">
                    <label htmlFor="anon-desc" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Full Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="anon-desc"
                      required
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what happened in detail — who or what was involved, what occurred, and why this needs attention. Do NOT include your own personal information."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-kmuGreen focus:bg-white dark:focus:bg-slate-800 transition-colors resize-none lg:min-h-[180px]"
                    />
                    <p className="text-xs text-slate-400">
                      {description.length} characters — aim for at least {descriptionMinLength} for a useful report.
                    </p>
                  </div>

                  {!!activeCategory?.fields?.length && (
                    <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 md:p-5">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{activeCategory.label} Details</h3>
                      <SchemaFormFields
                        fields={activeCategory.fields}
                        values={details}
                        onChange={handleDetailChange}
                        idPrefix="anon"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="anon-email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Contact Email <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="anon-email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="Only if you want to receive updates"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-kmuGreen focus:bg-white dark:focus:bg-slate-800 transition-colors"
                      />
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Only seen by authorised staff for follow-up.
                    </p>
                  </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || description.length < descriptionMinLength}
                    className="w-full bg-kmuGreen hover:bg-kmuGreen-dark text-white py-4 rounded-xl font-bold shadow-lg shadow-kmuGreen/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Ghost className="w-5 h-5" />
                        Submit Anonymously
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ─── SUCCESS STATE ─── */}
            {step === 'success' && (
              <div className="flex-1 flex flex-col justify-center bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 md:p-12 text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Report Submitted!</h2>
                  <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                    Your anonymous report has been received and will be reviewed by the relevant office. Save your tracking code — you can use it to check your report's status at any time.
                  </p>
                </div>

                <div className="inline-block bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-8 py-5 mx-auto">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Your Tracking Code</p>
                  <p className="text-3xl font-extrabold tracking-widest text-kmuGreen">{trackingCode}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={copyCode}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-kmuGreen text-kmuGreen font-bold hover:bg-kmuGreen/5 transition-all"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Submit Another Report
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  You can also track your report under the{' '}
                  <button onClick={() => { setActiveTab('track'); setTrackInput(trackingCode); }} className="text-kmuGreen underline">
                    Track My Report
                  </button>{' '}
                  tab.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─────────────── TRACK TAB ─────────────── */}
        {activeTab === 'track' && (
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-10 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Check Report Status</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Enter the tracking code you received when you submitted your report.
              </p>
            </div>

            <form onSubmit={handleTrack} className="flex gap-3">
              <input
                type="text"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                placeholder="e.g. KMU-ABCD-1234"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono uppercase focus:outline-none focus:border-kmuGreen focus:bg-white dark:focus:bg-slate-800 transition-colors tracking-widest"
              />
              <button
                type="submit"
                disabled={tracking || !trackInput.trim()}
                className="px-6 py-3 bg-kmuGreen hover:bg-kmuGreen-dark text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
              >
                {tracking ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Track
              </button>
            </form>

            {trackError && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {trackError}
              </div>
            )}

            {trackResult && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tracking Code</p>
                    <p className="text-lg font-extrabold text-kmuGreen tracking-widest mt-0.5">{trackResult.tracking_code}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[trackResult.status] || 'bg-slate-100 text-slate-600'}`}>
                    {trackResult.status}
                  </span>
                </div>
                <div className="p-5 grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Title</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{trackResult.title}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Category</p>
                    <p className="font-semibold text-slate-900 dark:text-white capitalize">{trackResult.category.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Location</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{trackResult.location}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Incident Date</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{trackResult.incident_date}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Submitted</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{new Date(trackResult.submitted_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
