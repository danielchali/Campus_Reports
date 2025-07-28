"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { API_BASE_URL } from '../../config/constants';
import { OFFENSE_TYPES, SEVERITY_LEVELS, CASE_STATUSES } from '../../config/constants';
import { authHeaders } from '../../utils/api';

export default function CaseDetailsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [offenseTypeDescription, setOffenseTypeDescription] = useState('');

  // Function to get description for selected offense type
  const getOffenseTypeDescription = (offenseType: string) => {
    const offense = OFFENSE_TYPES.find(ot => ot.value === offenseType);
    return offense ? offense.description : '';
  };

  // Function to handle offense type change
  const handleOffenseTypeChange = (offenseType: string) => {
    setForm((f: any) => ({ ...f, offenseType }));
    setOffenseTypeDescription(getOffenseTypeDescription(offenseType));
  };

  useEffect(() => {
    fetchCase();
    // eslint-disable-next-line
  }, [caseId, token]);

  useEffect(() => {
    async function fetchEvidence() {
      setEvidenceLoading(true);
      setEvidenceError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/evidence?caseId=${caseId}`, { 
          headers: { ...authHeaders() } 
        });
        if (!res.ok) throw new Error(await res.text());
        setEvidence(await res.json());
      } catch (err: any) {
        setEvidenceError('Failed to load evidence');
        setEvidence([]);
      }
      setEvidenceLoading(false);
    }
    if (caseId && token) fetchEvidence();
  }, [caseId, token]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  async function fetchCase() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}`, { 
        headers: { ...authHeaders() } 
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCaseData(data);
      setForm({
        description: data.description,
        offenseType: data.offenseType,
        severity: data.severity,
        status: data.status,
        sanctions: data.sanctions,
      });
    } catch (err: any) {
      setError(err?.message || 'Network error, please try again');
    } finally {
      setLoading(false);
    }
  }

  function canEdit() {
    if (!user || !caseData) return false;
    return user.role === 'admin' || (caseData.createdBy && caseData.createdBy._id === user.id);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess('Case updated successfully!');
      setEditMode(false);
      fetchCase();
    } catch (err: any) {
      setError(err?.message || 'Network error, please try again');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this case?')) return;
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}`, {
        method: 'DELETE',
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess('Case deleted successfully!');
      setTimeout(() => router.push('/cases'), 1000);
    } catch (err: any) {
      setError(err?.message || 'Network error, please try again');
    }
  }

  if (loading) return <div className="text-kmuGreen">Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!caseData) return <div className="text-gray-500">Case not found.</div>;

  return (
    <section className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-kmuGreen mb-6">Case Details</h1>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="mb-2"><b>Case #:</b> {caseData._id}</div>
        <div className="mb-2"><b>Student:</b> {caseData.student?.fullName} ({caseData.student?.studentId})</div>
        <div className="mb-2"><b>Created By:</b> {caseData.createdBy?.name} ({caseData.createdBy?.role})</div>
        {editMode && canEdit() ? (
          <form className="space-y-4" onSubmit={handleEdit}>
            <div>
              <label className="block text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Offense Type</label>
              <select 
                value={form.offenseType} 
                onChange={e => handleOffenseTypeChange(e.target.value)} 
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select an offense type</option>
                {OFFENSE_TYPES.map(offense => (
                  <option key={offense.value} value={offense.value}>
                    {offense.label}
                  </option>
                ))}
              </select>
              {offenseTypeDescription && (
                <p className="text-xs text-gray-500 mt-1">{offenseTypeDescription}</p>
              )}
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Severity</label>
              <select 
                value={form.severity} 
                onChange={e => setForm((f: any) => ({ ...f, severity: e.target.value }))} 
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select severity...</option>
                {SEVERITY_LEVELS.map(severity => (
                  <option key={severity.value} value={severity.value}>
                    {severity.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Status</label>
              <select 
                value={form.status} 
                onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} 
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select status...</option>
                {CASE_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Sanctions</label>
              <input 
                type="text" 
                value={form.sanctions} 
                onChange={e => setForm((f: any) => ({ ...f, sanctions: e.target.value }))} 
                className="w-full border rounded px-3 py-2" 
                placeholder="Any sanctions or disciplinary measures applied (optional)"
              />
            </div>
            {success && <div className="text-kmuGreen text-sm">{success}</div>}
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button type="submit" className="bg-kmuGreen text-white px-4 py-2 rounded">Save</button>
            <button type="button" className="bg-gray-300 text-gray-700 px-4 py-2 rounded ml-2" onClick={() => setEditMode(false)}>Cancel</button>
          </form>
        ) : (
          <>
            <div className="mb-2"><b>Description:</b> {caseData.description}</div>
            <div className="mb-2"><b>Offense Type:</b> {caseData.offenseType}</div>
            <div className="mb-2"><b>Severity:</b> {caseData.severity}</div>
            <div className="mb-2"><b>Status:</b> {caseData.status}</div>
            <div className="mb-2"><b>Sanctions:</b> {caseData.sanctions}</div>
            {canEdit() && (
              <div className="mt-4 flex gap-2">
                <button className="bg-kmuGreen text-white px-4 py-2 rounded" onClick={() => setEditMode(true)}>Edit</button>
                <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={handleDelete}>Delete</button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2 text-kmuOrange">Evidence Files</h2>
        {evidenceLoading ? (
          <div className="text-gray-500">Loading...</div>
        ) : evidenceError ? (
          <div className="text-red-600">{evidenceError}</div>
        ) : evidence.length === 0 ? (
          <div className="text-gray-400">No evidence files for this case.</div>
        ) : (
          <ul className="list-disc ml-6">
            {evidence.map((item: any) => (
              <li key={item._id} className="mb-2">
                <a
                  href={`/api/evidence/${item._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-kmuOrange hover:underline font-medium"
                >
                  {item.fileName}
                </a>
                {item.createdAt && (
                  <span className="text-gray-500 text-xs ml-2">(Uploaded: {new Date(item.createdAt).toLocaleString()})</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
} 