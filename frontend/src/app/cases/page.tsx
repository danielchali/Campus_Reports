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
import { canAccessPage } from '../../utils/access';
import { PageSkeleton, TableSkeleton } from '../../components/PageSkeleton';

interface Student {
  _id: string;
  studentId: string;
  fullName: string;
  department?: string;
  program?: string;
}

interface Staff {
  _id: string;
  staffId: string;
  fullName: string;
  department?: string;
  position?: string;
}

interface Case {
  _id: string;
  caseId?: string;
  student_id?: string; // Raw student ID from database
  student?: Student;
  staff_id?: string; // Raw staff ID from database
  staff?: Staff;
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
    }
    if (!token) {
      return <PageSkeleton />;
    }

    if (!user || !canAccessPage(user.role, 'cases')) {
      return <div className="text-red-600">Access denied.</div>;
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
  const staffIdFilter = searchParams?.get('staffId') || '';

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
        if (staffIdFilter) {
          params.append('staffId', staffIdFilter);
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
        
        // Debug: Log cases with missing person data
        casesArray.forEach((caseItem: any, index: number) => {
          if (!caseItem.student && !caseItem.staff) {
            console.warn(`Case ${index} has no person data:`, {
              caseId: caseItem._id,
              studentId: caseItem.student_id,
              staffId: caseItem.staff_id,
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
  }, [apiCall, studentIdFilter, staffIdFilter, search, statusFilter, severityFilter, page, limit]);

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
      const filename = `cases_${new Date().toISOString().split('T')[0]}.${format}`;
      saveAs(blob, filename);
      
      showNotification('success', 'Export successful!');
    } catch (err) {
      console.error('Export failed:', err);
      showNotification('error', 'Export failed');
    } finally {
      setExporting(false);
      setShowExportDropdown(false);
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
            studentId: studentIdFilter,
            staffId: staffIdFilter
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

  // Get person information for a case (either student or staff)
  const getCasePerson = (caseItem: Case) => {
    if (caseItem.student) {
      return {
        type: 'student',
        id: caseItem.student.studentId,
        name: caseItem.student.fullName,
        department: caseItem.student.program,
        link: `/students/${caseItem.student._id}`
      };
    } else if (caseItem.staff) {
      return {
        type: 'staff',
        id: caseItem.staff.staffId,
        name: caseItem.staff.fullName,
        department: caseItem.staff.department,
        link: `/staff/${caseItem.staff._id}`
      };
    }
    return null;
  };

  // Get person ID for a case
  const getCasePersonId = (caseItem: Case) => {
    return caseItem.student?.studentId || caseItem.staff?.staffId || 'N/A';
  };

  // Get person name for a case
  const getCasePersonName = (caseItem: Case) => {
    return caseItem.student?.fullName || caseItem.staff?.fullName || 'Unknown';
  };

  const getCaseDisplayId = (caseItem: Case) => {
    return caseItem.caseId || caseItem._id;
  };

  if (loading) {
    return (
      <section className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-32 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="flex gap-3">
            <div className="h-10 w-28 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-10 w-20 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
        </div>
        <TableSkeleton rows={8} cols={5} />
      </section>
    );
  }

  return (
    <>
      <section className="max-w-6xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-kmuGreen">Cases</h1>
            {offlineMode && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                Offline Mode
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            <Link 
              href="/cases/new" 
              className="bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition flex items-center"
            >
              + New Case
            </Link>
            
            <div className="relative export-dropdown">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={exporting}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : 'Export'}
              </button>
              
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleExportSelected('docx')}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Export Selected (DOCX)
                  </button>
                  <button
                    onClick={() => handleExportSelected('xlsx')}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Export Selected (Excel)
                  </button>
                  <button
                    onClick={handleExportCasesList}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
                  >
                    Export All (DOCX)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {notification?.isVisible && (
          <Notification
            type={notification.type}
            message={notification.message}
            isVisible={notification.isVisible}
            onClose={hideNotification}
          />
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium mb-1">Search</label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cases..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="severity" className="block text-sm font-medium mb-1">Severity</label>
              <select
                id="severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Severities</option>
                {SEVERITY_OPTIONS.map(severity => (
                  <option key={severity} value={severity}>{severity}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium mb-1">Student ID</label>
              <input
                id="studentId"
                type="text"
                value={studentIdFilter}
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('studentId', e.target.value);
                  window.history.replaceState({}, '', url);
                }}
                placeholder="Filter by student ID"
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label htmlFor="staffId" className="block text-sm font-medium mb-1">Staff ID</label>
              <input
                id="staffId"
                type="text"
                value={staffIdFilter}
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('staffId', e.target.value);
                  window.history.replaceState({}, '', url);
                }}
                placeholder="Filter by staff ID"
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selected.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="text-sm">
              {selected.length} case{selected.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Delete Selected
              </button>
              <button
                onClick={clearSelected}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Mobile cards */}
        <div className="space-y-4 md:hidden">
          {filteredCases.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400">
              No cases found
            </div>
          ) : (
            filteredCases.map((s) => {
              const person = getCasePerson(s);
              return (
                <div
                  key={s._id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  onClick={() => router.push(`/cases/${s._id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(s._id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(s._id)}
                        className="mt-1"
                      />
                      <div>
                        {person ? (
                          <>
                            <Link href={person.link} className="text-kmuGreen hover:underline font-semibold">
                              {person.name}
                            </Link>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {person.type === 'student' ? 'Student' : 'Staff'} • {person.id}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-semibold text-gray-900 dark:text-white">Unknown</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">No person data</div>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{getCaseDisplayId(s)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Date</div>
                      <div className="text-gray-900 dark:text-white">{s.incidentDate ? new Date(s.incidentDate).toLocaleDateString() : '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Offense</div>
                      <div className="text-gray-900 dark:text-white">{s.offenseType || '-'}</div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">Tap to view details</div>
                </div>
              );
            })
          )}
        </div>

        {/* Cases Table */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="py-2 px-2 md:px-4">
                    <input
                      type="checkbox"
                      checked={selected.length === filteredCases.length && filteredCases.length > 0}
                      onChange={selected.length === filteredCases.length && filteredCases.length > 0 ? clearSelected : selectAll}
                    />
                  </th>
                  <th className="py-2 px-2 md:px-4 text-left">ID</th>
                  <th className="py-2 px-2 md:px-4 text-left">Person</th>
                  <th className="py-2 px-2 md:px-4 text-left">Offense</th>
                  <th className="py-2 px-2 md:px-4 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-gray-500 dark:text-gray-400">
                      No cases found
                    </td>
                  </tr>
                ) : (
                  filteredCases.map(s => {
                    const person = getCasePerson(s);
                    return (
                      <tr
                        key={s._id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => router.push(`/cases/${s._id}`)}
                      >
                        <td className="py-2 px-2 md:px-4">
                          <input
                            type="checkbox"
                            checked={selected.includes(s._id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleSelect(s._id)}
                          />
                        </td>
                        <td className="py-2 px-2 md:px-4 text-xs text-gray-500 dark:text-gray-400">
                          {getCaseDisplayId(s)}
                        </td>
                        <td className="py-2 px-2 md:px-4">
                          {person ? (
                            <div>
                              <Link href={person.link} className="text-kmuGreen hover:underline font-medium">
                                {person.name}
                              </Link>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {person.type === 'student' ? 'Student' : 'Staff'} • {person.id}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium">Unknown</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                No person data
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 md:px-4">
                          {s.offenseType || '-'}
                        </td>
                        <td className="py-2 px-2 md:px-4">
                          {s.incidentDate ? new Date(s.incidentDate).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {total > limit && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} cases
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * limit >= total}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
