"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../config/constants';
import { getAll, create, remove } from '../../utils/api';
import { useOfflineApi } from '../../hooks/useOfflineSync';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Type for a student
interface Student {
  studentId: string;
  fullName: string;
  department: string;
  year?: string;
  gender?: string;
}

const DEPARTMENTS = ['Computer Science', 'Biology', 'Mathematics'];
const YEARS = ['1', '2', '3', '4'];
const GENDERS = ['Male', 'Female', 'Other'];

export default function StudentsPage() {
  const { user, token, loading: authLoading } = useAuth();
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

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [offlineMode, setOfflineMode] = useState(false);
  const { apiCall, isLoading: apiLoading, error: apiError } = useOfflineApi();

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
      if (departmentFilter) {
        params.append('department', departmentFilter);
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
  }, [apiCall, page, limit, search, departmentFilter, yearFilter, genderFilter]);

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const student: Student = { studentId, fullName, department, year, gender };
      await create('students', student);
      setStudentId(''); setFullName(''); setDepartment(''); setYear(''); setGender('');
      setSuccess('Student added successfully!');
      loadStudents();
    } catch (err: any) {
      setError(err?.message || 'Network error, please try again');
    } finally {
      setLoading(false);
    }
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
        const requiredHeaders = ['studentId', 'fullName', 'department'];
        const missingHeaders = requiredHeaders.filter(h => 
          !headers.some(header => 
            header.toLowerCase().includes(h.toLowerCase())
          )
        );
        
        if (missingHeaders.length > 0) {
          setError(`Missing required columns: ${missingHeaders.join(', ')}. Please include: studentId, fullName, department`);
          setLoading(false);
          return;
        }
        
        studentsToImport = parsed.data.map((row: any, index: number) => {
          rowNumber = index + 2; // +2 because index starts at 0 and we have header row
          
          const student = {
            studentId: (row.studentId || row.StudentId || row.ID || row.id || '').toString().trim(),
            fullName: (row.fullName || row.FullName || row.Name || row.name || '').toString().trim(),
            department: (row.department || row.Department || '').toString().trim(),
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
          
          if (!student.department) {
            validationErrors.push(`Row ${rowNumber}: Missing Department`);
          }
          
          // Validate optional fields
          if (student.year && !['1', '2', '3', '4'].includes(student.year)) {
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
        const requiredHeaders = ['studentId', 'fullName', 'department'];
        const missingHeaders = requiredHeaders.filter(h => 
          !headers.some(header => 
            header.toLowerCase().includes(h.toLowerCase())
          )
        );
        
        if (missingHeaders.length > 0) {
          setError(`Missing required columns: ${missingHeaders.join(', ')}. Please include: studentId, fullName, department`);
          setLoading(false);
          return;
        }
        
        studentsToImport = (rows as any[]).map((row: any, index: number) => {
          rowNumber = index + 2; // +2 because index starts at 0 and we have header row
          
          const student = {
            studentId: (row.studentId || row.StudentId || row.ID || row.id || '').toString().trim(),
            fullName: (row.fullName || row.FullName || row.Name || row.name || '').toString().trim(),
            department: (row.department || row.Department || '').toString().trim(),
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
          
          if (!student.department) {
            validationErrors.push(`Row ${rowNumber}: Missing Department`);
          }
          
          // Validate optional fields
          if (student.year && !['1', '2', '3', '4'].includes(student.year)) {
            validationErrors.push(`Row ${rowNumber}: Invalid Year (must be 1, 2, 3, or 4)`);
          }
          
          if (student.gender && !['Male', 'Female', 'Other'].includes(student.gender)) {
            validationErrors.push(`Row ${rowNumber}: Invalid Gender (must be Male, Female, or Other)`);
          }
          
          return student;
        });
      }
      
      // Check for validation errors
      if (validationErrors.length > 0) {
        const errorMessage = `Validation errors found:\n${validationErrors.slice(0, 10).join('\n')}${validationErrors.length > 10 ? `\n... and ${validationErrors.length - 10} more errors` : ''}`;
        setError(errorMessage);
        setLoading(false);
        return;
      }
      
      // Filter out invalid records
      const validStudents = studentsToImport.filter(s => s.studentId && s.fullName && s.department);
      
      if (validStudents.length === 0) {
        setError('No valid students found in the file. Please ensure all required fields (Student ID, Full Name, Department) are filled.');
        setLoading(false);
        return;
      }
      
      // Check for duplicate student IDs in the import file
      const studentIds = validStudents.map(s => s.studentId);
      const duplicateIds = studentIds.filter((id, index) => studentIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        const uniqueDuplicates = Array.from(new Set(duplicateIds));
        setError(`Duplicate Student IDs found in import file: ${uniqueDuplicates.join(', ')}. Each Student ID must be unique.`);
        setLoading(false);
        return;
      }
      
      // Show preview
      const confirmed = window.confirm(
        `Ready to import ${validStudents.length} students:\n\n` +
        `- Valid records: ${validStudents.length}\n` +
        `- Skipped records: ${studentsToImport.length - validStudents.length}\n\n` +
        `Continue with import?`
      );
      
      if (!confirmed) {
        setLoading(false);
        return;
      }
      
      // Send to backend
      const res = await fetch(`${API_BASE_URL}/students/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ students: validStudents }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      const result = await res.json();
      
      // Show detailed results
      let successMessage = `✅ Successfully imported ${result.inserted} students.`;
      
      if (result.skipped && result.skipped > 0) {
        successMessage += `\n\n⚠️ ${result.skipped} students were skipped (already exist in database).`;
      }
      
      if (result.errors && result.errors.length > 0) {
        successMessage += `\n\n❌ ${result.errors.length} errors occurred:`;
        result.errors.slice(0, 5).forEach((error: any) => {
          successMessage += `\n- ${error.student?.studentId || 'Unknown'}: ${error.error}`;
        });
        if (result.errors.length > 5) {
          successMessage += `\n... and ${result.errors.length - 5} more errors`;
        }
      }
      
      if (studentsToImport.length - validStudents.length > 0) {
        successMessage += `\n\n⚠️ ${studentsToImport.length - validStudents.length} records were skipped due to missing required fields.`;
      }
      
      // Show summary if available
      if (result.summary) {
        successMessage += `\n\n📊 Summary: ${result.summary.successful} imported, ${result.summary.skipped} skipped, ${result.summary.failed} failed`;
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
            department: departmentFilter,
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
        <button
          type="button"
          onClick={handleExportStudentsList}
          className="w-full rounded bg-kmuGreen px-4 py-2 text-white transition hover:bg-kmuOrange sm:w-auto"
        >
          Export Students List
        </button>
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
      {loading && <div className="mb-4 text-sm text-kmuGreen">Loading...</div>}

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-kmuOrange">Add New Student</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label htmlFor="studentId" className="mb-1 block text-sm font-medium">Student ID *</label>
                <input
                  id="studentId"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="fullName" className="mb-1 block text-sm font-medium">Full Name *</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="department" className="mb-1 block text-sm font-medium">Department *</label>
                <select
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="year" className="mb-1 block text-sm font-medium">Year</label>
                  <select
                    id="year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Year</option>
                    {YEARS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="gender" className="mb-1 block text-sm font-medium">Gender</label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Gender</option>
                    {GENDERS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-kmuGreen px-4 py-2 text-white transition hover:bg-kmuOrange disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Student'}
              </button>
            </form>

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
                  CSV/Excel files should include columns: studentId, fullName, department (required)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white shadow dark:bg-gray-800">
            <div className="border-b border-gray-200 p-4 dark:border-gray-700 md:p-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Departments</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Years</option>
                  {YEARS.map((item) => (
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
                            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Department</div>
                            <div className="text-gray-900 dark:text-white">{s.department}</div>
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
                    <th className="hidden py-2 px-2 text-left sm:table-cell md:px-4">Department</th>
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
                        <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">{s.department}</div>
                      </td>
                      <td className="py-2 px-2 md:px-4">
                        <Link href={`/students/${(s as any)._id}`} className="font-medium text-kmuGreen hover:underline">
                          {s.fullName}
                        </Link>
                        <div className="mt-1 flex flex-col gap-1 sm:flex-row">
                          <Link href={`/students/${(s as any)._id}?tab=add-case`} className="text-xs text-kmuOrange hover:underline">
                            Add Case
                          </Link>
                          {s.year && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 sm:ml-2">
                              Year: {s.year}
                            </span>
                          )}
                          {s.gender && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 sm:ml-2">
                              {s.gender}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden py-2 px-2 sm:table-cell md:px-4">{s.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > 0 && (
              <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {Math.max(1, Math.ceil(total / limit))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Prev
                    </button>
                    {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).slice(0, 5).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`rounded px-3 py-2 text-sm ${p === page ? 'bg-kmuGreen text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                      onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
                      disabled={page === Math.ceil(total / limit) || total === 0}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
