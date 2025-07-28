"use client";
import { useState, useEffect } from 'react';
import ProtectedRoute from '../(protected)/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import { authHeaders, remove, exportDocx, exportExcel } from '../../utils/api';
import { useOfflineApi } from '../../hooks/useOfflineSync';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../config/constants';
import { useSearchParams } from 'next/navigation';
import { saveAs } from 'file-saver';

interface Case {
  _id: string;
  student: {
    _id: string;
    studentId: string;
    fullName: string;
    department?: string;
  };
  incidentDate: string;
  description: string;
  offenseType: string;
  severity: string;
  status: string;
  sanctions?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS = ['Open', 'Closed', 'Pending'];
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High'];

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const { token, user } = useAuth();
  const { apiCall, isLoading: apiLoading, error: apiError } = useOfflineApi();

  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdFilter = searchParams?.get('studentId') || '';



  useEffect(() => {
    async function fetchCases() {
      setLoading(true);
      setError(null);
      try {
        let endpoint = '/cases';
        const params = new URLSearchParams();
        if (studentIdFilter) {
          params.append('studentId', studentIdFilter);
        }
        if (page > 1) {
          params.append('page', page.toString());
        }
        if (limit !== 20) {
          params.append('limit', limit.toString());
        }
        
        if (params.toString()) {
          endpoint += `?${params.toString()}`;
        }
        
        const response = await apiCall<Case[]>('get', endpoint);
        const responseData = response.data as any;
        const casesArray = Array.isArray(responseData) ? responseData : (Array.isArray(responseData.cases) ? responseData.cases : []);
        setCases(casesArray);
        setOfflineMode(response.offline);
        
        if (responseData.total !== undefined) {
          setTotal(responseData.total);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load cases');
        setCases([]);
      } finally {
        setLoading(false);
      }
    }
    fetchCases();
  }, [apiCall, studentIdFilter, page, limit]);

  const safeCases = Array.isArray(cases) ? cases : [];
  const filteredCases = safeCases.filter(
    (c) =>
      (!search ||
        c.student?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        c.student?.studentId?.toLowerCase().includes(search.toLowerCase()) ||
        c.offenseType?.toLowerCase().includes(search.toLowerCase()) ||
        c.status?.toLowerCase().includes(search.toLowerCase()) ||
        c.severity?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      ) &&
      (!statusFilter || c.status === statusFilter) &&
      (!severityFilter || c.severity === severityFilter)
  );

  function toggleSelect(id: string) {
    setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  }
  function selectAll() {
    setSelected(filteredCases.map(c => c._id));
  }
  function clearSelected() {
    setSelected([]);
  }

  async function handleBulkDelete() {
    if (!window.confirm('Delete selected cases?')) return;
    for (const id of selected) {
      await remove('cases', id);
    }
    setCases(cases => cases.filter(c => !selected.includes(c._id)));
    setSelected([]);
  }

  async function handleBulkExport() {
    await exportDocx('cases');
  }

  async function handleBulkExportExcel() {
    await exportExcel('cases');
  }

  // Enhanced export functions
  const handleExportSelected = async (format: 'docx' | 'xlsx') => {
    if (selected.length === 0) {
      alert('Please select items to export');
      return;
    }
    
    setExporting(true);
    try {
      const endpoint = format === 'docx' ? '/reports/docx' : '/reports/export-excel';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'selected',
          ids: selected,
          entity: 'cases'
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const filename = `selected_cases_${new Date().toISOString().split('T')[0]}.${format}`;
      saveAs(blob, filename);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCurrentPage = async (format: 'docx' | 'xlsx') => {
    setExporting(true);
    try {
      const endpoint = format === 'docx' ? '/reports/docx' : '/reports/export-excel';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'current_page',
          data: filteredCases,
          entity: 'cases',
          filters: {
            search,
            statusFilter,
            severityFilter,
            studentId: studentIdFilter
          }
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const filename = `cases_page_${page}_${new Date().toISOString().split('T')[0]}.${format}`;
      saveAs(blob, filename);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleExportFiltered = async (format: 'docx' | 'xlsx') => {
    setExporting(true);
    try {
      const endpoint = format === 'docx' ? '/reports/docx' : '/reports/export-excel';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'filtered',
          entity: 'cases',
          filters: {
            search,
            statusFilter,
            severityFilter,
            studentId: studentIdFilter
          }
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const filename = `filtered_cases_${new Date().toISOString().split('T')[0]}.${format}`;
      saveAs(blob, filename);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ProtectedRoute>
      <section>
        <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-kmuGreen">Cases</h1>
              {offlineMode && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                  Offline Mode
                </span>
              )}
            </div>
          {(user?.role === 'admin' || user?.role === 'security_officer' || user?.role === 'academic_office') && (
            <button
              onClick={() => router.push('/cases/new')}
              className="bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition"
            >
              + New Case
            </button>
          )}
        </div>
        <div className="mb-4 flex flex-col md:flex-row gap-2 md:items-center">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search by name, ID, offense, status, etc."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">All Severities</option>
              {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="bg-gray-200 text-gray-700 px-2 py-1 rounded" onClick={selectAll}>Select All</button>
            <button className="bg-gray-200 text-gray-700 px-2 py-1 rounded" onClick={clearSelected}>Clear</button>
            {selected.length > 0 && (
              <>
                <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={handleBulkDelete}>Delete Selected</button>
                <button className="bg-kmuGreen text-white px-2 py-1 rounded" onClick={() => handleExportSelected('docx')}>Export Selected (Word)</button>
                <button className="bg-blue-600 text-white px-2 py-1 rounded" onClick={() => handleExportSelected('xlsx')}>Export Selected (Excel)</button>
              </>
            )}
          </div>
        </div>
        
        {/* Export Controls */}
        <div className="mb-4 flex flex-col md:flex-row gap-2 md:items-center">
          <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Export Options:</span>
          <button
            onClick={() => handleExportCurrentPage('docx')}
            disabled={exporting || filteredCases.length === 0}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {exporting ? 'Exporting...' : 'Export Current Page (Word)'}
          </button>
          <button
            onClick={() => handleExportCurrentPage('xlsx')}
            disabled={exporting || filteredCases.length === 0}
            className="bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800 disabled:opacity-50 text-sm"
          >
            {exporting ? 'Exporting...' : 'Export Current Page (Excel)'}
          </button>
          <button
            onClick={() => handleExportFiltered('docx')}
            disabled={exporting}
            className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
          >
            {exporting ? 'Exporting...' : 'Export Filtered (Word)'}
          </button>
                      <button
              onClick={() => handleExportFiltered('xlsx')}
              disabled={exporting}
              className="bg-purple-700 text-white px-3 py-1 rounded hover:bg-purple-800 disabled:opacity-50 text-sm"
            >
              {exporting ? 'Exporting...' : 'Export Filtered (Excel)'}
            </button>
          </div>
        </div>
        {/* Pagination controls */}
        <div className="flex flex-wrap gap-2 items-center my-4">
          <button
            className="px-2 py-1 rounded bg-gray-200 text-gray-700"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              className={`px-2 py-1 rounded ${p === page ? 'bg-kmuGreen text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            className="px-2 py-1 rounded bg-gray-200 text-gray-700"
            onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
            disabled={page === Math.ceil(total / limit) || total === 0}
          >
            Next
          </button>
          <span className="ml-2 text-sm text-gray-500">Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
        </div>
        {error && <div className="text-red-600 text-sm mb-2" aria-live="polite">{error}</div>}
        {loading && <div className="text-kmuGreen text-sm mb-2">Loading...</div>}
        <div className="overflow-x-auto -mx-3 md:mx-0">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow text-sm md:text-base">
            <thead className="bg-kmuGreen text-white">
              <tr>
                <th><input type="checkbox" checked={selected.length === filteredCases.length && filteredCases.length > 0} onChange={e => e.target.checked ? selectAll() : clearSelected()} /></th>
                <th className="py-2 px-4 text-left hidden md:table-cell">ID</th>
                <th className="py-2 px-4 text-left">Name</th>
                <th className="py-2 px-4 text-left hidden md:table-cell">Department</th>
                <th className="py-2 px-4 text-left hidden md:table-cell">Date</th>
                <th className="py-2 px-4 text-left">Offense</th>
                <th className="py-2 px-4 text-left hidden md:table-cell">Description</th>
                <th className="py-2 px-4 text-left hidden md:table-cell">Status</th>
                <th className="py-2 px-4 text-left hidden md:table-cell">Severity</th>
                <th className="py-2 px-4 text-left hidden md:table-cell">Sanctions</th>
                <th className="py-2 px-4 text-left hidden md:table-cell">Created By</th>
                <th className="py-2 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map(s => (
                <tr key={s._id} className="border-b border-gray-200 dark:border-gray-600">
                  <td><input type="checkbox" checked={selected.includes(s._id)} onChange={() => toggleSelect(s._id)} /></td>
                  <td className="py-2 px-4 text-sm hidden md:table-cell">{s._id}</td>
                  <td className="py-2 px-4">
                    {s.student ? (
                      <Link href={`/students/${s.student._id}`} className="text-kmuGreen hover:underline">
                        {s.student.fullName}
                      </Link>
                    ) : (
                      <span className="text-gray-500">Student not found</span>
                    )}
                  </td>
                  <td className="py-2 px-4 hidden md:table-cell">{s.student?.department || '-'}</td>
                  <td className="py-2 px-4 hidden md:table-cell">{s.incidentDate ? new Date(s.incidentDate).toLocaleDateString() : '-'}</td>
                  <td className="py-2 px-4">{s.offenseType || '-'}</td>
                  <td className="py-2 px-4 max-w-xs truncate hidden md:table-cell" title={s.description}>
                    {s.description || '-'}
                  </td>
                  <td className="py-2 px-4 hidden md:table-cell">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      s.status?.toLowerCase() === 'open' ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20' :
                      s.status?.toLowerCase() === 'closed' ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' :
                      'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {s.status || '-'}
                    </span>
                  </td>
                  <td className="py-2 px-4 hidden md:table-cell">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      s.severity?.toLowerCase() === 'high' ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20' :
                      s.severity?.toLowerCase() === 'medium' ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20' :
                      s.severity?.toLowerCase() === 'low' ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' :
                      'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {s.severity || '-'}
                    </span>
                  </td>
                  <td className="py-2 px-4 max-w-xs truncate hidden md:table-cell" title={s.sanctions}>
                    {s.sanctions || '-'}
                  </td>
                  <td className="py-2 px-4 hidden md:table-cell">{s.createdBy || '-'}</td>
                  <td className="py-2 px-4">
                    <Link href={`/cases/${s._id}`} className="text-kmuGreen hover:text-kmuOrange transition">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </ProtectedRoute>
  );
}