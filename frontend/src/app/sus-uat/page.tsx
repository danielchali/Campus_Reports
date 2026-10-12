"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, Save } from "@/components/icons";
import RoleProtectedRoute from "@/app/(protected)/RoleProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/config/constants";
import { authHeaders } from "@/utils/api";

const SUS_STATEMENTS = [
  "I would like to use this system often. (often = many times)",
  "I found this system more complicated than it needs to be. (complicated = not simple)",
  "I found this system easy to use. (easy = not difficult)",
  "I would need help from a technical person to use this system. (technical person = someone with computer knowledge)",
  "The different parts of this system work well together. (parts = sections or features)",
  "This system does not always work in the same way. (inconsistency = not being the same each time)",
  "Most people would learn to use this system very quickly. (learn = understand how to use)",
  "I found this system difficult and awkward to use. (cumbersome = difficult and awkward)",
  "I felt sure when using this system. (confident = sure)",
  "I needed to learn many things before I could start using this system. (get going = start using)",
] as const;

const SCALE = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neither agree nor disagree" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
] as const;

type SusResponse = {
  id: string;
  answers: number[];
  score: number;
  taskFeedback: string;
  additionalFeedback: string;
  submittedAt: string;
};

type SusSummary = {
  totalResponses: number;
  averageScore: number | null;
  medianScore: number | null;
  scoreDistribution: { label: string; count: number }[];
  itemAverages: (number | null)[];
  roleCounts: { role: string; count: number }[];
  recentFeedback: {
    role: string;
    score: number;
    taskFeedback: string;
    additionalFeedback: string;
    submittedAt: string;
  }[];
};

function calculateScore(answers: Array<number | null>) {
  const completeAnswers = answers.filter((answer): answer is number => answer !== null);
  if (completeAnswers.length !== answers.length) return null;
  return completeAnswers.reduce((total, answer, index) => (
    total + (index % 2 === 0 ? answer - 1 : 5 - answer)
  ), 0) * 2.5;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "recently" : date.toLocaleString();
}

function SurveyContent() {
  const { token, user } = useAuth();
  const [answers, setAnswers] = useState<Array<number | null>>(() => Array(10).fill(null));
  const [taskFeedback, setTaskFeedback] = useState("");
  const [additionalFeedback, setAdditionalFeedback] = useState("");
  const [existingResponse, setExistingResponse] = useState<SusResponse | null>(null);
  const [summary, setSummary] = useState<SusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isAdmin = user?.role === "admin";
  const score = useMemo(() => calculateScore(answers), [answers]);
  const completedCount = answers.filter((answer) => answer !== null).length;

  const loadSurvey = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/sus-surveys/mine`, { headers: authHeaders() });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to load the UAT survey.");

      const savedResponse = data?.response as SusResponse | null;
      setExistingResponse(savedResponse);
      if (savedResponse) {
        setAnswers(savedResponse.answers.map((answer) => Number(answer)));
        setTaskFeedback(savedResponse.taskFeedback || "");
        setAdditionalFeedback(savedResponse.additionalFeedback || "");
      }

      if (isAdmin) {
        const summaryResponse = await fetch(`${API_BASE_URL}/sus-surveys/summary`, { headers: authHeaders() });
        const summaryData = await summaryResponse.json().catch(() => null);
        if (!summaryResponse.ok) throw new Error(summaryData?.error || "Unable to load UAT results.");
        setSummary(summaryData as SusSummary);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the UAT survey.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    void loadSurvey();
  }, [loadSurvey]);

  const selectAnswer = (questionIndex: number, value: number) => {
    setAnswers((current) => current.map((answer, index) => (
      index === questionIndex ? value : answer
    )));
    setSuccess("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (answers.some((answer) => answer === null)) {
      setError("Please rate all ten statements before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${API_BASE_URL}/sus-surveys`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ answers, taskFeedback, additionalFeedback }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to submit the UAT survey.");

      setExistingResponse(data as SusResponse);
      setSuccess(existingResponse ? "Your UAT response has been updated." : "Thank you — your UAT response has been recorded.");
      if (isAdmin) {
        const summaryResponse = await fetch(`${API_BASE_URL}/sus-surveys/summary`, { headers: authHeaders() });
        const summaryData = await summaryResponse.json().catch(() => null);
        if (summaryResponse.ok) setSummary(summaryData as SusSummary);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit the UAT survey.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-500 dark:text-slate-400"><Loader2 size={18} className="mr-2 animate-spin" /> Loading UAT survey…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 px-5 py-6 text-white shadow-xl shadow-slate-950/10 sm:px-7 sm:py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200"><ClipboardList size={13} /> User acceptance testing</span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">System Usability Scale survey</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">After completing your assigned UAT tasks, rate your overall experience of Campus Reports. There are no right or wrong answers.</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Progress</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{completedCount}/10</p>
          </div>
        </div>
      </section>

      {existingResponse && !success && (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>You previously submitted this survey on {formatDate(existingResponse.submittedAt)}. You can update the response below if your UAT experience changed.</p>
        </div>
      )}
      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}
      {success && <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-5 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Rate each statement</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Choose one response per statement, from strongly disagree to strongly agree.</p>
          </div>
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {SUS_STATEMENTS.map((statement, questionIndex) => (
              <fieldset key={statement} className="py-5">
                <legend className="flex gap-3 text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-kmuGreen dark:bg-emerald-950/50 dark:text-emerald-300">{questionIndex + 1}</span>{statement}</legend>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
                  {SCALE.map((option) => {
                    const id = `sus-${questionIndex + 1}-${option.value}`;
                    const selected = answers[questionIndex] === option.value;
                    return (
                      <label key={option.value} htmlFor={id} className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-xs font-medium transition ${selected ? "border-kmuGreen bg-emerald-50 text-kmuGreen shadow-sm dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"}`}>
                        <input id={id} type="radio" name={`sus-${questionIndex + 1}`} value={option.value} checked={selected} onChange={() => selectAnswer(questionIndex, option.value)} className="sr-only" />
                        <span className="block text-base font-bold leading-none">{option.value}</span>
                        <span className="mt-1 block leading-tight">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">UAT notes <span className="text-sm font-normal text-slate-400">optional</span></h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="task-feedback" className="text-sm font-medium text-slate-800 dark:text-slate-100">Which tasks went well or were difficult?</label>
                <textarea id="task-feedback" value={taskFeedback} onChange={(event) => setTaskFeedback(event.target.value)} maxLength={2000} rows={4} placeholder="For example: submitting a report, locating a case, receiving a notification…" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-kmuGreen focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-950" />
              </div>
              <div>
                <label htmlFor="additional-feedback" className="text-sm font-medium text-slate-800 dark:text-slate-100">What should we improve?</label>
                <textarea id="additional-feedback" value={additionalFeedback} onChange={(event) => setAdditionalFeedback(event.target.value)} maxLength={2000} rows={4} placeholder="Share any suggestion, error, or missing feature." className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-kmuGreen focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-950" />
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/25">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Your SUS score</p>
            <p className="mt-2 text-5xl font-semibold tabular-nums text-slate-900 dark:text-white">{score === null ? "—" : score}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">out of 100</p>
            <p className="mt-5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">The score is calculated from all ten responses and is saved with your UAT feedback.</p>
            <button type="submit" disabled={submitting || completedCount !== 10} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-kmuGreen px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {existingResponse ? "Update response" : "Submit UAT survey"}
            </button>
          </aside>
        </section>
      </form>

      {isAdmin && (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">Administrator view</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">UAT response summary</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Aggregated scores and anonymised written feedback from submitted surveys.</p>
          </div>
          {!summary ? <p className="text-sm text-slate-500 dark:text-slate-400">Summary is unavailable right now.</p> : summary.totalResponses === 0 ? <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">No UAT surveys have been submitted yet.</p> : <>
            <div className="grid gap-3 sm:grid-cols-3">
              {[{ label: "Responses", value: summary.totalResponses }, { label: "Average SUS score", value: summary.averageScore ?? "—" }, { label: "Median SUS score", value: summary.medianScore ?? "—" }].map((item) => <div key={item.label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{item.value}</p></div>)}
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Score distribution</h3>
                <div className="mt-3 space-y-3">
                  {summary.scoreDistribution.map((item) => <div key={item.label}><div className="mb-1 flex justify-between gap-3 text-xs text-slate-600 dark:text-slate-300"><span>{item.label}</span><span className="font-semibold tabular-nums">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max((item.count / summary.totalResponses) * 100, item.count ? 5 : 0)}%` }} /></div></div>)}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Responses by role</h3>
                <div className="mt-3 flex flex-wrap gap-2">{summary.roleCounts.map((item) => <span key={item.role} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{item.role.replace(/_/g, " ")} · {item.count}</span>)}</div>
              </div>
            </div>
            {summary.recentFeedback.length > 0 && <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent feedback</h3>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">{summary.recentFeedback.map((item, index) => <article key={`${item.submittedAt}-${index}`} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex items-center justify-between gap-3 text-xs"><span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-kmuGreen dark:bg-emerald-950/40 dark:text-emerald-300">SUS {item.score}</span><span className="text-slate-500 dark:text-slate-400">{formatDate(item.submittedAt)}</span></div>{item.taskFeedback && <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{item.taskFeedback}</p>}{item.additionalFeedback && <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.additionalFeedback}</p>}</article>)}</div>
            </div>}
          </>}
        </section>
      )}
    </div>
  );
}

export default function SusUatPage() {
  return <RoleProtectedRoute pageKey="susSurvey"><SurveyContent /></RoleProtectedRoute>;
}
