"use client";

import { useState, useEffect } from 'react';

import { saveAs } from 'file-saver';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/constants';
import { fetchWithAuth, authHeaders } from '../../utils/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Case, Student } from '../../../types/global.d';
import { prepareChartExport } from '../../utils/chartExport';
import Notification, { useNotification } from '../../components/Notification';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function AssistantDeanDashboard() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { notification, showNotification, hideNotification } = useNotification();
  
  // Handle authentication like profile page - only on client side
  if (typeof window !== 'undefined') {
    if (!authLoading && !token) {
      router.replace('/login');
      return <div className="text-center text-kmuGreen">Redirecting to login...</div>;
    }
    
    if (authLoading) {
      return <div className="text-center text-kmuGreen">Loading...</div>;
    }
    
    if (!user || user.role !== 'assistant_dean') return <div className="text-red-600">Access denied.</div>;
  }

  const [search, setSearch] = useState('');
  const [cases, setCases] = useState<Case[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch cases with improved error handling
        const casesData = await fetchWithAuth(`${API_BASE_URL}/cases`);
        setCases(Array.isArray(casesData) ? casesData : (casesData.cases || casesData || []));
        
        // Fetch students with improved error handling
        const studentsData = await fetchWithAuth(`${API_BASE_URL}/students`);
        setStudents(Array.isArray(studentsData) ? studentsData : (studentsData.students || studentsData || []));
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error.message || 'Failed to fetch data. Please try again.');
        setCases([]);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  const safeStudents = Array.isArray(students) ? students : [];
  const safeCases = Array.isArray(cases) ? cases : [];

  useEffect(() => {
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

  async function exportCasesToWord() {
    try {
      // Prepare chart data
      const chartExportData = await prepareChartExport();
      
      const res = await fetch(`${API_BASE_URL}/reports/dashboard-cases`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders() // Use the authHeaders function instead of fetchWithAuth.headers
        },
        body: JSON.stringify({
          charts: chartExportData.charts,
          pageInfo: {
            title: 'Assistant Dean Dashboard - All Cases Report',
            url: window.location.href
          }
        }),
      });
      
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      saveAs(blob, 'assistant_dean_all_cases_report.docx');
      showNotification('success', 'Report exported successfully!');
    } catch (err) {
      console.error('Export cases error:', err);
      showNotification('error', 'Failed to export cases');
    }
  }

  // Visualization data
  const totalCases = filteredCases.length;
  const totalStudents = safeStudents.length;
  const pendingCases = filteredCases.filter(c => c.status === 'Open' || c.status === 'Under Investigation').length;
  const resolvedCases = filteredCases.filter(c => c.status === 'Closed').length;
  
  const statusCounts: Record<string, number> = {};
  const offenseCounts: Record<string, number> = {};
  filteredCases.forEach((c: Case) => {
    if (c.status) statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    if (c.offenseType) offenseCounts[c.offenseType] = (offenseCounts[c.offenseType] || 0) + 1;
  });

  const statusChartData = {
    labels: Object.keys(statusCounts),
    datasets: [
      {
        label: 'Cases by Status',
        data: Object.values(statusCounts),
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',   // Open - Blue
          'rgba(251, 191, 36, 0.7)',   // Under Investigation - Yellow
          'rgba(34, 197, 94, 0.7)',    // Closed - Green
          'rgba(168, 85, 247, 0.7)',   // Appealed - Purple
        ],
      },
    ],
  };

  const topOffences = Object.entries(offenseCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const offenceChartData = {
    labels: topOffences.map(([offence]) => offence),
    datasets: [
      {
        label: 'Most Common Offences',
        data: topOffences.map(([, count]) => count),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kmuGreen mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          <h3 className="font-medium mb-2">Error Loading Dashboard</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <section>
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2 text-kmuGreen">Assistant Dean Dashboard</h1>
          <p className="text-gray-700 dark:text-gray-300">Welcome to your administrative dashboard. Support the Dean in managing student affairs and academic policies.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-kmuGreen">{totalStudents}</div>
            <div className="text-gray-700 dark:text-gray-300">Total Students</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-kmuOrange">{totalCases}</div>
            <div className="text-gray-700 dark:text-gray-300">Total Cases</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-yellow-600">{pendingCases}</div>
            <div className="text-gray-700 dark:text-gray-300">Pending Cases</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-green-600">{resolvedCases}</div>
            <div className="text-gray-700 dark:text-gray-300">Resolved Cases</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div 
            id="assistant-dean-status-chart"
            data-chart-export="true"
            data-chart-title="Cases by Status"
            data-chart-description="Distribution of disciplinary cases by current status"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold mb-2 text-kmuOrange">Cases by Status</h2>
            <Doughnut data={statusChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
          <div 
            id="assistant-dean-offence-chart"
            data-chart-export="true"
            data-chart-title="Most Common Offences"
            data-chart-description="Top 5 most common disciplinary offenses"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold mb-2 text-kmuOrange">Most Common Offences</h2>
            <Bar data={offenceChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </div>
        </div>
        
        {/* Recent Cases Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-kmuOrange">Pending Cases Requiring Review</h2>
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
                  <th className="text-left py-2 px-2">Department</th>
                  <th className="text-left py-2 px-2">Offense</th>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Severity</th>
                  <th className="text-left py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases
                  .filter(c => c.status === 'Open' || c.status === 'Under Investigation')
                  .sort((a: Case, b: Case) => new Date(b.createdAt || b.incidentDate || 0).getTime() - new Date(a.createdAt || a.incidentDate || 0).getTime())
                  .slice(0, 10)
                  .map((c: Case, i: number) => (
                  <tr 
                    key={i} 
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => router.push(`/cases/${c._id}`)}
                  >
                    <td className="py-2 px-2">
                      <div className="font-medium text-kmuGreen hover:text-kmuOrange transition">{c.student?.fullName || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{c.student?.studentId || ''}</div>
                    </td>
                    <td className="py-2 px-2">{c.student?.department || 'N/A'}</td>
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
                        c.status === 'Under Investigation' ? 'bg-yellow-100 text-yellow-800' :
                        c.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {c.status || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCases.filter(c => c.status === 'Open' || c.status === 'Under Investigation').length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No pending cases found.
              </div>
            )}
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-kmuOrange">Export & Reports</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              className="bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition"
              onClick={exportCasesToWord}
              type="button"
            >
              Export All Cases (DOCX)
            </button>
            <Link
              href="/reports"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition inline-block"
            >
              View Detailed Reports
            </Link>
            <Link
              href="/students"
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition inline-block"
            >
              Student Management
            </Link>
          </div>
        </div>
      </section>
      
      {/* Notification */}
      {notification?.isVisible && (
        <Notification
          type={notification.type}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
      )}
    </>
  );
} 