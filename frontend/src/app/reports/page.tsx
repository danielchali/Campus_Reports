"use client";
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { API_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';
import { prepareChartExport } from '../../utils/chartExport';
import { saveAs } from 'file-saver';
import Notification, { useNotification } from '../../components/Notification';

export default function ReportsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { notification, showNotification, hideNotification } = useNotification();
  
  const [offenseTrends, setOffenseTrends] = useState<{ _id: string; count: number }[]>([]);
  const [departmentStats, setDepartmentStats] = useState<{ _id: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingWithCharts, setExportingWithCharts] = useState(false);
  
  // Handle authentication like profile page - only on client side
  if (typeof window !== 'undefined') {
    if (!authLoading && !token) {
      router.replace('/login');
      return <div className="text-center text-kmuGreen">Redirecting to login...</div>;
    }
    
    if (authLoading) {
      return <div className="text-center text-kmuGreen">Loading...</div>;
    }
    
    if (!user || !['admin','chief_security_officer','dean_of_students','assistant_dean','secretary','security_officer'].includes(user.role)) {
      return <div className="text-red-600">Access denied.</div>;
    }
  }

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        if (!API_BASE_URL) {
          setError('API base URL is not defined.');
          setLoading(false);
          return;
        }
        const res = await fetch(`${API_BASE_URL}/reports/analytics`, {
          headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setOffenseTrends(data.offenseTrends);
        setDepartmentStats(data.departmentStats);
      } catch (err: any) {
        setError('Failed to load analytics');
      }
      setLoading(false);
    }
    if (user) fetchAnalytics();
  }, [token, user, API_BASE_URL]);

  async function handleExcelExport() {
    setExportingExcel(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/export-excel`, {
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analytics.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotification('success', 'Excel export completed successfully');
    } catch (err) {
      console.error('Excel export error:', err);
      showNotification('error', 'Failed to export Excel');
    } finally {
      setExportingExcel(false);
    }
  }

  async function handleDocxExport() {
    setExportingDocx(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/docx`, {
        method: 'POST',
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analytics.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotification('success', 'DOCX export completed successfully');
    } catch (err) {
      console.error('DOCX export error:', err);
      showNotification('error', 'Failed to export DOCX');
    } finally {
      setExportingDocx(false);
    }
  }

  async function handleExportWithCharts() {
    setExportingWithCharts(true);
    try {
      // Prepare chart data
      console.log('Preparing chart export...');
      const chartExportData = await prepareChartExport();
      console.log('Chart export data:', chartExportData);
      
      // Check payload size
      const payloadSize = JSON.stringify(chartExportData).length;
      console.log('Payload size:', payloadSize, 'bytes');
      if (payloadSize > 5000000) { // 5MB limit
        showNotification('error', 'Chart data too large. Please try again with fewer charts.');
        return;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const res = await fetch(`${API_BASE_URL}/reports/with-charts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders() 
        },
        body: JSON.stringify({
          charts: chartExportData.charts,
          pageInfo: chartExportData.pageInfo,
          filters: {}
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Server error:', errorText);
        throw new Error(errorText);
      }
      const blob = await res.blob();
      saveAs(blob, 'reports_with_charts.docx');
      showNotification('success', 'Export with charts completed successfully');
    } catch (err: any) {
      console.error('Export with charts error:', err);
      if (err.name === 'AbortError') {
        showNotification('error', 'Export timed out. Please try again.');
      } else {
        showNotification('error', 'Failed to export with charts');
      }
    } finally {
      setExportingWithCharts(false);
    }
  }



  const safeOffenseTrends = Array.isArray(offenseTrends) ? offenseTrends : [];
  const safeDepartmentStats = Array.isArray(departmentStats) ? departmentStats : [];

  // Chart data for offense trends
  const offenseData = {
    labels: safeOffenseTrends.map(row => row._id),
    datasets: [
      {
        label: 'Count',
        data: safeOffenseTrends.map(row => row.count),
        backgroundColor: 'rgba(16, 185, 129, 0.7)', // kmuGreen
      },
    ],
  };
  // Chart data for department stats
  const deptData = {
    labels: safeDepartmentStats.map(row => row._id),
    datasets: [
      {
        label: 'Count',
        data: safeDepartmentStats.map(row => row.count),
        backgroundColor: 'rgba(251, 146, 60, 0.7)', // kmuOrange
      },
    ],
  };

  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

  return (
    <>
      <section>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-kmuGreen">Reports & Analytics</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2 text-kmuOrange">Offense Trends</h2>
          {loading ? (
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div 
              id="offense-trends-chart"
              data-chart-export="true"
              data-chart-title="Offense Trends"
              data-chart-description="Distribution of disciplinary cases by offense type"
              style={{ height: 300 }}
            >
              <Bar data={offenseData} options={{ responsive: true, plugins: { legend: { display: false }, title: { display: false } } }} />
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2 text-kmuOrange">Department Stats</h2>
          {loading ? (
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div 
              id="department-stats-chart"
              data-chart-export="true"
              data-chart-title="Department Statistics"
              data-chart-description="Distribution of disciplinary cases by department"
              style={{ height: 300 }}
            >
              <Bar data={deptData} options={{ responsive: true, plugins: { legend: { display: false }, title: { display: false } } }} />
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <button
            className="bg-kmuOrange text-white px-4 py-2 rounded hover:bg-kmuGreen transition disabled:opacity-50"
            onClick={handleExcelExport}
            disabled={exportingExcel}
          >
            {exportingExcel ? 'Exporting...' : 'Export to Excel'}
          </button>
          <button
            className="bg-gray-200 text-kmuGreen px-4 py-2 rounded hover:bg-kmuOrange/20 transition disabled:opacity-50"
            onClick={handleDocxExport}
            disabled={exportingDocx}
          >
            {exportingDocx ? 'Exporting...' : 'Export to DOCX'}
          </button>
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition disabled:opacity-50"
            onClick={handleExportWithCharts}
            disabled={exportingWithCharts}
          >
            {exportingWithCharts ? 'Exporting...' : 'Export with Charts (DOCX)'}
          </button>
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