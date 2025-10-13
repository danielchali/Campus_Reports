"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL, OFFENSE_TYPES, SEVERITY_LEVELS } from '../../config/constants';
import { authHeaders } from '../../utils/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SmartStudentSearch from '../../components/SmartStudentSearch';
import SmartStaffSearch from '../../components/SmartStaffSearch';

interface Student {
  studentId: string;
  fullName: string;
  department: string;
  year?: string;
  gender?: string;
}

interface Staff {
  staffId: string;
  fullName: string;
  department: string;
  position?: string;
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
  const [staff, setStaff] = useState<Staff[]>([]);
  const [caseType, setCaseType] = useState<'student' | 'staff'>('student');
  const [studentId, setStudentId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
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
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
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
    
    async function fetchStaff() {
      try {
        const res = await fetch(`${API_BASE_URL}/staff`, { headers: { ...authHeaders() } });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setStaff(Array.isArray(data) ? data : (data.staff || data || []));
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
    fetchStaff();
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
    const safeStaff = Array.isArray(staff) ? staff : [];
    const safeCases = Array.isArray(cases) ? cases : [];
    setFilteredCases(
      search ? safeCases.filter((c: any) =>
        (c.student?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        c.student?.studentId?.toLowerCase().includes(search.toLowerCase()) ||
        c.staff?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        c.staff?.staffId?.toLowerCase().includes(search.toLowerCase()) ||
        c.offenseType?.toLowerCase().includes(search.toLowerCase()) ||
        c.status?.toLowerCase().includes(search.toLowerCase()))
      ) : safeCases
    );
    setFilteredStudents(
      search ? safeStudents.filter((s: any) =>
        s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(search.toLowerCase())
      ) : safeStudents
    );
    setFilteredStaff(
      search ? safeStaff.filter((s: any) =>
        s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        s.staffId?.toLowerCase().includes(search.toLowerCase())
      ) : safeStaff
    );
  }, [search, cases, students, staff]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      const requestBody: any = { 
        incident_date: incidentDate, 
        offense_type: offenseType, 
        severity, 
        description, 
        sanctions 
      };
      
      if (caseType === 'student') {
        requestBody.student_id = studentId;
      } else {
        requestBody.staff_id = staffId;
      }
      
      const res = await fetch(`${API_BASE_URL}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess('Case submitted successfully!');
      setStudentId(''); 
      setStaffId('');
      setIncidentDate(''); 
      setOffenseType(''); 
      setSeverity(''); 
      setDescription(''); 
      setSanctions('');
      setSelectedStudent(null);
      setSelectedStaff(null);
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
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Case Type</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="caseType"
                  value="student"
                  checked={caseType === 'student'}
                  onChange={() => {
                    setCaseType('student');
                    setStaffId('');
                    setSelectedStaff(null);
                  }}
                  className="mr-2"
                />
                Student Case
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="caseType"
                  value="staff"
                  checked={caseType === 'staff'}
                  onChange={() => {
                    setCaseType('staff');
                    setStudentId('');
                    setSelectedStudent(null);
                  }}
                  className="mr-2"
                />
                Staff Case
              </label>
            </div>
          </div>
          <form className="mb-6 flex gap-2 flex-wrap" onSubmit={handleSubmit} aria-label="Add case form">
            <label htmlFor="personId" className="sr-only">{caseType === 'student' ? 'Student' : 'Staff'}</label>
            <div className="space-y-2 w-full">
              {caseType === 'student' ? (
                <SmartStudentSearch
                  onStudentSelect={(student) => {
                    setSelectedStudent(student);
                    setStudentId(student.studentId);
                  }}
                  placeholder="Search for student by name or ID..."
                  className="w-full"
                />
              ) : (
                <SmartStaffSearch
                  onStaffSelect={(staff) => {
                    setSelectedStaff(staff);
                    setStaffId(staff.staffId);
                  }}
                  placeholder="Search for staff by name or ID..."
                  className="w-full"
                />
              )}
              {selectedStudent && (
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  Selected: <strong>{selectedStudent.fullName}</strong> ({selectedStudent.studentId}) - {selectedStudent.department}, Year {selectedStudent.year}
                </div>
              )}
              {selectedStaff && (
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  Selected: <strong>{selectedStaff.fullName}</strong> ({selectedStaff.staffId}) - {selectedStaff.department}, {selectedStaff.position}
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
            <input id="description" type="text" placeholder={offenseTypeDescription || "Description"} value={description} onChange={e => setDescription(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex-1 min-w-[200px]" required aria-label="Description" />
            <label htmlFor="sanctions" className="sr-only">Sanctions</label>
            <input id="sanctions" type="text" placeholder="Sanctions (optional)" value={sanctions} onChange={e => setSanctions(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex-1 min-w-[200px]" aria-label="Sanctions" />
            <button type="submit" disabled={loading} className="bg-kmuGreen text-white px-4 py-1 rounded hover:bg-kmuOrange transition disabled:opacity-50" aria-label="Submit case">
              {loading ? 'Submitting...' : 'Submit Case'}
            </button>
          </form>
          {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
          {success && <div className="text-kmuGreen text-sm mb-4">{success}</div>}
        </div>

        {/* Cases List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-kmuOrange">Recent Cases</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search cases..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <Link href="/cases" className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition">
                View All
              </Link>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Person</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Department</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Offense</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Severity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCases.slice(0, 10).map((c: any) => (
                  <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => router.push(`/cases/${c._id}`)}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-kmuGreen">
                        {c.student ? c.student.fullName : c.staff ? c.staff.fullName : 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.student ? `Student: ${c.student.studentId}` : c.staff ? `Staff: ${c.staff.staffId}` : 'No ID'}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      {c.student?.department || c.staff?.department || 'N/A'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      {c.offenseType || 'N/A'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      {c.incidentDate ? new Date(c.incidentDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        c.severity === 'High' ? 'bg-red-100 text-red-800' :
                        c.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        c.severity === 'Low' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {c.severity || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        c.status === 'Open' ? 'bg-red-100 text-red-800' :
                        c.status === 'Closed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {c.status || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredCases.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                      No cases found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    </section>
  );
}