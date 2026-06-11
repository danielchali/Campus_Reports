'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Loader2, Save, Settings2 } from 'lucide-react';
import RoleProtectedRoute from '../../(protected)/RoleProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { PageSkeleton } from '../../../components/PageSkeleton';
import { API_BASE_URL } from '../../../config/constants';
import type { InstitutionFormConfig } from '../../../types/formSchema';
import { fetchPortalConfig, updateInstitutionFormConfig } from '../../../utils/formSchemas';

function FormSettingsContent() {
  const { token } = useAuth();
  const [config, setConfig] = useState<InstitutionFormConfig | null>(null);
  const [portalMeta, setPortalMeta] = useState<InstitutionFormConfig['portal'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const [institutionName, setInstitutionName] = useState('');
  const [embedTitle, setEmbedTitle] = useState('');
  const [embedSubtitle, setEmbedSubtitle] = useState('');
  const [allowedOrigins, setAllowedOrigins] = useState('');

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [fullConfigResponse, portalResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/form-schemas`, { cache: 'no-store' }),
        fetchPortalConfig(),
      ]);

      if (!fullConfigResponse.ok) {
        throw new Error('Failed to load form configuration');
      }

      const fullConfig = await fullConfigResponse.json();
      setConfig(fullConfig);
      setPortalMeta(portalResponse);
      setInstitutionName(fullConfig.institutionName || '');
      setEmbedTitle(portalResponse.embedTitle || '');
      setEmbedSubtitle(portalResponse.embedSubtitle || '');
      setAllowedOrigins((portalResponse.allowedEmbedOrigins || []).join('\n'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateInstitutionFormConfig(token, {
        institutionName,
        portal: {
          embedTitle,
          embedSubtitle,
          allowedEmbedOrigins: allowedOrigins
            .split(/[\n,]+/)
            .map((origin) => origin.trim())
            .filter(Boolean),
        },
      });
      setConfig(updated);
      setSuccess('Institution form settings saved.');
      const portalResponse = await fetchPortalConfig();
      setPortalMeta(portalResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const iframeSnippet =
    portalMeta?.integrationGuide?.iframeExample ||
    `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/report" title="Campus Reports" width="100%" height="720" style="border:0;border-radius:12px;"></iframe>`;

  const copySnippet = async () => {
    await navigator.clipboard.writeText(iframeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-kmuGreen/10 text-kmuGreen flex items-center justify-center">
          <Settings2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Form & Portal Settings</h1>
          <p className="text-sm text-slate-500">
            Configure modular reporting forms and student portal embed integration.
          </p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Institution Profile</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Institution Name</label>
            <input
              value={institutionName}
              onChange={(event) => setInstitutionName(event.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Schema Version</label>
            <input
              value={config?.version || 1}
              disabled
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-4 py-3 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Portal Embed</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Embed Title</label>
            <input
              value={embedTitle}
              onChange={(event) => setEmbedTitle(event.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Embed Subtitle</label>
            <input
              value={embedSubtitle}
              onChange={(event) => setEmbedSubtitle(event.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Allowed Embed Origins (one per line)
            </label>
            <textarea
              rows={4}
              value={allowedOrigins}
              onChange={(event) => setAllowedOrigins(event.target.value)}
              placeholder="https://portal.university.edu&#10;https://lms.university.edu"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm resize-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Iframe Snippet</label>
            <button
              type="button"
              onClick={copySnippet}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-slate-950 text-slate-100 p-4 text-xs leading-relaxed">
            {iframeSnippet}
          </pre>
          <p className="text-xs text-slate-500">
            Embed URL: <code className="text-kmuGreen">{portalMeta?.embedUrl || '/embed/report'}</code>
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Form Modules</h2>
        <p className="text-sm text-slate-500">
          Standard reporting forms are modular by category. Institutions can adopt these schemas in the student portal embed or native pages.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {(['anonymous_report', 'student_report'] as const).map((formType) => {
            const form = config?.forms?.[formType];
            return (
              <div key={formType} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white capitalize">
                  {formType.replace('_', ' ')}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {form?.categories?.length || 0} categories · {form?.commonFields?.length || 0} common fields
                </p>
                <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {(form?.categories || []).map((category) => (
                    <li key={category.id}>
                      {category.label} — {category.fields.length} extra field
                      {category.fields.length === 1 ? '' : 's'}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-kmuGreen px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}

export default function FormSettingsPage() {
  return (
    <RoleProtectedRoute pageKey="formSettings">
      <FormSettingsContent />
    </RoleProtectedRoute>
  );
}
