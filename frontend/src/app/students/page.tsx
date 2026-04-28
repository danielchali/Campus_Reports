"use client";
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, getAvailableYearsForProgram, PROGRAM_OPTIONS, YEAR_OPTIONS } from '../../config/constants';
import { getAll, create, remove } from '../../utils/api';
import { useOfflineApi } from '../../hooks/useOfflineSync';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { canAccessPage } from '../../utils/access';
import { PageSkeleton, InlineSkeleton } from '../../components/PageSkeleton';
import CreateStudentModal from '../../components/CreateStudentModal';

// Type for a student
interface Student {
  _id?: string;
  studentId: string;
  fullName: string;
  program?: string;
  year?: string;
  gender?: string;
}

const GENDERS = ['Male', 'Female', 'Other'];

export default function StudentsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [programFilter, setProgramFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [offlineMode, setOfflineMode] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { apiCall, isLoading: apiLoading, error: apiError } = useOfflineApi();
  
  // Handle authentication like profile page - only on client side
  if (typeof window !== 'undefined') {
    if (!authLoading && !token) {
      router.replace('/login');
    }
    if (!token) {
      return <PageSkeleton />;
    }

    if (!user || !canAccessPage(user.role, 'students')) {
      return <div className="text-red-600">Access denied.</div>;
    }
  }

  async function loadStudents(pageNum = page) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', limit.toString());
      
      if (search) {
        params.append('search', search);
      }
      if (programFilter) {
        params.append('program', programFilter);
      }
      if (yearFilter) {
        params.append('year', yearFilter);
      }
      if (genderFilter) {
        params.append('gender', genderFilter);
      }
      
      const response = await apiCall<{students: Student[], total: number}>('get', `/students?${params.toString()}`);
      const data = response.data;
      setStudents(data.students);
      setTotal(data.total);
      setOfflineMode(response.offline);
    } catch (err: any) {
      setError(err?.message || 'Network error, please try again');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents(page);
    // eslint-disable-next-line
  }, [apiCall, page, limit, search, programFilter, yearFilter, genderFilter]);

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  function handleCreateSuccess() {
    setSuccess('Student user created successfully!');
    loadStudents();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Clear previous messages
    setError(null);
    setSuccess(null);
    setLoading(true);
    
    try {
      // Validate file type
      const validExtensions = ['.csv', '.xls', '.xlsx'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        setError(`Unsupported file type: ${fileExtension}. Please upload a CSV (.csv) or Excel (.xls, .xlsx) file.`);
        setLoading(false);
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 5MB.`);
        setLoading(false);
        return;
      }
      
      let studentsToImport: Student[] = [];
      let validationErrors: string[] = [];
      let rowNumber = 1; // Start from 1 for user-friendly row numbers
      
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const parsed = Papa.parse(text, { 
          header: true, 
          skipEmptyLines: true,
          transformHeader: (header) => header.trim()
        });
        
        // Validate headers
        const headers = Object.keys(parsed.data[0] || {});
        const requiredHeaders = ['studentId', 'fullName', 'program'];
        const missingHeaders = requiredHeaders.filter(h => 
          !headers.some(header => 
            header.toLowerCase().includes(h.toLowerCase())
          )
        );
        
        if (missingHeaders.length > 0) {
          setError(`Missing required columns: ${missingHeaders.join(', ')}. Please include: studentId, fullName, program`);
          setLoading(false);
          return;
        }
        
        studentsToImport = parsed.data.map((row: any, index: number) => {
          rowNumber = index + 2; // +2 because index starts at 0 and we have header row
          
          const student = {
            studentId: (row.studentId || row.StudentId || row.ID || row.id || '').toString().trim(),
            fullName: (row.fullName || row.FullName || row.Name || row.name || '').toString().trim(),
            program: (row.program || row.Program || '').toString().trim(),
            year: (row.year || row.Year || '').toString().trim(),
            gender: (row.gender || row.Gender || '').toString().trim(),
          };
          
          // Validate required fields
          if (!student.studentId) {
            validationErrors.push(`Row ${rowNumber}: Missing Student ID`);
          } else if (student.studentId.length < 3) {
            validationErrors.push(`Row ${rowNumber}: Student ID too short (minimum 3 characters)`);
          }
          
          if (!student.fullName) {
            validationErrors.push(`Row ${rowNumber}: Missing Full Name`);
          } else if (student.fullName.length < 2) {
            validationErrors.push(`Row ${rowNumber}: Full Name too short (minimum 2 characters)`);
          }
          
          if (!student.program) {
            validationErrors.push(`Row ${rowNumber}: Missing Program`);
          }
          
          // Validate optional fields
          if (student.year && !['1', '2', '3', '4', '5'].includes(student.year)) {
            validationErrors.push(`Row ${rowNumber}: Invalid Year (must be 1, 2, 3, or 4)`);
          }
          
          if (student.gender && !['Male', 'Female', 'Other'].includes(student.gender)) {
            validationErrors.push(`Row ${rowNumber}: Invalid Gender (must be Male, Female, or Other)`);
          }
          
          return student;
        });
        
      } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        
        if (rows.length === 0) {
          setError('Excel file is empty or has no data rows.');
          setLoading(false);
          return;
        }
        
        // Validate headers
        const headers = Object.keys(rows[0] || {});
        const requiredHeaders = ['studentId', 'fullName', 'program'];
        const missingHeaders = requiredHeaders.filter(h => 
          !headers.some(header => 
            header.toLowerCase().includes(h.toLowerCase())
          )
        );
        
        if (missingHeaders.length > 0) {
          setError(`Missing required columns: ${missingHeaders.join(', ')}. Please include: studentId, fullName, program`);
          setLoading(false);
          return;
        }
        
        studentsToImport = (rows as any[]).map((row: any, index: number) => {
          rowNumber = index + 2; // +2 because index starts at 0 and we have header row
          
          const student = {
            studentId: (row.studentId || row.StudentId || row.ID || row.id || '').toString().trim(),
            fullName: (row.fullName || row.FullName || row.Name || row.name || '').toString().trim(),
            program: (row.program || row.Program || '').toString().trim(),
            year: (row.year || row.Year || '').toString().trim(),
            gender: (row.gender || row.Gender || '').toString().trim(),
          };
          
          // Validate required fields
          if (!student.studentId) {
            validationErrors.push(`Row ${rowNumber}: Missing Student ID`);
          } else if (student.studentId.length < 3) {
            validationErrors.push(`Row ${rowNumber}: Student ID too short (minimum 3 characters)`);
          }
          
          if (!student.fullName) {
            validationErrors.push(`Row ${rowNumber}: Missing Full Name`);
          } else if (student.fullName.length < 2) {
            validationErrors.push(`Row ${rowNumber}: Full Name too short (minimum 2 characters)`);
          }
          
          if (!student.program) {
            validationErrors.push(`Row ${rowNumber}: Missing Program`);
          }
          
          // Validate optional fields
          if (student.year && !['1', '2', '3', '4', '5'].includes(student.year)) {
            validationErrors.push(`Row ${rowNumber}: Invalid Year (must be 1, 2, 3, or 4)`);
          }
          
          if (student.gender && !['Male', 'Female', 'Other'].includes(student.gender)) {
            validationErrors.push(`Row ${rowNumber}: Invalid Gender (must be Male, Female, or Other)`);
          }
          
          return student;
        });
      }
      
      // If there are validation errors, show them
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors.slice(0, 10).join('\n');
        const moreErrors = validationErrors.length > 10 ? `\n... and ${validationErrors.length - 10} more errors` : '';
        setError(`Validation errors found:\n${errorMessage}${moreErrors}`);
        setLoading(false);
        return;
      }
      
      // Filter out invalid entries (those with empty required fields)
      studentsToImport = studentsToImport.filter(s => s.studentId && s.fullName && s.program);
      
      if (studentsToImport.length === 0) {
        setError('No valid student records found in the file.');
        setLoading(false);
        return;
      }
      
      // Import students
      const importResponse = await apiCall<{success: boolean, summary?: {successful: number, skipped: number, failed: number}}>('post', '/students/import', studentsToImport);
      
      let successMessage = `Successfully imported ${studentsToImport.length} student records!`;
      
      // Show summary if available
      if (importResponse.data.summary) {
        successMessage += `\n\n📊 Summary: ${importResponse.data.summary.successful} imported, ${importResponse.data.summary.skipped} skipped, ${importResponse.data.summary.failed} failed`;
      }
      
      setSuccess(successMessage);
      loadStudents();
      
    } catch (err: any) {
      console.error('Import error:', err);
      setError(`Import failed: ${err.message || 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
      // Clear the file input
      e.target.value = '';
    }
  }

  const safeStudents = Array.isArray(students) ? students : [];
  const filteredStudents = safeStudents; // Backend handles all filtering now
  function toggleSelect(id: string) {
    setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  }
  function selectAll() {
    setSelected(filteredStudents.map(s => (s as any)._id));
  }
  function clearSelected() {
    setSelected([]);
  }
  async function handleBulkDelete() {
    if (!window.confirm('Delete selected students?')) return;
    for (const id of selected) {
      await remove('students', id);
    }
    setStudents(students => students.filter(s => !selected.includes((s as any)._id)));
    setSelected([]);
  }


  async function handleExportStudentsList() {
    try {
      const res = await fetch(`${API_BASE_URL}/reports/students-docx`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filters: {
            program: programFilter,
            year: yearFilter,
            gender: genderFilter,
            search: search
          }
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'students_list.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export students list.');
    }
  }



  return (
    <section className="max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-kmuGreen">Students</h1>
          {offlineMode && (
            <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
              Offline Mode
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full rounded bg-kmuGreen px-4 py-2 text-white transition hover:bg-kmuOrange sm:w-auto"
          >
            Add New Student
          </button>
          <button
            type="button"
            onClick={handleExportStudentsList}
            className="w-full rounded bg-kmuGreen px-4 py-2 text-white transition hover:bg-kmuOrange sm:w-auto"
          >
            Export Students List
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" aria-live="polite">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" aria-live="polite">
          {success}
        </div>
      )}
      {loading && <div className="mb-4"><InlineSkeleton rows={5} /></div>}

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
              <h3 className="mb-3 font-medium">Bulk Import</h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Upload CSV or Excel file:</span>
                  <input
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleImport}
                    disabled={loading}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-kmuGreen file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-kmuOrange"
                  />
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  CSV/Excel files should include columns: studentId, fullName, program (required)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white shadow dark:bg-gray-800">
            <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <select
                  value={programFilter}
                  onChange={(e) => setProgramFilter(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Programs</option>
                  {PROGRAM_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Years</option>
                  {YEAR_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Genders</option>
                  {GENDERS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  onClick={selectAll}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  onClick={clearSelected}
                >
                  Clear
                </button>
                {selected.length > 0 && (
                  <button
                    type="button"
                    className="rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                    onClick={handleBulkDelete}
                  >
                    Delete Selected
                  </button>
                )}
                <div className="flex items-center justify-center rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                  {selected.length} selected
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 md:hidden">
              {filteredStudents.length === 0 ? (
                <div className="rounded-lg bg-white p-6 text-center text-gray-500 shadow dark:bg-gray-800 dark:text-gray-400">
                  No students found
                </div>
              ) : (
                filteredStudents.map((s) => (
                  <div key={(s as any)._id} className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.includes((s as any)._id)}
                        onChange={() => toggleSelect((s as any)._id)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link href={`/students/${(s as any)._id}`} className="font-semibold text-kmuGreen hover:underline">
                              {s.fullName}
                            </Link>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{s.studentId}</div>
                          </div>
                          <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                            {s.year ? `Year ${s.year}` : ''}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Program</div>
                            <div className="text-gray-900 dark:text-white">{s.program}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Gender</div>
                            <div className="text-gray-900 dark:text-white">{s.gender || '-'}</div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Link href={`/students/${(s as any)._id}`} className="text-sm font-medium text-kmuGreen hover:underline">
                            View Profile
                          </Link>
                          <Link href={`/students/${(s as any)._id}?tab=add-case`} className="text-sm text-kmuOrange hover:underline">
                            Add Case
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full bg-white text-sm dark:bg-gray-800 md:text-base">
                <thead className="bg-kmuGreen text-white">
                  <tr>
                    <th className="py-2 px-2 text-left md:px-4">
                      <input
                        type="checkbox"
                        checked={selected.length === filteredStudents.length && filteredStudents.length > 0}
                        onChange={(e) => (e.target.checked ? selectAll() : clearSelected())}
                      />
                    </th>
                    <th className="py-2 px-2 text-left md:px-4">ID</th>
                    <th className="py-2 px-2 text-left md:px-4">Name</th>
                    <th className="hidden py-2 px-2 text-left sm:table-cell md:px-4">Program</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={(s as any)._id} className="border-b border-gray-200 dark:border-gray-600">
                      <td className="py-2 px-2 md:px-4">
                        <input
                          type="checkbox"
                          checked={selected.includes((s as any)._id)}
                          onChange={() => toggleSelect((s as any)._id)}
                        />
                      </td>
                      <td className="py-2 px-2 md:px-4">
                        <div className="font-medium">{s.studentId}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">{s.program}</div>
                      </td>
                      <td className="py-2 px-2 md:px-4">
                        <Link href={`/students/${(s as any)._id}`} className="font-medium text-kmuGreen hover:underline">
                          {s.fullName}
                        </Link>
                      </td>
                      <td className="hidden py-2 px-2 text-sm sm:table-cell md:px-4">{s.program}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredStudents.length === 0 && (
              <div className="rounded-lg bg-white p-6 text-center text-gray-500 shadow dark:bg-gray-800 dark:text-gray-400">
                No students found
              </div>
            )}

            <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredStudents.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page * limit >= total}
                    className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateStudentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </section>
  );
}
