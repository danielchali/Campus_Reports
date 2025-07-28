"use client";

import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { saveAs } from 'file-saver';
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
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Case, Student } from '../../../types/global.d';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function AcademicDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();
  
  // Handle authentication like profile page
  if (!token) {
    router.replace('/login');
    return <div className="text-center text-kmuGreen">Redirecting to login...</div>;
  }
  
  if (!user) {
    return <div className="text-center text-kmuGreen">Loading...</div>;
  }
  
  if (user.role !== 'academic_office') return <div className="text-red-600">Access denied.</div>;

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

  function exportCasesToWord() {
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('Offender Name')], width: { size: 15, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Offender ID')], width: { size: 10, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Offense')], width: { size: 12, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Date')], width: { size: 10, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Description')], width: { size: 18, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Severity')], width: { size: 7, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Status')], width: { size: 7, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Sanctions')], width: { size: 7, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Attachments')], width: { size: 7, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Created By')], width: { size: 7, type: WidthType.PERCENTAGE } }),
        ],
      }),
      ...filteredCases.map((c: any) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(c.student?.fullName || '')] }),
            new TableCell({ children: [new Paragraph(c.student?.studentId || '')] }),
            new TableCell({ children: [new Paragraph(c.offenseType || '')] }),
            new TableCell({ children: [new Paragraph(c.incidentDate || '')] }),
            new TableCell({ children: [new Paragraph(c.description || '')] }),
            new TableCell({ children: [new Paragraph(c.severity || '')] }),
            new TableCell({ children: [new Paragraph(c.status || '')] }),
            new TableCell({ children: [new Paragraph(c.sanctions || '')] }),
            new TableCell({ children: [new Paragraph((c.attachments && c.attachments.length) ? c.attachments.join(', ') : '')] }),
            new TableCell({ children: [new Paragraph(c.createdBy?.name || c.createdBy || '')] }),
          ],
        })
      ),
    ];
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Disciplinary Cases', bold: true, size: 32 })],
              spacing: { after: 300 },
            }),
            new Table({ rows }),
          ],
        },
      ],
    });
    Packer.toBlob(doc).then(blob => {
      saveAs(blob, 'cases.docx');
    });
  }

  // Visualization data
  const totalCases = filteredCases.length;
  const offenceCounts: Record<string, number> = {};
  const offenderCounts: Record<string, number> = {};
  filteredCases.forEach((c: Case) => {
    if (c.offenseType) offenceCounts[c.offenseType] = (offenceCounts[c.offenseType] || 0) + 1;
    if (c.student?.fullName) offenderCounts[c.student.fullName] = (offenderCounts[c.student.fullName] || 0) + 1;
  });
  const topOffences = Object.entries(offenceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topOffenders = Object.entries(offenderCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const offenceChartData = {
    labels: topOffences.map(([offence]) => offence),
    datasets: [
      {
        label: 'Cases',
        data: topOffences.map(([, count]) => count),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
      },
    ],
  };
  const offenderChartData = {
    labels: topOffenders.map(([name]) => name),
    datasets: [
      {
        label: 'Cases',
        data: topOffenders.map(([, count]) => count),
        backgroundColor: 'rgba(251, 191, 36, 0.7)',
      },
    ],
  };

  return (
    <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-kmuGreen">{totalCases}</div>
            <div className="text-gray-700 dark:text-gray-300">Total Cases</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2 text-kmuOrange">Most Common Offences</h2>
            <Bar data={offenceChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2 text-kmuOrange">Most Common Offenders</h2>
            <Bar data={offenderChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
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
                  <th className="text-left py-2 px-2">Offense</th>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Severity</th>
                  <th className="text-left py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases
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

        {/* Export Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-kmuOrange">Export & Reports</h2>
          <button
            className="bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition"
            onClick={exportCasesToWord}
            type="button"
          >
            Export Cases to Word
          </button>
        </div>
      </section>
  );
} 