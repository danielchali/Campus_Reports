"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, OFFENSE_TYPES, SEVERITY_LEVELS } from '../../config/constants';
import { authHeaders } from '../../utils/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SmartStudentSearch from '../../components/SmartStudentSearch';

interface Student {
  studentId: string;
  fullName: string;
  department: string;
  year?: string;
  gender?: string;
}

export default function SecurityDashboard() {
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
    
    if (!user || user.role !== 'security_officer') return <div className="text-red-600">Access denied.</div>;
  }

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [incidentDate, setIncidentDate] = useState('');
  const [offenseType, setOffenseType] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [sanctions, setSanctions] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [cases, setCases] = useState<any[]>([]);
  const [filteredCases, setFilteredCases] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [offenseTypeDescription, setOffenseTypeDescription] = useState('');

  // Function to get description for selected offense type
  const getOffenseTypeDescription = (offenseType: string) => {
    const offense = OFFENSE_TYPES.find(ot => ot.value === offenseType);
    return offense ? offense.description : '';
  };

  // Function to handle offense type change
  const handleOffenseTypeChange = (offenseType: string) => {
    setOffenseType(offenseType);
    setOffenseTypeDescription(getOffenseTypeDescription(offenseType));
  };

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch(`${API_BASE_URL}/students`, { headers: { ...authHeaders() } });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : (data.students || data || []));
      } catch (err: any) {
        setError(err?.message || 'Network error, please try again');
      }
    }
    async function fetchCases() {
      try {
        const res = await fetch(`${API_BASE_URL}/cases`, { headers: { ...authHeaders() } });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setCases(Array.isArray(data) ? data : (data.cases || data || []));
      } catch (err: any) {
        setError(err?.message || 'Network error, please try again');
      }
    }
    fetchStudents();
    fetchCases();
  }, [token]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Filter students and cases for search
  useEffect(() => {
    const safeStudents = Array.isArray(students) ? students : [];
    const safeCases = Array.isArray(cases) ? cases : [];
    setFilteredCases(
      search ? safeCases.filter((c: any) =>
        c.student?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        c.student?.studentId?.toLowerCase().includes(search.toLowerCase()) ||
        c.offenseType?.toLowerCase().includes(search.toLowerCase()) ||
        c.status?.toLowerCase().includes(search.toLowerCase())
      ) : safeCases
    );
    setFilteredStudents(
      search ? safeStudents.filter((s: any) =>
        s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(search.toLowerCase())
      ) : safeStudents
    );
  }, [search, cases, students]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ 
          student_id: studentId, 
          incident_date: incidentDate, 
          offense_type: offenseType, 
          severity, 
          description, 
          sanctions 
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess('Case submitted successfully!');
      setStudentId(''); setIncidentDate(''); setOffenseType(''); setSeverity(''); setDescription(''); setSanctions('');
      // Refresh cases list
      const casesRes = await fetch(`${API_BASE_URL}/cases`, { headers: { ...authHeaders() } });
      if (casesRes.ok) {
        const casesData = await casesRes.json();
        setCases(Array.isArray(casesData) ? casesData : (casesData.cases || casesData || []));
      }
    } catch (err: any) {
      setError(err?.message || 'Network error, please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-kmuOrange">Add New Case</h2>
          <form className="mb-6 flex gap-2 flex-wrap" onSubmit={handleSubmit} aria-label="Add case form">
            <label htmlFor="studentId" className="sr-only">Student</label>
            <div className="space-y-2">
              <SmartStudentSearch
                onStudentSelect={(student) => {
                  setSelectedStudent(student);
                  setStudentId(student.studentId);
                }}
                placeholder="Search for student by name or ID..."
                className="w-full"
              />
              {selectedStudent && (
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  Selected: <strong>{selectedStudent.fullName}</strong> ({selectedStudent.studentId}) - {selectedStudent.department}, Year {selectedStudent.year}
                </div>
              )}
            </div>
            <label htmlFor="incidentDate" className="sr-only">Incident Date</label>
            <input id="incidentDate" type="date" placeholder="Incident Date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required aria-label="Incident Date" />
            <label htmlFor="offenseType" className="sr-only">Offense Type</label>
            <select
              id="offenseType"
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={offenseType}
              onChange={e => handleOffenseTypeChange(e.target.value)}
              required
              aria-label="Offense Type"
            >
              <option value="">Select Offense Type...</option>
              {OFFENSE_TYPES.map(ot => (
                <option key={ot.value} value={ot.value}>
                  {ot.label}
                </option>
              ))}
            </select>
            <label htmlFor="severity" className="sr-only">Severity</label>
            <select id="severity" value={severity} onChange={e => setSeverity(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required aria-label="Severity">
              <option value="">Select Severity...</option>
              {SEVERITY_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
            <label htmlFor="description" className="sr-only">Description</label>
            <textarea 
              id="description" 
              placeholder={offenseTypeDescription || "Description"} 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" 
              required 
              aria-label="Description" 
            />
            <label htmlFor="sanctions" className="sr-only">Sanctions</label>
            <input id="sanctions" type="text" placeholder="Any sanctions or disciplinary measures applied (optional)" value={sanctions} onChange={e => setSanctions(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" aria-label="Sanctions" />
            <button type="submit" className="bg-kmuGreen text-white px-4 py-1 rounded hover:bg-kmuOrange transition" disabled={loading} aria-label="Submit case">
              {loading ? 'Submitting...' : 'Submit Case'}
            </button>
          </form>
          {error && <div className="text-red-600 text-sm mb-2" aria-live="polite">{error}</div>}
          {success && <div className="text-kmuGreen text-sm mb-2" aria-live="polite">{success}</div>}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-kmuOrange">Recent Cases</h2>
              <Link 
                href="/cases" 
                className="text-sm text-kmuGreen hover:text-kmuOrange transition underline"
              >
                View All Cases →
              </Link>
            </div>
            <input
              type="text"
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Search cases..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-2 px-2">Student</th>
                  <th className="text-left py-2 px-2">Offense</th>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Severity</th>
                  <th className="text-left py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases
                  .sort((a: any, b: any) => new Date(b.createdAt || b.incidentDate || 0).getTime() - new Date(a.createdAt || a.incidentDate || 0).getTime())
                  .slice(0, 10)
                  .map((c: any, i: number) => (
                  <tr 
                    key={i} 
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => router.push(`/cases/${c._id || c.id}`)}
                  >
                    <td className="py-2 px-2">
                      <div className="font-medium text-kmuGreen hover:text-kmuOrange transition">{c.student?.fullName || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{c.student?.studentId || ''}</div>
                    </td>
                    <td className="py-2 px-2">{c.offenseType || 'N/A'}</td>
                    <td className="py-2 px-2">{c.incidentDate || 'N/A'}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        c.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                        c.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                        c.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {c.severity || 'N/A'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        c.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                        c.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {c.status || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCases.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No cases found.
              </div>
            )}
          </div>
        </div>
      </section>
  );
} 