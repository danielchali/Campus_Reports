"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authHeaders, remove, exportDocx, exportExcel, exportDocxList } from '../../utils/api';
import { useOfflineApi } from '../../hooks/useOfflineSync';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../config/constants';
import { useSearchParams } from 'next/navigation';
import { saveAs } from 'file-saver';
import Notification, { useNotification } from '../../components/Notification';

interface Case {
  _id: string;
  student_id?: string; // Raw student ID from database
  student?: {
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
  const { token, user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Handle authentication like profile page - only on client side
  if (typeof window !== 'undefined') {
    if (!authLoading && !token) {
      router.replace('/login');
      return <div className="text-center text-kmuGreen">Redirecting to login...</div>;
    }
    
    if (authLoading) {
      return <div className="text-center text-kmuGreen">Loading...</div>;
    }
  }

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
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const { apiCall, isLoading: apiLoading, error: apiError } = useOfflineApi();
  const { notification, showNotification, hideNotification } = useNotification();

  const searchParams = useSearchParams();
  const studentIdFilter = searchParams?.get('studentId') || '';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.export-dropdown')) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);


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
        if (search) {
          params.append('search', search);
        }
        if (statusFilter) {
          params.append('status', statusFilter);
        }
        if (severityFilter) {
          params.append('severity', severityFilter);
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
        
        // Debug: Log cases with missing student data
        casesArray.forEach((caseItem: any, index: number) => {
          if (!caseItem.student) {
            console.warn(`Case ${index} has no student data:`, {
              caseId: caseItem._id,
              studentId: caseItem.student_id,
              caseData: caseItem
            });
          }
        });
        
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
  }, [apiCall, studentIdFilter, search, statusFilter, severityFilter, page, limit]);

  const safeCases = Array.isArray(cases) ? cases : [];
  const filteredCases = safeCases; // Backend handles all filtering now

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

  const handleExportCasesList = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/reports/cases-docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          filters: {
            search,
            status: statusFilter,
            severity: severityFilter,
            studentId: studentIdFilter
          }
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      saveAs(blob, 'cases_list.docx');
    } catch (err) {
      alert('Failed to export cases list.');
    }
  };



  return (
    <>
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
            
            {/* Word Export Dropdown */}
            <div className="relative export-dropdown">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={exporting}
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-1"
              >
                {exporting ? 'Exporting...' : 'Export to Word'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showExportDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-50 min-w-48">
                  <div className="py-1">
                    <button
                      onClick={async () => {
                        setShowExportDropdown(false);
                        setExporting(true);
                        try {
                          await handleExportCurrentPage('docx');
                        } catch (err) {
                          console.error('Export failed:', err);
                          alert('Export failed');
                        } finally {
                          setExporting(false);
                        }
                      }}
                      disabled={exporting || filteredCases.length === 0}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Current Page (Table Format)
                    </button>
                    <button
                      onClick={async () => {
                        setShowExportDropdown(false);
                        setExporting(true);
                        try {
                          await handleExportFiltered('docx');
                        } catch (err) {
                          console.error('Export failed:', err);
                          alert('Export failed');
                        } finally {
                          setExporting(false);
                        }
                      }}
                      disabled={exporting}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Filtered Results (Table Format)
                    </button>
                    <button
                      onClick={async () => {
                        setShowExportDropdown(false);
                        setExporting(true);
                        try {
                          await exportDocxList('cases');
                        } catch (err) {
                          console.error('List export failed:', err);
                          alert('Export failed');
                        } finally {
                          setExporting(false);
                        }
                      }}
                      disabled={exporting}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      All Cases (List Format)
                    </button>
                    <button
                      onClick={async () => {
                        setShowExportDropdown(false);
                        setExporting(true);
                        try {
                          await handleExportCasesList();
                        } catch (err) {
                          console.error('Cases list export failed:', err);
                          alert('Export failed');
                        } finally {
                          setExporting(false);
                        }
                      }}
                      disabled={exporting}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cases List (DOCX)
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Excel Export Buttons */}
            <button
              onClick={() => handleExportCurrentPage('xlsx')}
              disabled={exporting || filteredCases.length === 0}
              className="bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800 disabled:opacity-50 text-sm"
            >
              {exporting ? 'Exporting...' : 'Export Current Page (Excel)'}
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
                <th className="py-2 px-2 md:px-4 text-left">
                  <input type="checkbox" checked={selected.length === filteredCases.length && filteredCases.length > 0} onChange={e => e.target.checked ? selectAll() : clearSelected()} />
                </th>
                <th className="py-2 px-2 md:px-4 text-left">Name</th>
                <th className="py-2 px-2 md:px-4 text-left hidden md:table-cell">Department</th>
                <th className="py-2 px-2 md:px-4 text-left hidden md:table-cell">Date</th>
                <th className="py-2 px-2 md:px-4 text-left">Offense</th>
                <th className="py-2 px-2 md:px-4 text-left hidden md:table-cell">Status</th>
                <th className="py-2 px-2 md:px-4 text-left hidden md:table-cell">Severity</th>
                <th className="py-2 px-2 md:px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map(s => (
                <tr key={s._id} className="border-b border-gray-200 dark:border-gray-600">
                  <td className="py-2 px-2 md:px-4">
                    <input type="checkbox" checked={selected.includes(s._id)} onChange={() => toggleSelect(s._id)} />
                  </td>
                  <td className="py-2 px-2 md:px-4">
                    {s.student ? (
                      <div>
                        <Link href={`/students/${s.student._id || s.student.studentId}`} className="text-kmuGreen hover:underline font-medium">
                          {s.student.fullName}
                        </Link>
                        <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">
                          {s.student?.department || '-'} • {s.incidentDate ? new Date(s.incidentDate).toLocaleDateString() : '-'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500" title={`Student ID: ${s.student_id || 'Unknown'}`}>
                        Student not found
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 md:px-4 hidden md:table-cell">{s.student?.department || '-'}</td>
                  <td className="py-2 px-2 md:px-4 hidden md:table-cell">{s.incidentDate ? new Date(s.incidentDate).toLocaleDateString() : '-'}</td>
                  <td className="py-2 px-2 md:px-4">
                    <div className="font-medium">{s.offenseType || '-'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">
                      <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded-full ${
                        s.status?.toLowerCase() === 'open' ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20' :
                        s.status?.toLowerCase() === 'closed' ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' :
                        'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
                      }`}>
                        {s.status || '-'}
                      </span>
                      {' • '}
                      <span className={`inline-flex px-1 py-0.5 text-xs font-semibold rounded-full ${
                        s.severity?.toLowerCase() === 'high' ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20' :
                        s.severity?.toLowerCase() === 'medium' ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20' :
                        s.severity?.toLowerCase() === 'low' ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' :
                        'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
                      }`}>
                        {s.severity || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2 md:px-4 hidden md:table-cell">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      s.status?.toLowerCase() === 'open' ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20' :
                      s.status?.toLowerCase() === 'closed' ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' :
                      'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {s.status || '-'}
                    </span>
                  </td>
                  <td className="py-2 px-2 md:px-4 hidden md:table-cell">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      s.severity?.toLowerCase() === 'high' ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20' :
                      s.severity?.toLowerCase() === 'medium' ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20' :
                      s.severity?.toLowerCase() === 'low' ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' :
                      'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {s.severity || '-'}
                    </span>
                  </td>
                  <td className="py-2 px-2 md:px-4">
                    <Link href={`/cases/${s._id}`} className="text-kmuGreen hover:text-kmuOrange transition text-sm">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      
      {/* Notification */}
      {notification?.isVisible && (
        <Notification
          type={notification.type}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
      )}
    </>
  );
}