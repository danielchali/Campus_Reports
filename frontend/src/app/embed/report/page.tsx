'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Copy, Ghost, Loader2 } from '@/components/icons';
import SchemaCategoryPicker from '../../../components/reporting/SchemaCategoryPicker';
import SchemaFormFields from '../../../components/reporting/SchemaFormFields';
import { API_BASE_URL } from '../../../config/constants';
import { useFormSchema } from '../../../hooks/useFormSchema';
import { getTodayDateInputValue } from '../../../utils/dateTimeDefaults';
import { buildDefaultDetailValues, getCategoryById } from '../../../utils/formSchemas';
import { postToParent, subscribePortalPrefill } from '../../../utils/portalBridge';

export default function EmbedReportPage() {
  const searchParams = useSearchParams();
  const { schema, institutionName, portal, loading } = useFormSchema('anonymous_report');
  const initialCategory = searchParams.get('category') || schema.categories[0]?.id || 'disciplinary_case';

  const [category, setCategory] = useState(initialCategory);
  const [title, setTitle] = useState(searchParams.get('title') || '');
  const [description, setDescription] = useState(searchParams.get('description') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [incidentDate, setIncidentDate] = useState(searchParams.get('incident_date') || getTodayDateInputValue());
  const [contactEmail, setContactEmail] = useState('');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const lockedCategory = searchParams.get('category');
  const activeCategory = getCategoryById(schema, category);

  useEffect(() => {
    postToParent('ready', { institutionName, portalEnabled: portal?.enabled !== false });
  }, [institutionName, portal?.enabled]);

  useEffect(() => {
    setDetails(buildDefaultDetailValues(schema, category));
  }, [schema, category]);

  useEffect(() => {
    return subscribePortalPrefill((payload) => {
      if (payload.category) setCategory(payload.category);
      if (payload.title) setTitle(payload.title);
      if (payload.location) setLocation(payload.location);
      if (payload.incident_date) setIncidentDate(payload.incident_date);
      if (payload.description) setDescription(payload.description);
      if (payload.details) setDetails((current) => ({ ...current, ...payload.details }));
    });
  }, []);

  const descriptionMinLength = useMemo(() => {
    return schema.commonFields.find((field) => field.id === 'description')?.minLength || 10;
  }, [schema.commonFields]);

  const handleDetailChange = (fieldId: string, value: string) => {
    setDetails((current) => ({ ...current, [fieldId]: value }));
  };

  const copyTrackingCode = async () => {
    await navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/anonymous-reports`, {
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

      const data = await response.json();
      if (!response.ok) {
        const message = data.error || 'Submission failed.';
        setError(message);
        postToParent('error', { message });
        return;
      }

      setTrackingCode(data.tracking_code);
      setSubmitted(true);
      postToParent('submitted', {
        tracking_code: data.tracking_code,
        category,
      });
    } catch {
      const message = 'Network error. Please try again.';
      setError(message);
      postToParent('error', { message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 animate-spin text-kmuGreen" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Report Submitted</h1>
          <p className="text-sm text-slate-500">Your tracking code:</p>
          <div className="flex items-center justify-center gap-3">
            <p className="text-3xl font-extrabold tracking-widest text-kmuGreen">{trackingCode}</p>
            <button
              type="button"
              onClick={copyTrackingCode}
              aria-label={copied ? 'Tracking code copied' : 'Copy tracking code'}
              title={copied ? 'Copied' : 'Copy tracking code'}
              className="rounded-lg p-2 text-kmuGreen transition hover:bg-kmuGreen/10"
            >
              <Copy className="h-5 w-5" />
            </button>
          </div>
          {copied && <p className="text-sm font-medium text-emerald-600">Copied!</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center">
            <Ghost className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              {portal?.embedTitle || 'Report an Issue'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {portal?.embedSubtitle || institutionName}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-8 space-y-6">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Select Category</h2>
            <SchemaCategoryPicker
              categories={schema.categories}
              value={category}
              onChange={setCategory}
              lockedCategory={lockedCategory}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Report Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Location <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Date of Incident <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={incidentDate}
                onChange={(event) => setIncidentDate(event.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Full Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm resize-none"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {description.length} characters — aim for at least {descriptionMinLength}.
            </p>
          </div>

          {!!activeCategory?.fields?.length && (
            <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">{activeCategory.label} Details</h3>
              <SchemaFormFields
                fields={activeCategory.fields}
                values={details}
                onChange={handleDetailChange}
                idPrefix="embed"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Contact Email <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || description.length < descriptionMinLength}
            className="w-full bg-kmuGreen hover:bg-kmuGreen-dark text-white py-4 rounded-xl font-bold disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Anonymously'}
          </button>
        </form>
      </div>
    </div>
  );
}
