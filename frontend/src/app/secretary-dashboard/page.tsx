"use client";

import { useState, useEffect } from 'react';

import { saveAs } from 'file-saver';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Case, Student } from '../../../types/global.d';
import { prepareChartExport } from '../../utils/chartExport';
import Notification, { useNotification } from '../../components/Notification';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

export default function SecretaryDashboard() {
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
    
    if (!user || user.role !== 'secretary') return <div className="text-red-600">Access denied.</div>;
  }

  const [search, setSearch] = useState('');
  const [cases, setCases] = useState<Case[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const casesRes = await fetch(`${API_BASE_URL}/cases`, { headers: { ...authHeaders() } });
        const studentsRes = await fetch(`${API_BASE_URL}/students`, { headers: { ...authHeaders() } });
        
        if (casesRes.ok) {
          const casesData = await casesRes.json();
          setCases(casesData.cases || casesData || []);
        } else {
          console.error('Failed to fetch cases:', casesRes.status);
          setCases([]);
        }
        
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setStudents(studentsData.students || studentsData || []);
        } else {
          console.error('Failed to fetch students:', studentsRes.status);
          setStudents([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setCases([]);
        setStudents([]);
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
          ...authHeaders() 
        },
        body: JSON.stringify({
          charts: chartExportData.charts,
          pageInfo: {
            title: 'Secretary Dashboard - All Cases Report',
            url: window.location.href
          }
        }),
      });
      
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      saveAs(blob, 'secretary_all_cases_report.docx');
    } catch (err) {
      console.error('Export cases error:', err);
      showNotification('error', 'Failed to export cases');
    }
  }

  // Visualization data
  const totalCases = filteredCases.length;
  const totalStudents = safeStudents.length;
  const todayCases = filteredCases.filter(c => {
    const caseDate = new Date(c.createdAt || c.incidentDate || 0);
    const today = new Date();
    return caseDate.toDateString() === today.toDateString();
  }).length;
  const recentCases = filteredCases.filter(c => {
    const caseDate = new Date(c.createdAt || c.incidentDate || 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return caseDate >= weekAgo;
  }).length;
  
  // Get cases per day for the last 7 days
  const last7Days = [];
  const casesPerDay = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    
    const casesOnDay = filteredCases.filter(c => {
      const caseDate = new Date(c.createdAt || c.incidentDate || 0);
      return caseDate.toDateString() === date.toDateString();
    }).length;
    casesPerDay.push(casesOnDay);
  }

  const weeklyTrendData = {
    labels: last7Days,
    datasets: [
      {
        label: 'Cases per Day',
        data: casesPerDay,
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const departmentCounts: Record<string, number> = {};
  filteredCases.forEach((c: Case) => {
    if (c.student?.department) departmentCounts[c.student.department] = (departmentCounts[c.student.department] || 0) + 1;
  });

  const departmentChartData = {
    labels: Object.keys(departmentCounts),
    datasets: [
      {
        label: 'Cases by Department',
        data: Object.values(departmentCounts),
        backgroundColor: 'rgba(251, 191, 36, 0.7)',
      },
    ],
  };

  return (
    <>
      <section>
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2 text-kmuGreen">Secretary Dashboard</h1>
          <p className="text-gray-700 dark:text-gray-300">Welcome to your administrative dashboard. Manage records, documentation, and administrative tasks efficiently.</p>
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
            <div className="text-4xl font-bold text-blue-600">{todayCases}</div>
            <div className="text-gray-700 dark:text-gray-300">Cases Today</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-purple-600">{recentCases}</div>
            <div className="text-gray-700 dark:text-gray-300">This Week</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div 
            id="secretary-weekly-trend-chart"
            data-chart-export="true"
            data-chart-title="Weekly Case Trend"
            data-chart-description="Number of cases created per day over the last 7 days"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold mb-2 text-kmuOrange">Weekly Case Trend</h2>
            <Line data={weeklyTrendData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </div>
          <div 
            id="secretary-department-chart"
            data-chart-export="true"
            data-chart-title="Cases by Department"
            data-chart-description="Distribution of disciplinary cases across academic departments"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold mb-2 text-kmuOrange">Cases by Department</h2>
            <Bar data={departmentChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </div>
        </div>
        
        {/* Recent Cases Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
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
                  <th className="text-left py-2 px-2">Department</th>
                  <th className="text-left py-2 px-2">Offense</th>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Severity</th>
                  <th className="text-left py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases
                  .sort((a: Case, b: Case) => new Date(b.createdAt || b.incidentDate || 0).getTime() - new Date(a.createdAt || a.incidentDate || 0).getTime())
                  .slice(0, 15)
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

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-kmuOrange">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/students"
              className="bg-kmuGreen text-white px-4 py-3 rounded hover:bg-kmuOrange transition text-center font-medium"
            >
              📚 Manage Students
            </Link>
            <Link
              href="/cases"
              className="bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700 transition text-center font-medium"
            >
              📋 View All Cases
            </Link>
            <button
              className="bg-gray-600 text-white px-4 py-3 rounded hover:bg-gray-700 transition font-medium"
              onClick={exportCasesToWord}
              type="button"
            >
              📄 Export Reports
            </button>
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