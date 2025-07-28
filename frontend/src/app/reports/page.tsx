"use client";
import ProtectedRoute from '../(protected)/ProtectedRoute';
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

export default function ReportsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [offenseTrends, setOffenseTrends] = useState<{ _id: string; count: number }[]>([]);
  const [departmentStats, setDepartmentStats] = useState<{ _id: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

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
    } catch (err) {
      console.error('Excel export error:', err);
      alert('Failed to export Excel');
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
    } catch (err) {
      console.error('DOCX export error:', err);
      alert('Failed to export DOCX');
    } finally {
      setExportingDocx(false);
    }
  }

  if (!user || !['admin','academic_office','security_officer'].includes(user.role)) return <div className="text-red-600">Access denied.</div>;

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
    <ProtectedRoute>
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
            <div style={{ height: 300 }}>
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
            <div style={{ height: 300 }}>
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
        </div>
      </section>
    </ProtectedRoute>
  );
}