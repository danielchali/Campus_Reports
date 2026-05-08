"use client";

import { useState } from 'react';
import Link from 'next/link';
import {
  Ghost,
  Megaphone,
  Wrench,
  AlertTriangle,
  MapPin,
  Calendar,
  FileText,
  Mail,
  CheckCircle2,
  Copy,
  ArrowLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { API_BASE_URL } from '../../config/constants';

type Category = 'disciplinary_case' | 'maintenance_issue' | 'other';

const CATEGORIES = [
  {
    value: 'disciplinary_case' as Category,
    label: 'Disciplinary Issue',
    description: 'Misconduct, harassment, theft, bullying, violence, or other behaviour that needs formal review.',
    icon: AlertTriangle,
    color: 'rose',
  },
  {
    value: 'maintenance_issue' as Category,
    label: 'Maintenance Issue',
    description: 'Damaged classrooms, broken equipment, lighting issues, leaks, or safety hazards around campus.',
    icon: Wrench,
    color: 'amber',
  },
  {
    value: 'other' as Category,
    label: 'Other / General',
    description: 'Any other concern that does not fit the above categories.',
    icon: Megaphone,
    color: 'blue',
  },
];

type Step = 'form' | 'success';

export default function AnonymousReportPage() {
  const [step, setStep] = useState<Step>('form');
  const [category, setCategory] = useState<Category>('disciplinary_case');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [contactEmail, setContactEmail] = useState('');
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
    setIncidentDate('');
    setContactEmail('');
    setCategory('disciplinary_case');
    setTrackingCode('');
    setError('');
  };

  const statusColors: Record<string, string> = {
    Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'Under Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'In Progress': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    Resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-kmuGreen transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
          <div className="flex items-center gap-2">
            <img src="/kmu_logo.svg" alt="KMU" className="h-8 w-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span className="font-bold text-kmuGreen hidden sm:block">Campus Reports</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Page Title */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl shadow-purple-500/20 mb-2">
            <Ghost className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Anonymous Reporting</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-base leading-relaxed">
            Your voice matters. Submit reports confidentially without an account. 
            <span className="block mt-1 font-medium text-kmuGreen">Your identity remains 100% protected.</span>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl bg-slate-200/50 dark:bg-slate-900/50 p-1.5 gap-1.5 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab('report')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'report'
                ? 'bg-white dark:bg-slate-800 text-kmuGreen dark:text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="w-4.5 h-4.5" />
            Submit a Report
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'track'
                ? 'bg-white dark:bg-slate-800 text-kmuGreen dark:text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ChevronRight className="w-4.5 h-4.5" />
            Track My Report
          </button>
        </div>

        {/* ─────────────── SUBMIT TAB ─────────────── */}
        {activeTab === 'report' && (
          <>
            {step === 'form' && (
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-200 dark:border-slate-800 p-8 md:p-12 space-y-10">

                {error && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400 text-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                {/* Category Selection */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-kmuGreen rounded-full"></div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select Category</h2>
                  </div>

                  {/* Mobile dropdown */}
                  <div className="md:hidden">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-kmuGreen"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {CATEGORIES.find(c => c.value === category)?.description}
                    </p>
                  </div>

                  {/* Desktop cards */}
                  <div className="hidden md:grid gap-4 md:grid-cols-3">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.value;
                      const colorClasses: Record<string, string> = {
                        rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
                        amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
                        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                      };
                      return (
                        <label
                          key={cat.value}
                          className={`group flex flex-col gap-3 p-5 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 ${
                            isSelected
                              ? 'border-kmuGreen bg-kmuGreen/5 dark:bg-kmuGreen/10 ring-4 ring-kmuGreen/10'
                              : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-200 dark:hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="category"
                            value={cat.value}
                            checked={isSelected}
                            onChange={() => setCategory(cat.value)}
                            className="sr-only"
                          />
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${colorClasses[cat.color]}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-base text-slate-900 dark:text-white">{cat.label}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{cat.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title + Location */}
                  <div className="grid gap-5 md:grid-cols-2">
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
                  </div>

                  {/* Date */}
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

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label htmlFor="anon-desc" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Full Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="anon-desc"
                      required
                      rows={6}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what happened in detail — who or what was involved, what occurred, and why this needs attention. Do NOT include your own personal information."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-kmuGreen focus:bg-white dark:focus:bg-slate-800 transition-colors resize-none"
                    />
                    <p className="text-xs text-slate-400">{description.length} characters — aim for at least 50 for a useful report.</p>
                  </div>

                  {/* Optional email */}
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
                      If provided, this email is only seen by authorised staff and used solely for follow-up.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || description.length < 10}
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
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 md:p-12 text-center space-y-6">
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
          </>
        )}

        {/* ─────────────── TRACK TAB ─────────────── */}
        {activeTab === 'track' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-10 space-y-6">
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
