"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import Link from "next/link";
import { API_BASE_URL } from '../../../config/constants';
import { authHeaders } from '../../../utils/api';

interface Staff {
    staffId: string;
    fullName: string;
    department: string;
    position?: string;
    email?: string;
    phone?: string;
    hireDate?: string;
    createdAt?: string;
}

interface Case {
    _id: string;
    staff?: Staff;
    staffMembers?: Staff[];
    staff_id?: string;
    staff_ids?: string[];
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

export default function StaffDetailsPage({ params }: { params: { id: string } }) {
    const { token, user, loading: authLoading } = useAuth();
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
    
    const [staff, setStaff] = useState<Staff | null>(null);
    const [cases, setCases] = useState<Case[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    async function fetchStaff() {
        try {
            const res = await fetch(`${API_BASE_URL}/staff/${params.id}`, {
                headers: { ...authHeaders() },
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setStaff(data);
        } catch (err: any) {
            setError(err?.message || 'Network error, please try again');
        }
    }

    async function fetchCases() {
        try {
            const res = await fetch(`${API_BASE_URL}/cases?staffId=${params.id}`, {
                headers: { ...authHeaders() },
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setCases(Array.isArray(data) ? data : (data.cases || data || []));
        } catch (err: any) {
            setError(err?.message || 'Network error, please try again');
        }
    }

    useEffect(() => {
        if (token) {
            Promise.all([fetchStaff(), fetchCases()])
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [token, params.id]);

    async function handleDelete() {
        if (!window.confirm('Are you sure you want to delete this staff member?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/staff/${params.id}`, {
                method: 'DELETE',
                headers: { ...authHeaders() },
            });
            if (!res.ok) throw new Error(await res.text());
            setSuccess('Staff member deleted successfully!');
            setTimeout(() => router.push('/staff'), 1500);
        } catch (err: any) {
            setError(err?.message || 'Network error, please try again');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-kmuGreen text-lg">Loading staff details...</div>
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

    if (!staff) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-gray-600 dark:text-gray-400 text-lg">Staff member not found</div>
            </div>
        );
    }

    const totalCases = cases.length;
    const openCases = cases.filter(c => c.status?.toLowerCase() === 'open').length;
    const closedCases = cases.filter(c => c.status?.toLowerCase() === 'closed').length;
    const highSeverityCases = cases.filter(c => c.severity?.toLowerCase() === 'high' || c.severity?.toLowerCase() === 'critical').length;

    return (
        <section className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-kmuGreen">Staff Details</h1>
                <div className="flex gap-2">
                    <Link 
                        href={`/cases/new?staffId=${staff.staffId}`}
                        className="bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition"
                    >
                        + New Case
                    </Link>
                    <Link 
                        href="/staff"
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
                    >
                        Back to Staff
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
                    {success}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Staff Information */}
                <div className="md:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4 text-kmuOrange">Staff Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Staff ID</label>
                                <div className="mt-1 text-lg font-medium">{staff.staffId}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Full Name</label>
                                <div className="mt-1 text-lg font-medium">{staff.fullName}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Department</label>
                                <div className="mt-1">{staff.department || 'N/A'}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Position</label>
                                <div className="mt-1">{staff.position || 'N/A'}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                                <div className="mt-1">
                                    {staff.email ? (
                                        <a href={`mailto:${staff.email}`} className="text-kmuGreen hover:underline">
                                            {staff.email}
                                        </a>
                                    ) : 'N/A'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Phone</label>
                                <div className="mt-1">
                                    {staff.phone ? (
                                        <a href={`tel:${staff.phone}`} className="text-kmuGreen hover:underline">
                                            {staff.phone}
                                        </a>
                                    ) : 'N/A'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Hire Date</label>
                                <div className="mt-1">
                                    {staff.hireDate ? new Date(staff.hireDate).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Member Since</label>
                                <div className="mt-1">
                                    {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex gap-3">
                            <Link 
                                href={`/staff/edit/${staff.staffId}`}
                                className="bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition"
                            >
                                Edit Staff Member
                            </Link>
                            <button
                                onClick={handleDelete}
                                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                            >
                                Delete Staff Member
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Case Statistics */}
                <div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4 text-kmuOrange">Case Statistics</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Total Cases</span>
                                <span className="text-lg font-semibold">{totalCases}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Open Cases</span>
                                <span className="text-lg font-semibold text-blue-600">{openCases}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Closed Cases</span>
                                <span className="text-lg font-semibold text-green-600">{closedCases}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">High Severity</span>
                                <span className="text-lg font-semibold text-red-600">{highSeverityCases}</span>
                            </div>
                        </div>
                        
                        {totalCases > 0 && (
                            <button
                                onClick={() => router.push(`/cases?staffId=${staff.staffId}`)}
                                className="w-full mt-6 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                            >
                                View All Cases
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Cases History */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-kmuOrange">Case History</h2>
                    {cases.length > 0 && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {cases.length} case{cases.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                
                {cases.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p>No cases found for this staff member.</p>
                        <Link 
                            href={`/cases/new?staffId=${staff.staffId}`}
                            className="inline-block mt-4 text-kmuGreen hover:underline"
                        >
                            Create the first case
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="py-2 px-2 text-left">Case ID</th>
                                    <th className="py-2 px-2 text-left">Offense</th>
                                    <th className="py-2 px-2 text-left hidden md:table-cell">Date</th>
                                    <th className="py-2 px-2 text-left">Severity</th>
                                    <th className="py-2 px-2 text-left">Status</th>
                                    <th className="py-2 px-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {cases.map((c) => (
                                    <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="py-2 px-2">
                                            <Link 
                                                href={`/cases/${c._id}`} 
                                                className="text-kmuGreen hover:underline font-medium"
                                            >
                                                {c._id.substring(0, 8)}...
                                            </Link>
                                        </td>
                                        <td className="py-2 px-2">{c.offenseType || 'N/A'}</td>
                                        <td className="py-2 px-2 hidden md:table-cell">
                                            {c.incidentDate ? new Date(c.incidentDate).toLocaleDateString() : 'N/A'}
                                        </td>
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
                                                c.status === 'Closed' ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {c.status || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <Link 
                                                href={`/cases/${c._id}`} 
                                                className="text-kmuGreen hover:underline text-sm"
                                            >
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}