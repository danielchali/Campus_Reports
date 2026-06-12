"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';

export type StatementRequestRecord = {
  _id: string;
  title: string;
  prompt: string;
  status: 'pending' | 'submitted' | 'expired' | 'cancelled';
  dueAt?: string;
  createdAt: string;
  submittedAt?: string;
  caseMongoId?: string;
  caseNumber?: string;
  submittedStatement?: string;
};

type CaseOption = {
  _id: string;
  caseId?: string;
  case_id?: string;
  description?: string;
};

type StatementRequestPanelProps = {
  studentId: string;
  linkedCaseId?: string;
  linkedCaseNumber?: string;
  initialCaseId?: string;
  cases?: CaseOption[];
  allowCaseSelection?: boolean;
  filterByCaseId?: string;
};

function formatCaseLabel(caseItem: CaseOption) {
  const number = caseItem.caseId || caseItem.case_id || caseItem._id.slice(-6);
  const summary = caseItem.description ? ` — ${caseItem.description.slice(0, 48)}` : '';
  return `Case ${number}${summary}`;
}

export default function StatementRequestPanel({
  studentId,
  linkedCaseId,
  linkedCaseNumber,
  initialCaseId,
  cases = [],
  allowCaseSelection = false,
  filterByCaseId,
}: StatementRequestPanelProps) {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(linkedCaseId || initialCaseId || '');
  const [requests, setRequests] = useState<StatementRequestRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const effectiveCaseId = linkedCaseId || selectedCaseId || undefined;

  const fetchRequests = useCallback(async () => {
    if (!studentId) return;

    const params = new URLSearchParams({ studentId });
    if (filterByCaseId) {
      params.set('caseId', filterByCaseId);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/statement-requests/staff?${params.toString()}`, {
        headers: { ...authHeaders() },
      });
      if (!res.ok) return;
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    }
  }, [filterByCaseId, studentId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (linkedCaseId) {
      setSelectedCaseId(linkedCaseId);
    } else if (initialCaseId) {
      setSelectedCaseId(initialCaseId);
    }
  }, [initialCaseId, linkedCaseId]);

  useEffect(() => {
    if (title) return;

    if (linkedCaseId && linkedCaseNumber) {
      setTitle(`Statement for Case ${linkedCaseNumber}`);
      return;
    }

    if (initialCaseId) {
      const matchedCase = cases.find((caseItem) => caseItem._id === initialCaseId);
      const caseNumber = matchedCase?.caseId || matchedCase?.case_id;
      if (caseNumber) {
        setTitle(`Statement for Case ${caseNumber}`);
      }
    }
  }, [cases, initialCaseId, linkedCaseId, linkedCaseNumber, title]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/statement-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          studentId,
          caseId: effectiveCaseId || undefined,
          title,
          prompt,
          dueAt: dueAt || undefined,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to send statement request');
      }

      setTitle(linkedCaseNumber ? `Statement for Case ${linkedCaseNumber}` : '');
      setPrompt('');
      setDueAt('');
      if (!linkedCaseId) {
        setSelectedCaseId('');
      }
      setMessage('Statement request sent to student dashboard.');
      fetchRequests();
    } catch (err: any) {
      setMessage(err.message || 'Failed to send statement request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        {allowCaseSelection && cases.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Link to case
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">No case link</option>
              {cases.map((caseItem) => (
                <option key={caseItem._id} value={caseItem._id}>
                  {formatCaseLabel(caseItem)}
                </option>
              ))}
            </select>
          </div>
        )}

        {linkedCaseId && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Linked to{' '}
            <Link href={`/cases/${linkedCaseId}`} className="font-medium text-kmuGreen hover:underline">
              Case {linkedCaseNumber || linkedCaseId}
            </Link>
          </p>
        )}

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. Incident Clarification)"
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          required
        />
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Instructions for the student statement..."
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          rows={4}
          required
        />
        <input
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-kmuGreen px-4 py-2 text-sm text-white transition hover:bg-kmuOrange disabled:opacity-60"
        >
          {submitting ? 'Sending...' : 'Send Statement Request'}
        </button>
      </form>

      {message && (
        <p className={`text-xs ${message.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}

      {requests.length > 0 && (
        <div className="space-y-2">
          {requests.slice(0, filterByCaseId ? 6 : 4).map((request) => (
            <div key={request._id} className="rounded border border-gray-200 px-2 py-2 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-900 dark:text-white">{request.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {request.status} • {new Date(request.createdAt).toLocaleDateString()}
                {request.caseMongoId && (
                  <>
                    {' • '}
                    <Link href={`/cases/${request.caseMongoId}`} className="text-kmuGreen hover:underline">
                      Case {request.caseNumber || request.caseMongoId.slice(-6)}
                    </Link>
                  </>
                )}
              </p>
              {request.status === 'submitted' && request.submittedStatement && (
                <p className="mt-1 line-clamp-3 text-xs text-gray-600 dark:text-gray-300">
                  {request.submittedStatement}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
