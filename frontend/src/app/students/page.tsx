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
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-kmuGreen">Students</h1>
            {offlineMode && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                Offline Mode
              </span>
            )}
          </div>
        </div>
        {user && (user.role === 'admin' || user.role === 'academic_office') && (
          <form className="mb-4 flex gap-2 flex-wrap" onSubmit={handleAdd} aria-label="Add student form">
            <label htmlFor="studentId" className="sr-only">Student ID</label>
            <input id="studentId" type="text" placeholder="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" required aria-label="Student ID" />
            <label htmlFor="fullName" className="sr-only">Full Name</label>
            <input id="fullName" type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" required aria-label="Full Name" />
            <label htmlFor="department" className="sr-only">Department</label>
            <input id="department" type="text" placeholder="Department" value={department} onChange={e => setDepartment(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" required aria-label="Department" />
            <label htmlFor="year" className="sr-only">Year</label>
            <input id="year" type="text" placeholder="Year" value={year} onChange={e => setYear(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" aria-label="Year" />
            <label htmlFor="gender" className="sr-only">Gender</label>
            <select id="gender" value={gender} onChange={e => setGender(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" aria-label="Gender">
              <option value="">Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <button type="submit" className="bg-kmuGreen text-white px-4 py-1 rounded" disabled={loading} aria-label="Add student">Add</button>
          </form>
        )}
        <div className="mb-4 flex flex-col sm:flex-row gap-2 md:items-center">
          <div className="flex flex-wrap gap-2">
          <label className="bg-kmuOrange text-white px-4 py-2 rounded cursor-pointer hover:bg-kmuGreen transition text-sm">
            Import Students (CSV/Excel)
            <input type="file" accept=".csv,.xls,.xlsx" onChange={handleImport} className="hidden" />
          </label>
          <button 
            onClick={() => {
              const link = document.createElement('a');
              link.href = '/students_import_template.csv';
              link.download = 'students_import_template.csv';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm"
          >
            📥 Download Template
          </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by name or ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
            />
            <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              <option value="">All Years</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              <option value="">All Genders</option>
              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm" onClick={selectAll}>Select All</button>
            <button className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm" onClick={clearSelected}>Clear</button>
            {selected.length > 0 && (
              <>
                {(user?.role === 'admin' || user?.role === 'academic_office') && (
                  <button className="bg-red-600 text-white px-2 py-1 rounded text-sm" onClick={handleBulkDelete}>Delete Selected</button>
                )}
              </>
            )}
            <button className="bg-kmuGreen text-white px-2 py-1 rounded text-sm" onClick={handleExportStudentsList}>Export Students List (DOCX)</button>
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
        {success && <div className="text-kmuGreen text-sm mb-2" aria-live="polite">{success}</div>}
        {loading && <div className="text-kmuGreen text-sm mb-2">Loading...</div>}
        <div className="overflow-x-auto -mx-3 md:mx-0">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow text-sm md:text-base">
            <thead className="bg-kmuGreen text-white">
              <tr>
                <th className="py-2 px-2 md:px-4 text-left">
                  <input type="checkbox" checked={selected.length === filteredStudents.length && filteredStudents.length > 0} onChange={e => e.target.checked ? selectAll() : clearSelected()} />
                </th>
                <th className="py-2 px-2 md:px-4 text-left">ID</th>
                <th className="py-2 px-2 md:px-4 text-left">Name</th>
                <th className="py-2 px-2 md:px-4 text-left hidden sm:table-cell">Department</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(s => (
                <tr key={(s as any)._id} className="border-b border-gray-200 dark:border-gray-600">
                  <td className="py-2 px-2 md:px-4">
                    <input type="checkbox" checked={selected.includes((s as any)._id)} onChange={() => toggleSelect((s as any)._id)} />
                  </td>
                  <td className="py-2 px-2 md:px-4">
                    <div className="font-medium">{s.studentId}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">{s.department}</div>
                  </td>
                  <td className="py-2 px-2 md:px-4">
                    <div>
                      <Link href={`/students/${(s as any)._id}`} className="text-kmuGreen hover:underline font-medium">
                        {s.fullName}
                      </Link>
                      <div className="flex flex-col sm:flex-row gap-1 mt-1">
                        <Link href={`/students/${(s as any)._id}?tab=add-case`} className="text-kmuOrange hover:underline text-xs">
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
                    </div>
                  </td>
                  <td className="py-2 px-2 md:px-4 hidden sm:table-cell">{s.department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
  );
}