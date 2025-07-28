"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";

import Link from "next/link";
import { API_BASE_URL } from '../../../config/constants';





interface Case {
    _id: string;
    student?: {
        _id: string;
        studentId: string;
        fullName: string;
        department?: string;
    };
    students?: {
        _id: string;
        studentId: string;
        fullName: string;
        department?: string;
    }[];
    student_ids?: string[];
    case_type?: 'single' | 'group';
    incidentDate: string;
    description: string;
    offenseType: string;
    severity: string;
    status: string;
    sanctions?: string;
    attachments?: string[];
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

export default function CaseDetailsPage({ params }: { params: { id: string } }) {
    if (params.id === "new") {
        return null;
    }
    
    const { token, user } = useAuth();
    const router = useRouter();
    
    // Handle authentication like profile page
    if (!token) {
        router.replace('/login');
        return <div className="text-center text-kmuGreen">Redirecting to login...</div>;
    }
    
    if (!user) {
        return <div className="text-center text-kmuGreen">Loading...</div>;
    }
    const [caseData, setCaseData] = useState<Case | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        async function fetchCase() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE_URL}/cases/${params.id}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                setCaseData(data);
            } catch (err: any) {
                setError(err.message || "Failed to load case");
                setCaseData(null);
            } finally {
                setLoading(false);
            }
        }
        fetchCase();
    }, [params.id, token]);

    // Clear action messages after 4 seconds
    useEffect(() => {
        if (actionMessage) {
            const timer = setTimeout(() => setActionMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [actionMessage]);

    const handleStatusUpdate = async (newStatus: string) => {
        setActionLoading(true);
        setActionMessage(null);
        
        try {
            const res = await fetch(`${API_BASE_URL}/cases/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) throw new Error(await res.text());
            
            const updatedCase = await res.json();
            setCaseData(updatedCase);
            setActionMessage({ type: 'success', text: `Case ${newStatus} successfully!` });
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message || 'Failed to update case status' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteCase = async () => {
        setActionLoading(true);
        setActionMessage(null);
        
        try {
            const res = await fetch(`${API_BASE_URL}/cases/${params.id}`, {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (!res.ok) throw new Error(await res.text());
            
            setActionMessage({ type: 'success', text: 'Case deleted successfully!' });
            setTimeout(() => {
                router.push('/cases');
            }, 1500);
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message || 'Failed to delete case' });
        } finally {
            setActionLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-kmuGreen text-lg">Loading case details...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-600 text-lg">{error}</div>
            </div>
        );
    }

    if (!caseData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-gray-600 dark:text-gray-400 text-lg">Case not found</div>
            </div>
        );
    }

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
        <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-kmuGreen">Case Details</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Case Information */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Case Overview Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-kmuOrange mb-4">Case Overview</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <span className="text-gray-600 dark:text-gray-400 text-sm">Offense Type</span>
                                    <p className="font-medium text-gray-900 dark:text-white">{caseData.offenseType}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600 dark:text-gray-400 text-sm">Incident Date</span>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {new Date(caseData.incidentDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-600 dark:text-gray-400 text-sm">Severity</span>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(caseData.severity)}`}>
                                        {caseData.severity}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-600 dark:text-gray-400 text-sm">Status</span>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(caseData.status)}`}>
                                        {caseData.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Description Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-kmuOrange mb-4">Description</h2>
                            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                                {caseData.description}
                            </p>
                        </div>

                        {/* Sanctions Card */}
                        {caseData.sanctions && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <h2 className="text-xl font-semibold text-kmuOrange mb-4">Sanctions</h2>
                                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                                    {caseData.sanctions}
                                </p>
                            </div>
                        )}

                        {/* Attachments Card */}
                        {caseData.attachments && caseData.attachments.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <h2 className="text-xl font-semibold text-kmuOrange mb-4">Attachments</h2>
                                <div className="space-y-2">
                                    {caseData.attachments.map((attachment, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                            <span className="text-gray-900 dark:text-white">{attachment}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Student Information */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-kmuOrange mb-4">
                                {caseData.case_type === 'group' ? 'Involved Students' : 'Student Information'}
                                {caseData.students && caseData.students.length > 1 && (
                                    <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                        {caseData.students.length} students
                                    </span>
                                )}
                            </h2>
                            
                            {caseData.students && caseData.students.length > 0 ? (
                                <div className="space-y-4">
                                    {caseData.students.map((student, index) => (
                                        <div key={student._id || student.studentId} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                                            {caseData.students && caseData.students.length > 1 && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                    Student {index + 1} of {caseData.students.length}
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <div>
                                                    <span className="text-gray-600 dark:text-gray-400 text-sm">Full Name</span>
                                                    <p className="font-medium text-gray-900 dark:text-white">{student.fullName}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600 dark:text-gray-400 text-sm">Student ID</span>
                                                    <p className="font-medium text-gray-900 dark:text-white">{student.studentId}</p>
                                                </div>
                                                {student.department && (
                                                    <div>
                                                        <span className="text-gray-600 dark:text-gray-400 text-sm">Department</span>
                                                        <p className="font-medium text-gray-900 dark:text-white">{student.department}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                                <Link
                                                    href={`/students/${student._id || student.studentId}`}
                                                    className="text-kmuGreen hover:text-kmuOrange transition text-sm"
                                                >
                                                    View Student Profile →
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : caseData.student ? (
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">Full Name</span>
                                        <p className="font-medium text-gray-900 dark:text-white">{caseData.student.fullName}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">Student ID</span>
                                        <p className="font-medium text-gray-900 dark:text-white">{caseData.student.studentId}</p>
                                    </div>
                                    {caseData.student.department && (
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400 text-sm">Department</span>
                                            <p className="font-medium text-gray-900 dark:text-white">{caseData.student.department}</p>
                                        </div>
                                    )}
                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                        <Link
                                            href={`/students/${caseData.student._id || caseData.student.studentId}`}
                                            className="text-kmuGreen hover:text-kmuOrange transition"
                                        >
                                            View Student Profile →
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-500 dark:text-gray-400">
                                    Student information not available
                                </div>
                            )}
                        </div>

                        {/* Case Metadata */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold text-kmuOrange mb-4">Case Metadata</h2>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-gray-600 dark:text-gray-400 text-sm">Created</span>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {new Date(caseData.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-600 dark:text-gray-400 text-sm">Last Updated</span>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {new Date(caseData.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                {caseData.createdBy && (
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">Created By</span>
                                        <p className="font-medium text-gray-900 dark:text-white">{caseData.createdBy}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {(user?.role === 'admin' || user?.role === 'security_officer') && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <h2 className="text-xl font-semibold text-kmuOrange mb-4">Case Management</h2>
                                
                                {/* Action Messages */}
                                {actionMessage && (
                                    <div className={`mb-4 p-3 rounded text-sm ${
                                        actionMessage.type === 'success' 
                                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                                            : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                    }`}>
                                        {actionMessage.text}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {/* Status Management */}
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Status Management</h3>
                                        {caseData.status?.toLowerCase() === 'open' ? (
                                            <button 
                                                onClick={() => handleStatusUpdate('closed')}
                                                disabled={actionLoading}
                                                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition disabled:opacity-50"
                                            >
                                                {actionLoading ? 'Closing...' : 'Close Case'}
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleStatusUpdate('open')}
                                                disabled={actionLoading}
                                                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
                                            >
                                                {actionLoading ? 'Reopening...' : 'Reopen Case'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Other Actions */}
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Other Actions</h3>
                                        {caseData.student && (
                                            <Link
                                                href={`/students/${caseData.student._id}?tab=add-case`}
                                                className="block w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-center"
                                            >
                                                Add Another Case
                                            </Link>
                                        )}
                                        
                                        <button 
                                            onClick={() => setShowDeleteConfirm(true)}
                                            disabled={actionLoading}
                                            className="w-full bg-red-800 text-white px-4 py-2 rounded hover:bg-red-900 transition disabled:opacity-50"
                                        >
                                            Delete Case
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Academic Office Actions */}
                        {user?.role === 'academic_office' && caseData.student && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <h2 className="text-xl font-semibold text-kmuOrange mb-4">Actions</h2>
                                <div className="space-y-3">
                                    <Link
                                        href={`/students/${caseData.student._id}?tab=add-case`}
                                        className="block w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-center"
                                    >
                                        Add Another Case
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Confirm Delete
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this case? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDeleteCase}
                                disabled={actionLoading}
                                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {actionLoading ? 'Deleting...' : 'Delete'}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={actionLoading}
                                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
    );
}
