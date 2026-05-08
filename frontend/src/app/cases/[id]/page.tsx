"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";

import Link from "next/link";
import { API_BASE_URL } from '../../../config/constants';
import { canAccessPage } from '../../../utils/access';
import { PageSkeleton, DetailPageSkeleton } from '../../../components/PageSkeleton';

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
    student?: Student;
    students?: Student[];
    student_ids?: string[];
    staff?: Staff;
    staffMembers?: Staff[];
    staff_ids?: string[];
    case_type?: 'single_student' | 'group_student' | 'single_staff' | 'group_staff';
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
    student_case_process?: any;
}

export default function CaseDetailsPage({ params }: { params: { id: string } }) {
    if (params.id === "new") {
        return null;
    }
    
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
        if (user && !canAccessPage(user.role, 'cases')) {
            return <div className="text-red-600">Access denied.</div>;
        }
    }

    const [caseData, setCaseData] = useState<Case | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        incidentDate: '',
        offenseType: '',
        severity: '',
        status: '',
        description: '',
        sanctions: ''
    });

    const OFFENSE_TYPE_OPTIONS = ['Academic Dishonesty', 'Misconduct', 'Harassment', 'Substance Abuse', 'Property Damage', 'Other'];
    const SEVERITY_OPTIONS = ['Low', 'Medium', 'High'];
    const STATUS_OPTIONS = ['Open', 'Pending', 'Closed'];

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
                setEditForm({
                    incidentDate: data.incidentDate ? data.incidentDate.split('T')[0] : '',
                    offenseType: data.offenseType || '',
                    severity: data.severity || '',
                    status: data.status || 'Open',
                    description: data.description || '',
                    sanctions: data.sanctions || ''
                });
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

    const handleSaveEdit = async () => {
        setActionLoading(true);
        setActionMessage(null);
        try {
            const payload = {
                incident_date: editForm.incidentDate,
                offense_type: editForm.offenseType,
                severity: editForm.severity,
                status: editForm.status,
                description: editForm.description,
                sanctions: editForm.sanctions
            };
            const res = await fetch(`${API_BASE_URL}/cases/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await res.text());
            const updatedCase = await res.json();
            setCaseData(updatedCase);
            setIsEditing(false);
            setActionMessage({ type: 'success', text: 'Case updated successfully!' });
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message || 'Failed to update case' });
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


    const handlePrintSummonCallout = () => {
        if (!caseData) return;
        const summon = caseData.student_case_process?.summon || {};
        const accused = caseData.student_case_process?.occurrenceCover?.accusedPeople || [];
        if (accused.length === 0) {
            setActionMessage({ type: 'error', text: 'No accused persons found for callout printing.' });
            return;
        }

        const reportTime = summon.reportTime || '....................';
        const reportDate = summon.reportDate || '....................';
        const appointment = summon.appointment || '........................................................';

        const calloutsHtml = accused.map((person: any, i: number) => {
            const signature = summon.studentSignatures?.[String(i)] || '................................................................';
            return `<div class="callout-card">
`
                + `<div class="logo"><img src="${window.location.origin}/kmu_logo.png" alt="KMU Logo"/></div>
`
                + `<div class="title">KAPASA MAKASA UNIVERSITY</div>
`
                + `<div class="subtitle">SECURITY DEPARTMENT</div>
`
                + `<div class="callout">CALL OUT</div>

`
                + `<p><strong>Full Names:</strong> ${person?.fullName || '................................................................'}</p>
`
                + `<p><strong>Sex:</strong> ${person?.sex || '....................'} &nbsp;&nbsp;&nbsp; <strong>Age:</strong> ${person?.age || '....................'} &nbsp;&nbsp;&nbsp; <strong>SIN:</strong> ${person?.sin || '........................................'}</p>
`
                + `<p><strong>Program of study:</strong> ${person?.programOfStudy || person?.program || '........................................................'} &nbsp;&nbsp;&nbsp; <strong>Year of study:</strong> ${person?.yearOfStudy || '....................'}</p>
`
                + `<p><strong>Residential Address:</strong> ${person?.residentialAddress || '........................................................'} &nbsp;&nbsp;&nbsp; <strong>Phone No:</strong> ${person?.phoneNo || '........................................'}</p>
`
                + `<p>You are required to report to the Security Officer's office at <strong>${reportTime}</strong> hours (Time)<br/>on <strong>${reportDate}</strong> (Day & Date) without fail.</p>

`
                + `<p><strong>Appointment:</strong> ${appointment}</p>
`
                + `<p><strong>Signature:</strong> ${signature}</p>
`
                + `</div>`;
        }).join('<div class="page-break"></div>');

        const html = `<!DOCTYPE html><html><head><title>Call Out</title><style>
            body{font-family:Arial,sans-serif;padding:16px;background:#fff;}
            .callout-card{max-width:800px;margin:0 auto;border:2px solid #111;padding:24px 28px;}
            .logo{text-align:center;margin-bottom:10px;}
            .logo img{height:64px;}
            .title,.subtitle,.callout{text-align:center;font-weight:700;}
            .title{font-size:22px;letter-spacing:.4px;}
            .subtitle{font-size:18px;margin-top:2px;}
            .callout{font-size:22px;margin:10px 0 18px;}
            p{font-size:16px;line-height:1.5;margin:10px 0;}
            .page-break{page-break-before:always;margin-top:20px;}
            @media print { body{padding:0;} .callout-card{border:2px solid #000;} }
        </style></head><body>${calloutsHtml}</body></html>`;

        const printWindow = window.open('', '_blank', 'width=1000,height=900');
        if (!printWindow) return;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const handleExportCaseDocx = async () => {
        if (!caseData) return;
        try {
            const res = await fetch(`${API_BASE_URL}/cases/${params.id}/export-docx-full`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error(await res.text());
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `case_${caseData.caseId || caseData._id}.docx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message || 'Failed to export case DOCX' });
        }
    };
    if (loading) {
        return (
            <DetailPageSkeleton />
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

    // Determine if this is a student or staff case
    const isStudentCase = caseData.student || caseData.students;
    const isStaffCase = caseData.staff || caseData.staffMembers;
    
    // Get the primary person associated with the case
    const primaryPerson = isStudentCase ? caseData.student : caseData.staff;
    const personType = isStudentCase ? 'Student' : 'Staff';
    const personId = isStudentCase ? caseData.student?.studentId : caseData.staff?.staffId;
    const personName = isStudentCase ? caseData.student?.fullName : caseData.staff?.fullName;
    const personDepartment = isStudentCase ? caseData.student?.program : caseData.staff?.department;
    const personPosition = isStaffCase ? caseData.staff?.position : undefined;
    const personYear = isStudentCase ? (caseData.student as any)?.year : undefined;

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-kmuGreen">Case Details</h1>
                <div className="flex flex-wrap gap-2 ml-4">
                    <Link href={`/cases/new?cloneFrom=${params.id}&doc=statement`} className="px-3 py-1 text-sm bg-white border rounded">+ Statement</Link>
                    <Link href={`/cases/new?cloneFrom=${params.id}&doc=callout`} className="px-3 py-1 text-sm bg-white border rounded">+ Callout</Link>
                    <Link href={`/cases/new?cloneFrom=${params.id}&doc=accused`} className="px-3 py-1 text-sm bg-white border rounded">+ Accused Add/Remove</Link>
                    <Link href={`/cases/new?cloneFrom=${params.id}&doc=warn-caution`} className="px-3 py-1 text-sm bg-white border rounded">+ Warn & Caution</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Case Information */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Case Overview Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-kmuOrange">Case Overview</h2>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(caseData.status)}`}>
                                {caseData.status}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Case ID</label>
                                <div className="mt-1 font-medium">{caseData.caseId || caseData._id}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Incident Date</label>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        value={editForm.incidentDate}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, incidentDate: e.target.value }))}
                                        className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                                    />
                                ) : (
                                    <div className="mt-1">{caseData.incidentDate ? new Date(caseData.incidentDate).toLocaleDateString() : 'N/A'}</div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Offense Type</label>
                                {isEditing ? (
                                    <select
                                        value={editForm.offenseType}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, offenseType: e.target.value }))}
                                        className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                                    >
                                        <option value="">Select offense type</option>
                                        {OFFENSE_TYPE_OPTIONS.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="mt-1">{caseData.offenseType || 'N/A'}</div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Severity</label>
                                {isEditing ? (
                                    <select
                                        value={editForm.severity}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, severity: e.target.value }))}
                                        className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                                    >
                                        <option value="">Select severity</option>
                                        {SEVERITY_OPTIONS.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${getSeverityColor(caseData.severity)}`}>
                                        {caseData.severity || 'N/A'}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Description</label>
                            {isEditing ? (
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={4}
                                    className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                                />
                            ) : (
                                <div className="mt-1 bg-gray-50 dark:bg-gray-700 p-3 rounded whitespace-pre-wrap">
                                    {caseData.description || 'N/A'}
                                </div>
                            )}
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Sanctions</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.sanctions}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, sanctions: e.target.value }))}
                                    className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                                />
                            ) : (
                                <div className="mt-1 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                    {caseData.sanctions || 'N/A'}
                                </div>
                            )}
                        </div>

                        {isEditing && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                    className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                                >
                                    {STATUS_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={actionLoading}
                                        className="px-4 py-2 rounded bg-kmuGreen hover:bg-kmuOrange text-white transition disabled:opacity-50"
                                    >
                                        {actionLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditForm({
                                                incidentDate: caseData.incidentDate ? caseData.incidentDate.split('T')[0] : '',
                                                offenseType: caseData.offenseType || '',
                                                severity: caseData.severity || '',
                                                status: caseData.status || 'Open',
                                                description: caseData.description || '',
                                                sanctions: caseData.sanctions || ''
                                            });
                                        }}
                                        disabled={actionLoading}
                                        className="px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white transition disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        disabled={actionLoading}
                                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
                                    >
                                        Edit Case
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(caseData.status === 'Open' ? 'Closed' : 'Open')}
                                        disabled={actionLoading}
                                        className={`px-4 py-2 rounded ${
                                            caseData.status === 'Open'
                                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                                : 'bg-red-600 hover:bg-red-700 text-white'
                                        } transition disabled:opacity-50`}
                                    >
                                        {actionLoading ? 'Updating...' : (caseData.status === 'Open' ? 'Close Case' : 'Reopen Case')}
                                    </button>
                                </>
                            )}
                            
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50"
                            >
                                Delete Case
                            </button>
                        </div>
                    </div>
                    
                    {/* Associated Person Information */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4 text-kmuOrange">
                            {personType} Information
                        </h2>
                        
                        {primaryPerson ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                                        {personType} Name
                                    </label>
                                    <div className="mt-1 font-medium">
                                        <Link 
                                            href={isStudentCase ? `/students/${caseData.student?._id}` : `/staff/${caseData.staff?._id}`}
                                            className="text-kmuGreen hover:underline"
                                        >
                                            {personName}
                                        </Link>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                                        {personType} ID
                                    </label>
                                    <div className="mt-1">{personId || 'N/A'}</div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Department
                                    </label>
                                    <div className="mt-1">{personDepartment || 'N/A'}</div>
                                </div>
                                
                                {personYear && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                                            Year
                                        </label>
                                        <div className="mt-1">{personYear}</div>
                                    </div>
                                )}
                                
                                {personPosition && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                                            Position
                                        </label>
                                        <div className="mt-1">{personPosition}</div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-gray-500 dark:text-gray-400">
                                No {personType.toLowerCase()} information available
                            </div>
                        )}
                        
                        {/* For group cases, show all associated people */}
                        {(caseData.students && caseData.students.length > 1) || 
                         (caseData.staffMembers && caseData.staffMembers.length > 1) ? (
                            <div className="mt-4">
                                <h3 className="text-md font-medium mb-2">
                                    All {personType}s in this Case
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {(caseData.students || caseData.staffMembers || []).map((person: any) => (
                                        <Link
                                            key={person._id || person.studentId || person.staffId}
                                            href={isStudentCase ? `/students/${person._id || person.studentId}` : `/staff/${person._id || person.staffId}`}
                                            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                        >
                                            {person.fullName}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
                
                {/* Sidebar Information */}
                <div className="space-y-6">
                    {/* Case Metadata */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4 text-kmuOrange">Case Metadata</h2>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Created By</label>
                                <div className="mt-1">{caseData.createdBy || 'N/A'}</div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Created At</label>
                                <div className="mt-1">
                                    {caseData.createdAt ? new Date(caseData.createdAt).toLocaleString() : 'N/A'}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Last Updated</label>
                                <div className="mt-1">
                                    {caseData.updatedAt ? new Date(caseData.updatedAt).toLocaleString() : 'N/A'}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Case Type</label>
                                <div className="mt-1 capitalize">
                                    {caseData.case_type?.replace('_', ' ') || 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4 text-kmuOrange">Actions</h2>
                        
                        <div className="space-y-3">
                            <Link
                                href="/cases"
                                className="block w-full text-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                Back to Cases
                            </Link>
                            
                            <button
                                onClick={handlePrintSummonCallout}
                                className="block w-full text-center px-4 py-2 bg-kmuOrange text-white rounded hover:opacity-90 transition"
                            >
                                Print Summon Callout
                            </button>

                            <button
                                onClick={handleExportCaseDocx}
                                className="block w-full text-center px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition"
                            >
                                Export Full Case DOCX
                            </button>

                            <button
                                onClick={() => router.push(`/cases/new?${isStudentCase ? 'studentId' : 'staffId'}=${personId}`)}
                                className="block w-full text-center px-4 py-2 bg-kmuGreen text-white rounded hover:bg-kmuOrange transition"
                            >
                                Create New Case for {personType}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4 text-red-600">Confirm Delete</h3>
                        <p className="mb-6">
                            Are you sure you want to delete this case? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteCase}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {actionLoading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Action Message Toast */}
            {actionMessage && (
                <div className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg z-50 ${
                    actionMessage.type === 'success' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-red-500 text-white'
                }`}>
                    {actionMessage.text}
                </div>
            )}
        </div>
    );
}
