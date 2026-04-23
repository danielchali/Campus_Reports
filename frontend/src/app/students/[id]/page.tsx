"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../(protected)/ProtectedRoute";
import Link from "next/link";
import { API_BASE_URL } from '../../../config/constants';
import { OFFENSE_TYPES, SEVERITY_LEVELS } from '../../../config/constants';
import { authHeaders } from '../../../utils/api';
import { saveAs } from 'file-saver';





interface Case {
    _id: string;
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

interface Student {
    _id: string;
    studentId: string;
    fullName: string;
    program?: string;
    year?: string;
    gender?: string;
    disciplinaryHistory?: Case[];
}

interface StatementRequest {
    _id: string;
    title: string;
    prompt: string;
    status: 'pending' | 'submitted' | 'expired' | 'cancelled';
    dueAt?: string;
    createdAt: string;
    submittedAt?: string;
}

export default function StudentDetailsPage({ params }: { params: { id: string } }) {
    const { token, user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialActiveTab = searchParams.get('tab') || 'overview';
    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'cases' | 'add-case'>(
        (initialActiveTab as 'overview' | 'cases' | 'add-case') || 'overview'
    );
    
    // New case form state
    const [newCase, setNewCase] = useState({
        incidentDate: '',
        description: '',
        offenseType: '',
        severity: 'medium',
        sanctions: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
    const [offenseTypeDescription, setOffenseTypeDescription] = useState('');
    const [statementTitle, setStatementTitle] = useState('');
    const [statementPrompt, setStatementPrompt] = useState('');
    const [statementDueAt, setStatementDueAt] = useState('');
    const [statementRequests, setStatementRequests] = useState<StatementRequest[]>([]);
    const [statementSubmitting, setStatementSubmitting] = useState(false);
    const [statementMessage, setStatementMessage] = useState<string | null>(null);

    // Function to get description for selected offense type
    const getOffenseTypeDescription = (offenseType: string) => {
        const offense = OFFENSE_TYPES.find(ot => ot.value === offenseType);
        return offense ? offense.description : '';
    };

    // Function to handle offense type change
    const handleOffenseTypeChange = (offenseType: string) => {
        setNewCase({ ...newCase, offenseType });
        setOffenseTypeDescription(getOffenseTypeDescription(offenseType));
    };

    useEffect(() => {
        async function fetchStudent() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE_URL}/students/${params.id}`, {
                    headers: { ...authHeaders() },
                });
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                setStudent(data);
                if (data?.studentId) {
                    fetchStatementRequests(data.studentId);
                }
            } catch (err: any) {
                setError(err.message || "Failed to load student");
                setStudent(null);
            } finally {
                setLoading(false);
            }
        }
        fetchStudent();
    }, [params.id, token]);

    const fetchStatementRequests = async (studentId: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/statement-requests/staff?studentId=${encodeURIComponent(studentId)}`, {
                headers: { ...authHeaders() },
            });
            if (!res.ok) {
                return;
            }
            const data = await res.json();
            setStatementRequests(Array.isArray(data) ? data : []);
        } catch {
            // Keep the rest of the page functional even if this endpoint fails.
        }
    };

    const handleNewCaseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(null);

        try {
            const res = await fetch(`${API_BASE_URL}/cases`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders(),
                },
                body: JSON.stringify({
                    student_id: student?.studentId,
                    incident_date: newCase.incidentDate,
                    offense_type: newCase.offenseType,
                    severity: newCase.severity,
                    description: newCase.description,
                    sanctions: newCase.sanctions,
                }),
            });

            if (!res.ok) throw new Error(await res.text());
            
            setSubmitSuccess('Case created successfully!');
            setNewCase({
                incidentDate: '',
                description: '',
                offenseType: '',
                severity: 'medium',
                sanctions: ''
            });
            
            // Refresh student data to show new case
            const studentRes = await fetch(`${API_BASE_URL}/students/${params.id}`, {
                headers: { ...authHeaders() },
            });
            if (studentRes.ok) {
                const updatedStudent = await studentRes.json();
                setStudent(updatedStudent);
                if (updatedStudent?.studentId) {
                    fetchStatementRequests(updatedStudent.studentId);
                }
            }
        } catch (err: any) {
            setSubmitError(err.message || 'Failed to create case');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateStatementRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student?.studentId) return;

        setStatementSubmitting(true);
        setStatementMessage(null);
        try {
            const res = await fetch(`${API_BASE_URL}/statement-requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders(),
                },
                body: JSON.stringify({
                    studentId: student.studentId,
                    title: statementTitle,
                    prompt: statementPrompt,
                    dueAt: statementDueAt || undefined
                }),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || 'Failed to send statement request');
            }

            setStatementTitle('');
            setStatementPrompt('');
            setStatementDueAt('');
            setStatementMessage('Statement request sent to student dashboard.');
            fetchStatementRequests(student.studentId);
        } catch (err: any) {
            setStatementMessage(err.message || 'Failed to send statement request');
        } finally {
            setStatementSubmitting(false);
        }
    };

    // Add export handlers
    const handleExportRecords = async () => {
        if (!student) return;
        try {
            const res = await fetch(`${API_BASE_URL}/reports/docx`, {
                method: 'POST',
                headers: { ...authHeaders() },
                body: JSON.stringify({ studentId: student.studentId }),
            });
            if (!res.ok) throw new Error(await res.text());
            const blob = await res.blob();
            saveAs(blob, `student_${student.studentId}_cases.docx`);
        } catch (err) {
            alert('Failed to export records.');
        }
    };

    const handleExportStudentList = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/reports/students-docx`, {
                method: 'POST',
                headers: { ...authHeaders() },
                body: JSON.stringify({}),
            });
            if (!res.ok) throw new Error(await res.text());
            const blob = await res.blob();
            saveAs(blob, `students_list.docx`);
        } catch (err) {
            alert('Failed to export students list.');
        }
    };


    // Add view all cases handler
    const handleViewAllCases = () => {
        if (!student) return;
        router.push(`/cases?studentId=${student.studentId}`);
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <div className="max-w-4xl mx-auto p-6 space-y-4 animate-pulse">
                    <div className="h-8 w-56 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-44 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </ProtectedRoute>
        );
    }

    if (error) {
        return (
            <ProtectedRoute>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-red-600 text-lg">{error}</div>
                </div>
            </ProtectedRoute>
        );
    }

    if (!student) {
        return (
            <ProtectedRoute>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-gray-600 dark:text-gray-400 text-lg">Student not found</div>
                </div>
            </ProtectedRoute>
        );
    }

    const cases = student.disciplinaryHistory || [];
    const totalCases = cases.length;
    const openCases = cases.filter(c => c.status?.toLowerCase() === 'open').length;
    const closedCases = cases.filter(c => c.status?.toLowerCase() === 'closed').length;
    const highSeverityCases = cases.filter(c => c.severity?.toLowerCase() === 'high').length;
    const canRequestStatement = user?.role === 'admin' || user?.role === 'security_officer' || user?.role === 'chief_security_officer' || user?.role === 'dean_of_students' || user?.role === 'assistant_dean' || user?.role === 'academic_office' || user?.role === 'secretary';

    const getStatusColor = (status: string) => {
        if (!status) return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
        switch (status.toLowerCase()) {
            case 'open': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
            case 'closed': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
            case 'pending': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
            default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
        }
    };

    const getSeverityColor = (severity: string) => {
        if (!severity) return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
        switch (severity.toLowerCase()) {
            case 'high': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
            case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
            case 'low': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
            default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
        }
    };

    return (
        <ProtectedRoute>
            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-kmuGreen">Student Details</h1>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-kmuGreen">{totalCases}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">Total Cases</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-red-600">{openCases}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">Open Cases</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-green-600">{closedCases}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">Closed Cases</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-orange-600">{highSeverityCases}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm">High Severity</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
                    <div className="border-b border-gray-200 dark:border-gray-600">
                        <nav className="flex space-x-8 px-6">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'overview'
                                        ? 'border-kmuGreen text-kmuGreen'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('cases')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'cases'
                                        ? 'border-kmuGreen text-kmuGreen'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                Case History ({totalCases})
                            </button>
                            {(user?.role === 'admin' || user?.role === 'security_officer' || user?.role === 'chief_security_officer' || user?.role === 'dean_of_students' || user?.role === 'assistant_dean') && (
                                <button
                                    onClick={() => setActiveTab('add-case')}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                        activeTab === 'add-case'
                                            ? 'border-kmuGreen text-kmuGreen'
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                >
                                    Add New Case
                                </button>
                            )}
                        </nav>
                    </div>

                    <div className="p-6">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-kmuOrange mb-4">Student Information</h3>
                                        <div className="space-y-3">
                                <div>
                                                <span className="text-gray-600 dark:text-gray-400 text-sm">Full Name</span>
                                                <p className="font-medium text-gray-900 dark:text-white">{student.fullName}</p>
                                </div>
                                <div>
                                                <span className="text-gray-600 dark:text-gray-400 text-sm">Student ID</span>
                                                <p className="font-medium text-gray-900 dark:text-white">{student.studentId}</p>
                                            </div>
                                            {student.program && (
                                                <div>
                                                    <span className="text-gray-600 dark:text-gray-400 text-sm">Program</span>
                                                    <p className="font-medium text-gray-900 dark:text-white">{student.program}</p>
                                </div>
                                            )}
                                            {student.year && (
                                <div>
                                                    <span className="text-gray-600 dark:text-gray-400 text-sm">Year</span>
                                                    <p className="font-medium text-gray-900 dark:text-white">{student.year}</p>
                                </div>
                                            )}
                                            {student.gender && (
                                <div>
                                                    <span className="text-gray-600 dark:text-gray-400 text-sm">Gender</span>
                                                    <p className="font-medium text-gray-900 dark:text-white">{student.gender}</p>
                                </div>
                                            )}
                            </div>
                        </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-kmuOrange mb-4">Quick Actions</h3>
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => setActiveTab('add-case')}
                                                className="block w-full bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition text-center"
                                            >
                                                Add New Case
                                            </button>
                                            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition" onClick={handleViewAllCases}>
                                                View All Cases
                                            </button>
                                            <button className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition" onClick={handleExportRecords}>
                                                Export Student Cases
                                            </button>
                                        </div>
                                        
                                        <h4 className="text-md font-semibold text-kmuOrange mb-3 mt-6">Export Lists</h4>
                                        <div className="space-y-2">
                                            <button className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition text-sm" onClick={handleExportStudentList}>
                                                Export Students List (DOCX)
                                            </button>
                                        </div>

                                        {canRequestStatement && (
                                            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                                                <h4 className="text-md font-semibold text-kmuOrange mb-3">Request Signed Statement</h4>
                                                <form onSubmit={handleCreateStatementRequest} className="space-y-3">
                                                    <input
                                                        type="text"
                                                        value={statementTitle}
                                                        onChange={(e) => setStatementTitle(e.target.value)}
                                                        placeholder="Title (e.g. Incident Clarification)"
                                                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                        required
                                                    />
                                                    <textarea
                                                        value={statementPrompt}
                                                        onChange={(e) => setStatementPrompt(e.target.value)}
                                                        placeholder="Instructions for the student statement..."
                                                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                        rows={4}
                                                        required
                                                    />
                                                    <input
                                                        type="date"
                                                        value={statementDueAt}
                                                        onChange={(e) => setStatementDueAt(e.target.value)}
                                                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={statementSubmitting}
                                                        className="w-full bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition disabled:opacity-60 text-sm"
                                                    >
                                                        {statementSubmitting ? 'Sending...' : 'Send Statement Request'}
                                                    </button>
                                                </form>
                                                {statementMessage && (
                                                    <p className={`mt-2 text-xs ${statementMessage.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
                                                        {statementMessage}
                                                    </p>
                                                )}
                                                {statementRequests.length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                        {statementRequests.slice(0, 4).map((request) => (
                                                            <div key={request._id} className="rounded border border-gray-200 dark:border-gray-700 px-2 py-2">
                                                                <p className="text-xs font-semibold text-gray-900 dark:text-white">{request.title}</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {request.status} • {new Date(request.createdAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Cases Tab */}
                        {activeTab === 'cases' && (
                                <div>
                                <h3 className="text-lg font-semibold text-kmuOrange mb-4">Disciplinary Case History</h3>
                                {cases.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500 dark:text-gray-400">No disciplinary cases found for this student.</div>
                                </div>
                                ) : (
                                    <>
                                    <div className="space-y-4 md:hidden">
                                        {cases.map((caseItem) => (
                                            <div key={caseItem._id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
                                                <div className="font-mono text-xs text-gray-500 dark:text-gray-400">{caseItem._id}</div>
                                                <div className="text-gray-900 dark:text-white">{caseItem.description || '-'}</div>
                                                <div className="flex gap-2 flex-wrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(caseItem.severity)}`}>
                                                        {caseItem.severity}
                                                    </span>
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(caseItem.status)}`}>
                                                        {caseItem.status}
                                                    </span>
                                                </div>
                                                {caseItem.sanctions && (
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                                        Sanctions: {caseItem.sanctions}
                                                    </div>
                                                )}
                                                <Link
                                                    href={`/cases/${caseItem._id}`}
                                                    className="text-kmuGreen hover:text-kmuOrange transition text-sm font-medium"
                                                >
                                                    View Details
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="hidden md:block overflow-x-auto -mx-3 md:mx-0">
                                        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow text-sm md:text-base">
                                            <thead className="bg-kmuGreen text-white">
                                                <tr>
                                                    <th className="py-2 px-2 md:px-4 text-left">Case ID</th>
                                                    <th className="py-2 px-2 md:px-4 text-left">Description</th>
                                                    <th className="py-2 px-2 md:px-4 text-left">Severity</th>
                                                    <th className="py-2 px-2 md:px-4 text-left">Status</th>
                                                    <th className="py-2 px-2 md:px-4 text-left hidden md:table-cell">Sanctions</th>
                                                    <th className="py-2 px-2 md:px-4 text-left">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cases.map((caseItem) => (
                                                    <tr key={caseItem._id} className="border-b border-gray-200 dark:border-gray-600">
                                                        <td className="py-2 px-2 md:px-4 text-gray-900 dark:text-white text-sm">
                                                            <div className="font-mono text-xs">{caseItem._id}</div>
                                                        </td>
                                                        <td className="py-2 px-2 md:px-4 text-gray-900 dark:text-white">
                                                            <div className="max-w-xs truncate" title={caseItem.description}>
                                                                {caseItem.description || '-'}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">
                                                                {caseItem.sanctions && (
                                                                    <div className="mt-1">
                                                                        Sanctions: {caseItem.sanctions}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-2 px-2 md:px-4">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(caseItem.severity)}`}>
                                                                {caseItem.severity}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-2 md:px-4">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(caseItem.status)}`}>
                                                                {caseItem.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-2 md:px-4 text-gray-900 dark:text-white max-w-xs truncate hidden md:table-cell" title={caseItem.sanctions}>
                                                            {caseItem.sanctions || '-'}
                                                        </td>
                                                        <td className="py-2 px-2 md:px-4">
                                                            <Link
                                                                href={`/cases/${caseItem._id}`}
                                                                className="text-kmuGreen hover:text-kmuOrange transition text-sm"
                                                            >
                                                                View →
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Add Case Tab */}
                        {activeTab === 'add-case' && (
                            <div>
                                <h3 className="text-lg font-semibold text-kmuOrange mb-4">Add New Disciplinary Case</h3>
                                <form onSubmit={handleNewCaseSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">
                                                Incident Date
                                            </label>
                                            <input
                                                type="date"
                                                value={newCase.incidentDate}
                                                onChange={(e) => setNewCase({ ...newCase, incidentDate: e.target.value })}
                                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">
                                                Offense Type
                                            </label>
                                            <select
                                                value={newCase.offenseType}
                                                onChange={e => handleOffenseTypeChange(e.target.value)}
                                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                required
                                            >
                                                <option value="">Select an offense type</option>
                                                {OFFENSE_TYPES.map(offense => (
                                                    <option key={offense.value} value={offense.value}>
                                                        {offense.label}
                                                    </option>
                                                ))}
                                            </select>
                                            {offenseTypeDescription && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {offenseTypeDescription}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                <div>
                                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">
                                            Severity
                                        </label>
                                        <select
                                            value={newCase.severity}
                                            onChange={(e) => setNewCase({ ...newCase, severity: e.target.value })}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            required
                                        >
                                            {SEVERITY_LEVELS.map(severity => (
                                                <option key={severity.value} value={severity.value.toLowerCase()}>
                                                    {severity.label}
                                                </option>
                                            ))}
                                        </select>
                                </div>
                                <div>
                                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">
                                            Description
                                        </label>
                                        <textarea
                                            value={newCase.description}
                                            onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            rows={4}
                                            placeholder={offenseTypeDescription || "Provide a detailed description of the incident..."}
                                            required
                                        />
                                </div>
                                    <div>
                                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">
                                            Sanctions (Optional)
                                        </label>
                                        <textarea
                                            value={newCase.sanctions}
                                            onChange={(e) => setNewCase({ ...newCase, sanctions: e.target.value })}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            rows={3}
                                            placeholder="Any sanctions or disciplinary measures applied..."
                                        />
                                    </div>
                                    {submitError && (
                                        <div className="text-red-600 text-sm">{submitError}</div>
                                    )}
                                    {submitSuccess && (
                                        <div className="text-green-600 text-sm">{submitSuccess}</div>
                                    )}
                                    <div className="flex gap-3">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="bg-kmuGreen text-white px-6 py-2 rounded hover:bg-kmuOrange transition disabled:opacity-50"
                                        >
                                            {submitting ? 'Creating...' : 'Create Case'}
                                    </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('overview')}
                                            className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-6 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                        >
                                            Cancel
                                    </button>
                                </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
