'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bot, Lightbulb, Sparkles } from 'lucide-react';
import { getDashboardInsights, type DashboardInsights } from '../../utils/api';

const priorityTone: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

type DashboardAIInsightsProps = {
  refreshToken?: number;
  showPriorities?: boolean;
};

export default function DashboardAIInsights({
  refreshToken = 0,
  showPriorities = true,
}: DashboardAIInsightsProps) {
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDashboardInsights();
        if (active) setInsights(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load AI insights.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [refreshToken]);

  if (loading) {
    return (
      <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Sparkles size={16} className="animate-pulse text-kmuGreen" />
          Generating AI dashboard insights...
        </div>
      </article>
    );
  }

  if (error || !insights) {
    return (
      <article className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
        {error || 'AI insights are unavailable right now.'}
      </article>
    );
  }

  const priorities = insights.topPriorities || [];

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kmuGreen/10 text-kmuGreen">
              <Bot size={16} />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">AI Insights</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            NLP summaries, prioritization, and recommendations for campus reports.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {insights.aiEnabled ? 'AI active' : 'Heuristic mode'}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
        {insights.executiveSummary}
      </p>

      {insights.alerts.length > 0 && (
        <div className="mt-4 space-y-2">
          {insights.alerts.map((alert) => (
            <div
              key={alert}
              className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-200"
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      {insights.recommendations.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Lightbulb size={14} />
            Recommendations
          </div>
          <ul className="space-y-2">
            {insights.recommendations.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showPriorities && priorities.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Top prioritized reports
          </div>
          <div className="space-y-2">
            {priorities.slice(0, 5).map((item) => (
              <Link
                key={`${item.source}-${item.id}`}
                href={item.source === 'student' ? '/inbox' : item.trackingCode ? `/anonymous-report?track=${encodeURIComponent(item.trackingCode)}` : '/anonymous-report'}
                className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition hover:border-kmuGreen/30 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityTone[item.priority] || priorityTone.Medium}`}>
                    {item.priority}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{item.summary}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {item.trackingCode || 'No code'} • {item.category?.replace(/_/g, ' ') || 'Report'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
