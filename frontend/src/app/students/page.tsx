"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../../config/constants';
import { getAll, create, remove, exportDocx, exportExcel } from '../../utils/api';
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
  const { user, token } = useAuth();
  const router = useRouter();
  
  // Handle authentication like profile page
  if (!token) {
    router.replace('/login');
    return <div className="text-center text-kmuGreen">Redirecting to login...</div>;
  }
  
  if (!user) {
    return <div className="text-center text-kmuGreen">Loading...</div>;
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
      const response = await apiCall<{students: Student[], total: number}>('get', `/students?page=${pageNum}&limit=${limit}`);
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
  }, [apiCall, page, limit]);

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
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      let studentsToImport: Student[] = [];
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true });
        studentsToImport = parsed.data.map((row: any) => ({
          studentId: row.studentId || row.StudentId || row.ID || row.id,
          fullName: row.fullName || row.FullName || row.Name || row.name,
          department: row.department || row.Department,
          year: row.year || row.Year,
          gender: row.gender || row.Gender,
        })).filter(s => s.studentId && s.fullName && s.department);
      } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        studentsToImport = (rows as any[]).map((row: any) => ({
          studentId: row.studentId || row.StudentId || row.ID || row.id,
          fullName: row.fullName || row.FullName || row.Name || row.name,
          department: row.department || row.Department,
          year: row.year || row.Year,
          gender: row.gender || row.Gender,
        })).filter(s => s.studentId && s.fullName && s.department);
      } else {
        setError('Unsupported file type. Please upload a CSV or Excel file.');
        setLoading(false);
        return;
      }
      if (studentsToImport.length === 0) {
        setError('No valid students found in the file.');
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/students/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ students: studentsToImport }),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setSuccess(`Imported ${result.inserted} students. ${result.errors.length ? result.errors.length + ' errors.' : ''}`);
      loadStudents();
    } catch (err: any) {
      setError(err.message || 'Failed to import students');
    } finally {
      setLoading(false);
    }
  }

  const safeStudents = Array.isArray(students) ? students : [];
  const filteredStudents = safeStudents.filter(
    (s) =>
      (!search ||
        s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(search.toLowerCase())
      ) &&
      (!departmentFilter || s.department === departmentFilter) &&
      (!yearFilter || s.year === yearFilter) &&
      (!genderFilter || s.gender === genderFilter)
  );
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
  async function handleBulkExport() {
    await exportDocx('students');
  }
  async function handleBulkExportExcel() {
    await exportExcel('students');
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
        <div className="mb-4 flex flex-col md:flex-row gap-2 md:items-center">
          <div className="flex flex-wrap gap-2">
          <label className="bg-kmuOrange text-white px-4 py-2 rounded cursor-pointer hover:bg-kmuGreen transition">
            Import Students (CSV/Excel)
            <input type="file" accept=".csv,.xls,.xlsx" onChange={handleImport} className="hidden" />
          </label>
          <input
            type="text"
            placeholder="Search by name or ID"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option value="">All Genders</option>
            {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button className="bg-gray-200 text-gray-700 px-2 py-1 rounded" onClick={selectAll}>Select All</button>
          <button className="bg-gray-200 text-gray-700 px-2 py-1 rounded" onClick={clearSelected}>Clear</button>
          {selected.length > 0 && (
            <>
              {(user?.role === 'admin' || user?.role === 'academic_office') && (
                <button className="bg-red-600 text-white px-2 py-1 rounded" onClick={handleBulkDelete}>Delete Selected</button>
              )}
              <button className="bg-kmuGreen text-white px-2 py-1 rounded" onClick={handleBulkExport}>Export Selected (Word)</button>
              <button className="bg-blue-600 text-white px-2 py-1 rounded" onClick={handleBulkExportExcel}>Export Selected (Excel)</button>
            </>
          )}
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
                <th><input type="checkbox" checked={selected.length === filteredStudents.length && filteredStudents.length > 0} onChange={e => e.target.checked ? selectAll() : clearSelected()} /></th>
                <th className="py-2 px-4 text-left">ID</th>
                <th className="py-2 px-4 text-left">Name</th>
                <th className="py-2 px-4 text-left">Department</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(s => (
                <tr key={(s as any)._id} className="border-b border-gray-200 dark:border-gray-600">
                  <td><input type="checkbox" checked={selected.includes((s as any)._id)} onChange={() => toggleSelect((s as any)._id)} /></td>
                  <td className="py-2 px-4">{s.studentId}</td>
                  <td className="py-2 px-4">
                    <Link href={`/students/${(s as any)._id}`} className="text-kmuGreen hover:underline">
                      {s.fullName}
                    </Link>
                    <Link href={`/students/${(s as any)._id}?tab=add-case`} className="ml-2 text-kmuOrange hover:underline text-sm">Add Case</Link>
                  </td>
                  <td className="py-2 px-4">{s.department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
  );
}