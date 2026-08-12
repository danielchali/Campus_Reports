"use client";
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';
import { useOfflineApi } from '../../hooks/useOfflineSync';
import { canAccessPage } from '../../utils/access';
import { PageSkeleton } from '../../components/PageSkeleton';
import { InlineSkeleton } from '../../components/PageSkeleton';
import { useConfirmDialog } from '../../components/AppDialog';


interface Evidence {
  _id?: string;
  id?: string;
  fileName?: string;
  filename?: string;
  filePath?: string;
  case?: { _id: string; description: string } | string;
  uploadedBy?: { _id: string; name: string } | string;
  uploadedAt?: string;
  date?: string;
}

interface Case {
  _id: string;
  description: string;
}

export default function EvidencePage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Handle authentication like profile page - only on client side
  if (typeof window !== 'undefined') {
    if (!authLoading && !token) {
      router.replace('/login');
    }
    if (!token) {
      return <PageSkeleton />;
    }
    
    if (!user || !canAccessPage(user.role, 'evidence')) {
      return <div className="text-red-600">Access denied.</div>;
    }
  }

  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [caseId, setCaseId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const { apiCall, isLoading: apiLoading, error: apiError } = useOfflineApi();
  const { confirm, confirmDialog } = useConfirmDialog();

  useEffect(() => {
    async function fetchEvidence() {
      setLoading(true);
      setError(null);
      try {
        const response = await apiCall<any>('get', '/evidence');
        const data = response.data;
        // Handle both array and { evidence, total } response formats
        setEvidence(Array.isArray(data) ? data : (data.evidence || data || []));
        setOfflineMode(response.offline);
      } catch (err: any) {
        console.error('Error fetching evidence:', err);
        setError(err?.message || 'Network error, please try again');
        setEvidence([]);
      }
      setLoading(false);
    }

    async function fetchCases() {
      try {
        const response = await apiCall<any>('get', '/cases');
        const data = response.data;
        // Handle both array and { cases, total } response formats
        setCases(Array.isArray(data) ? data : (data.cases || data || []));
      } catch (err: any) {
        console.error('Error fetching cases:', err);
        setCases([]);
      }
    }

    if (user && canAccessPage(user.role, 'evidence')) {
      fetchEvidence();
      fetchCases();
    } else {
      setLoading(false);
    }
  }, [apiCall, user]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !caseId) {
      setError('Please select a case and a file.');
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Evidence file uploads require a secure online connection. Please reconnect and try again.');
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caseId', caseId);
      const res = await fetch(`${API_BASE_URL}/evidence`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess('Evidence uploaded successfully!');
      setFile(null);
      setCaseId('');
      // Refresh evidence list
      const updated = await apiCall<any>('get', '/evidence');
      const data = updated.data;
      setEvidence(Array.isArray(data) ? data : (data.evidence || data || []));
      setOfflineMode(updated.offline);
    } catch (err: any) {
      console.error('Error uploading evidence:', err);
      setError(err?.message || 'Network error, please try again');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(id: string, filename: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/evidence/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'evidence';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading evidence:', err);
      setError(err.message || 'Failed to download evidence');
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: 'Delete evidence?',
      message: 'Are you sure you want to delete this evidence? This action cannot be undone.',
      confirmLabel: 'Delete Evidence',
      tone: 'danger',
    });
    if (!confirmed) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await apiCall<{ success: boolean }>('delete', `/evidence/${id}`);
      setSuccess(response.offline ? 'Evidence marked for deletion and will sync when online.' : 'Evidence deleted successfully!');
      setEvidence(evidence => evidence.filter(e => {
        const evidenceId = getEvidenceId(e);
        return evidenceId !== id;
      }));
    } catch (err: any) {
      console.error('Error deleting evidence:', err);
      setError(err.message || 'Failed to delete evidence');
    }
  }

  function getFileType(filename: string) {
    if (!filename) return 'other';
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) return 'other';
    if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) return "image";
    if (["pdf"].includes(ext)) return "pdf";
    return "other";
  }

  function getEvidenceId(item: any) {
    return item._id || item.id || '';
  }

  function getEvidenceFilename(item: any) {
    return item.fileName || item.filename || 'Unknown file';
  }

  function getEvidenceDate(item: any) {
    const date = item.uploadedAt || item.date;
    if (!date) return 'Unknown date';
    try {
      return new Date(date).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  }

  function getCaseDescription(item: any) {
    if (!item.case) return 'No case associated';
    if (typeof item.case === 'object' && item.case !== null) {
      return item.case.description || 'No description';
    }
    return String(item.case);
  }

  function getUploadedBy(item: any) {
    if (!item.uploadedBy) return 'Unknown user';
    if (typeof item.uploadedBy === 'object' && item.uploadedBy !== null) {
      return item.uploadedBy.name || 'Unknown user';
    }
    return String(item.uploadedBy);
  }

  const safeEvidence = Array.isArray(evidence) ? evidence : [];

  return (
    <>
      <div className="w-full space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Evidence Management</h1>
            {offlineMode && (
              <span className="inline-flex w-fit rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                Offline Mode
              </span>
            )}
          </div>
        </div>

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <h2 className="text-lg font-semibold text-kmuOrange mb-4">Upload Evidence</h2>
          <form className="space-y-4" onSubmit={handleUpload} aria-label="Upload evidence form">
            <div>
              <label htmlFor="caseId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Case
              </label>
              <select
                id="caseId"
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={caseId}
                onChange={e => setCaseId(e.target.value)}
                required
                aria-label="Case"
              >
                <option value="">Select case...</option>
                {cases.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.description || 'No description'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="evidenceFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                File
              </label>
              <input
                id="evidenceFile"
                type="file"
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                onChange={e => setFile(e.target.files?.[0] || null)}
                required
                aria-label="Evidence file"
              />
            </div>
            {error && <div className="text-red-600 text-sm" aria-live="polite">{error}</div>}
            {success && <div className="text-kmuGreen text-sm" aria-live="polite">{success}</div>}
            <button
              type="submit"
              className="bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition disabled:opacity-50"
              disabled={uploading}
              aria-label="Upload evidence"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </form>
        </div>

        {/* Evidence List */}
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <h2 className="text-lg font-semibold mb-4 text-kmuOrange">Uploaded Evidence</h2>
          {loading ? (
            <InlineSkeleton rows={3} />
          ) : safeEvidence.length === 0 ? (
            <div className="text-gray-400 dark:text-gray-500">No evidence available.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {safeEvidence.map((item) => {
                const filename = getEvidenceFilename(item);
                const id = getEvidenceId(item);
                const fileType = getFileType(filename);
                const fileUrl = `${API_BASE_URL}/evidence/${id}/download`;

                return (
                  <div key={id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="mb-3">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate" title={filename}>
                        {filename}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Case: {getCaseDescription(item)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Uploaded by: {getUploadedBy(item)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Date: {getEvidenceDate(item)}
                      </p>
                    </div>

                    {/* File preview */}
                    <div className="mb-3">
                      {fileType === 'image' ? (
                        <img 
                          src={fileUrl} 
                          alt={filename} 
                          className="max-w-full h-32 object-cover rounded border border-gray-200 dark:border-gray-600"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : fileType === 'pdf' ? (
                        <iframe 
                          src={fileUrl} 
                          title={filename} 
                          className="w-full h-32 border border-gray-200 dark:border-gray-600 rounded"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                          <span className="text-gray-500 dark:text-gray-400 text-sm">No preview available</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        className="flex-1 bg-kmuGreen text-white px-3 py-1 rounded text-sm hover:bg-kmuOrange transition"
                        onClick={() => handleDownload(id, filename)}
                      >
                        Download
                      </button>
                      <button
                        className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition"
                        onClick={() => handleDelete(id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {confirmDialog}
    </>
  );
} 
