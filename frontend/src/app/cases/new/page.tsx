"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../(protected)/ProtectedRoute";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from '../../../config/constants';
import { OFFENSE_TYPES, SEVERITY_LEVELS } from '../../../config/constants';
import { authHeaders } from '../../../utils/api';
import SmartStudentSearch from '../../../components/SmartStudentSearch';
import SmartStaffSearch from '../../../components/SmartStaffSearch';
import QuickCaseTemplates from '../../../components/QuickCaseTemplates';
import RecentStudents from '../../../components/RecentStudents';
import RecentStaff from '../../../components/RecentStaff';

interface Student {
  _id: string;
  studentId: string;
  fullName: string;
  department?: string;
  year?: string;
  gender?: string;
}

interface Staff {
  _id: string;
  staffId: string;
  fullName: string;
  department?: string;
  position?: string;
}

export default function NewCasePage() {
  const { token } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [caseType, setCaseType] = useState<'single_student' | 'multiple_student' | 'single_staff' | 'multiple_staff'>('single_student');
  
  // Student fields
  const [studentId, setStudentId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  
  // Staff fields
  const [staffId, setStaffId] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedStaffMembers, setSelectedStaffMembers] = useState<Staff[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  
  // Common fields
  const [incidentDate, setIncidentDate] = useState("");
  const [offenseType, setOffenseType] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [sanctions, setSanctions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [offenseTypeDescription, setOffenseTypeDescription] = useState("");
  const [isStudentInputFocused, setIsStudentInputFocused] = useState(false);
  const [isStaffInputFocused, setIsStaffInputFocused] = useState(false);

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

  // Template selection handler
  const handleTemplateSelect = (template: any) => {
    setOffenseType(template.offenseType);
    setSeverity(template.severity);
    setDescription(template.description);
    setSanctions(template.sanctions);
  };

  // Smart student select for single
  const handleSmartStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setStudentId(student.studentId);
    setStudentSearch(student.fullName);
  };

  // Smart student select for multiple
  const handleSmartStudentSelectMultiple = (student: Student) => {
    if (!selectedStudents.some(s => s.studentId === student.studentId)) {
      setSelectedStudents(prev => [...prev, student]);
      // setSelectedStudentIds(prev => [...prev, student.studentId]);
    }
  };

  // Remove selected student (multiple)
  const removeSelectedStudentSmart = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.studentId !== studentId));
    // setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
  };

  // Smart staff select for single
  const handleSmartStaffSelect = (staff: Staff) => {
    setSelectedStaff(staff);
    setStaffId(staff.staffId);
    setStaffSearch(staff.fullName);
  };

  // Smart staff select for multiple
  const handleSmartStaffSelectMultiple = (staff: Staff) => {
    if (!selectedStaffMembers.some(s => s.staffId === staff.staffId)) {
      setSelectedStaffMembers(prev => [...prev, staff]);
    }
  };

  // Remove selected staff (multiple)
  const removeSelectedStaffSmart = (staffId: string) => {
    setSelectedStaffMembers(prev => prev.filter(s => s.staffId !== staffId));
  };

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch(`${API_BASE_URL}/students`, {
          headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        // Support both array and { students, total } response
        const studentsArray = Array.isArray(data) ? data : (Array.isArray(data.students) ? data.students : []);
        setStudents(studentsArray);
        // Pre-select student if studentId is in query
        const preselectId = searchParams?.get('studentId');
        if (preselectId) {
          setStudentId(preselectId);
          setCaseType('single_student');
        }
      } catch (err: any) {
        setError(err?.message || 'Network error, please try again');
      }
    }
    
    async function fetchStaff() {
      try {
        const res = await fetch(`${API_BASE_URL}/staff`, {
          headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        // Support both array and { staff, total } response
        const staffArray = Array.isArray(data) ? data : (Array.isArray(data.staff) ? data.staff : []);
        setStaff(staffArray);
        // Pre-select staff if staffId is in query
        const preselectId = searchParams?.get('staffId');
        if (preselectId) {
          setStaffId(preselectId);
          setCaseType('single_staff');
        }
      } catch (err: any) {
        setError(err?.message || 'Network error, please try again');
      }
    }
    
    fetchStudents();
    fetchStaff();
  }, [token, searchParams]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Prepare request body based on case type
      const requestBody: any = {
        incident_date: incidentDate,
        offense_type: offenseType,
        severity,
        description,
        sanctions,
      };

      if (caseType === 'single_student') {
        if (!studentId) {
          throw new Error('Please select a student');
        }
        requestBody.student_id = studentId;
      } else if (caseType === 'multiple_student') {
        if (selectedStudents.length === 0) {
          throw new Error('Please select at least one student');
        }
        requestBody.student_ids = selectedStudents.map(s => s.studentId);
      } else if (caseType === 'single_staff') {
        if (!staffId) {
          throw new Error('Please select a staff member');
        }
        requestBody.staff_id = staffId;
      } else if (caseType === 'multiple_staff') {
        if (selectedStaffMembers.length === 0) {
          throw new Error('Please select at least one staff member');
        }
        requestBody.staff_ids = selectedStaffMembers.map(s => s.staffId);
      }

      const res = await fetch(`${API_BASE_URL}/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(requestBody),
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      let successMessage = "";
      if (caseType === 'single_student') {
        successMessage = "Case created successfully for student!";
      } else if (caseType === 'multiple_student') {
        successMessage = `Case created successfully for ${selectedStudents.length} student(s)!`;
      } else if (caseType === 'single_staff') {
        successMessage = "Case created successfully for staff member!";
      } else if (caseType === 'multiple_staff') {
        successMessage = `Case created successfully for ${selectedStaffMembers.length} staff member(s)!`;
      }
      
      setSuccess(successMessage);
      
      // Reset form
      setStudentId("");
      setStaffId("");
      setSelectedStudent(null);
      setSelectedStudents([]);
      setSelectedStaff(null);
      setSelectedStaffMembers([]);
      setStudentSearch("");
      setStaffSearch("");
      setIncidentDate("");
      setOffenseType("");
      setSeverity("");
      setDescription("");
      setSanctions("");
      setCaseType('single_student');
    } catch (err: any) {
      setError(err?.message || 'Network error, please try again');
    } finally {
      setLoading(false);
    }
  }

  // Filter students for search
  const filteredStudents = students.filter(s => 
    s.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Filter staff for search
  const filteredStaff = staff.filter(s => 
    s.fullName?.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.staffId?.toLowerCase().includes(staffSearch.toLowerCase())
  );

  // Get selected students/staff for display
  const selectedStudentsForDisplay = caseType === 'single_student' ? (selectedStudent ? [selectedStudent] : []) : selectedStudents;
  const selectedStaffForDisplay = caseType === 'single_staff' ? (selectedStaff ? [selectedStaff] : []) : selectedStaffMembers;

  return (
    <ProtectedRoute>
      <section className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-kmuGreen">Create New Case</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar: Templates and Recent Students/Staff */}
          <div className="space-y-6 md:col-span-1">
            <QuickCaseTemplates onTemplateSelect={handleTemplateSelect} className="w-full" />
            {caseType === 'single_student' || caseType === 'multiple_student' ? (
              <RecentStudents onStudentSelect={caseType === 'single_student' ? handleSmartStudentSelect : handleSmartStudentSelectMultiple} maxItems={5} className="w-full" />
            ) : (
              <RecentStaff onStaffSelect={caseType === 'single_staff' ? handleSmartStaffSelect : handleSmartStaffSelectMultiple} maxItems={5} className="w-full" />
            )}
          </div>
          {/* Main Form */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {/* Case Type Toggle */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3 text-kmuOrange">Case Type</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Student Cases</label>
                    <div className="flex gap-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="caseType"
                          value="single_student"
                          checked={caseType === 'single_student'}
                          onChange={(e) => {
                            setCaseType('single_student');
                            setSelectedStudents([]);
                            setSelectedStaff(null);
                            setSelectedStaffMembers([]);
                          }}
                          className="mr-2"
                        />
                        Single Student
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="caseType"
                          value="multiple_student"
                          checked={caseType === 'multiple_student'}
                          onChange={(e) => {
                            setCaseType('multiple_student');
                            setSelectedStudent(null);
                            setStudentId('');
                            setStudentSearch('');
                            setSelectedStaff(null);
                            setSelectedStaffMembers([]);
                          }}
                          className="mr-2"
                        />
                        Multiple Students
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Staff Cases</label>
                    <div className="flex gap-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="caseType"
                          value="single_staff"
                          checked={caseType === 'single_staff'}
                          onChange={(e) => {
                            setCaseType('single_staff');
                            setSelectedStudent(null);
                            setSelectedStudents([]);
                            setSelectedStaffMembers([]);
                          }}
                          className="mr-2"
                        />
                        Single Staff
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="caseType"
                          value="multiple_staff"
                          checked={caseType === 'multiple_staff'}
                          onChange={(e) => {
                            setCaseType('multiple_staff');
                            setSelectedStudent(null);
                            setSelectedStudents([]);
                            setSelectedStaff(null);
                            setStaffId('');
                            setStaffSearch('');
                          }}
                          className="mr-2"
                        />
                        Multiple Staff
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Student/Staff Selection */}
                <div>
                  <h3 className="text-md font-medium mb-2 text-kmuGreen">
                    {caseType.includes('student') ? 'Select Student(s)' : 'Select Staff Member(s)'}
                  </h3>
                  {caseType === 'single_student' ? (
                    <div>
                      <SmartStudentSearch
                        onStudentSelect={handleSmartStudentSelect}
                        placeholder="Search by name or student ID..."
                        className="w-full"
                      />
                      {selectedStudent && (
                        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-green-800 dark:text-green-200">
                                {selectedStudent.fullName}
                              </div>
                              <div className="text-sm text-green-600 dark:text-green-300">
                                ID: {selectedStudent.studentId} • {selectedStudent.department} • Year {selectedStudent.year}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setSelectedStudent(null); setStudentId(''); setStudentSearch(''); }}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : caseType === 'multiple_student' ? (
                    <div>
                      <SmartStudentSearch
                        onStudentSelect={handleSmartStudentSelectMultiple}
                        placeholder="Search and add students..."
                        className="w-full"
                      />
                      {selectedStudents.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 mt-2">
                          <h4 className="text-sm font-medium mb-2">Selected Students ({selectedStudents.length}):</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedStudents.map((s) => (
                              <span
                                key={s.studentId}
                                className="inline-flex items-center gap-1 bg-kmuGreen text-white px-2 py-1 rounded text-sm"
                              >
                                {s.fullName}
                                <button
                                  type="button"
                                  onClick={() => removeSelectedStudentSmart(s.studentId)}
                                  className="ml-1 hover:bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : caseType === 'single_staff' ? (
                    <div>
                      <SmartStaffSearch
                        onStaffSelect={handleSmartStaffSelect}
                        placeholder="Search by name or staff ID..."
                        className="w-full"
                      />
                      {selectedStaff && (
                        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-green-800 dark:text-green-200">
                                {selectedStaff.fullName}
                              </div>
                              <div className="text-sm text-green-600 dark:text-green-300">
                                ID: {selectedStaff.staffId} • {selectedStaff.department} • {selectedStaff.position}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setSelectedStaff(null); setStaffId(''); setStaffSearch(''); }}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : caseType === 'multiple_staff' ? (
                    <div>
                      <SmartStaffSearch
                        onStaffSelect={handleSmartStaffSelectMultiple}
                        placeholder="Search and add staff members..."
                        className="w-full"
                      />
                      {selectedStaffMembers.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 mt-2">
                          <h4 className="text-sm font-medium mb-2">Selected Staff Members ({selectedStaffMembers.length}):</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedStaffMembers.map((s) => (
                              <span
                                key={s.staffId}
                                className="inline-flex items-center gap-1 bg-kmuGreen text-white px-2 py-1 rounded text-sm"
                              >
                                {s.fullName}
                                <button
                                  type="button"
                                  onClick={() => removeSelectedStaffSmart(s.staffId)}
                                  className="ml-1 hover:bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Common Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="incidentDate" className="block text-sm font-medium mb-1">Incident Date</label>
                    <input
                      id="incidentDate"
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="offenseType" className="block text-sm font-medium mb-1">Offense Type</label>
                    <select
                      id="offenseType"
                      value={offenseType}
                      onChange={(e) => handleOffenseTypeChange(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select Offense Type...</option>
                      {OFFENSE_TYPES.map((ot) => (
                        <option key={ot.value} value={ot.value}>
                          {ot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="severity" className="block text-sm font-medium mb-1">Severity</label>
                    <select
                      id="severity"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select Severity...</option>
                      {SEVERITY_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={offenseTypeDescription || "Provide a detailed description of the incident..."}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="sanctions" className="block text-sm font-medium mb-1">Sanctions (Optional)</label>
                  <input
                    id="sanctions"
                    type="text"
                    value={sanctions}
                    onChange={(e) => setSanctions(e.target.value)}
                    placeholder="Any sanctions or disciplinary measures applied (optional)"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                {error && <div className="text-red-600 text-sm">{error}</div>}
                {success && <div className="text-kmuGreen text-sm">{success}</div>}

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-kmuGreen text-white px-6 py-2 rounded hover:bg-kmuOrange transition disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Case'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </ProtectedRoute>
  );
}