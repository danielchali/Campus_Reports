"use client";

import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';
import { useRouter } from "next/navigation";

interface AuditLog {
  _id?: string;
  action: string;
  entity?: string;
  entityId?: string;
  user?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  date?: string;
  createdAt?: string;
}

export default function AuditPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  
  // Handle authentication like profile page - only on client side
  if (typeof window !== 'undefined') {
    if (!authLoading && !token) {
      router.replace('/login');
      return <div className="text-center text-kmuGreen">Redirecting to login...</div>;
    }
    
    if (authLoading) {
      return <div className="text-center text-kmuGreen">Loading...</div>;
    }
    
    if (!user || !['admin', 'chief_security_officer', 'dean_of_students'].includes(user.role)) return <div className="text-red-600">Access denied.</div>;
  }

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{[key: string]: number}>({});
  const limit = 20;

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      setError(null);
      try {
        if (!API_BASE_URL) {
          setError('API base URL is not defined.');
          setLoading(false);
          return;
        }
        const res = await fetch(`${API_BASE_URL}/audit?page=${page}&limit=${limit}`, {
          headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setStats(data.stats || {});
      } catch (err) {
        setError('Failed to load audit logs');
        setLogs([]);
        setStats({});
      }
      setLoading(false);
    }
    if (user && (user.role === 'admin' || user.role === 'academic_office')) fetchLogs();
  }, [token, user, API_BASE_URL, page]);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'academic_office')) return;
    if (!socketRef.current) {
      const socket = io(API_BASE_URL.replace('/api', ''), { transports: ['websocket'] });
      socketRef.current = socket;
      socket.on('connect', () => {
        socket.emit('joinAdmin');
      });
      socket.on('audit:new', (log: any) => {
        setLogs((prev) => [log, ...prev]);
      });
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  const safeLogs = Array.isArray(logs) ? logs : [];
  return (
      <section>
        <h1 className="text-4xl font-bold mb-4 text-kmuGreen">Audit Logs</h1>
        <p className="mb-4 text-gray-700 dark:text-gray-300">This page shows a comprehensive record of all actions taken in the system. Only admins and academic office users can view audit logs. Audit logs help ensure transparency and accountability.</p>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-kmuGreen">{total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Logs</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.case_created || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cases Created</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">
              {stats.status_change || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Status Changes</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">
              {stats.case_deleted || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cases Deleted</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">
              {stats.user_login || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">User Logins</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.login_failed || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Failed Logins</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          ) : error ? (
            <div className="text-red-600 dark:text-red-400">{error}</div>
          ) : safeLogs.length === 0 ? (
            <div className="text-gray-400 dark:text-gray-500">No audit logs available.</div>
          ) : (
            <div className="space-y-4">
                {safeLogs.map((log, i) => (
                <div key={log._id || i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        log.action === 'case_created' ? 'bg-green-100 text-green-800' :
                        log.action === 'status_change' ? 'bg-blue-100 text-blue-800' :
                        log.action === 'case_updated' ? 'bg-yellow-100 text-yellow-800' :
                        log.action === 'case_deleted' ? 'bg-red-100 text-red-800' :
                        log.action === 'user_login' ? 'bg-purple-100 text-purple-800' :
                        log.action === 'login_failed' ? 'bg-yellow-100 text-yellow-800' :
                        log.action === 'user_registered' ? 'bg-indigo-100 text-indigo-800' :
                        log.action === 'evidence_uploaded' ? 'bg-teal-100 text-teal-800' :
                        log.action === 'evidence_deleted' ? 'bg-red-100 text-red-800' :
                        log.action === 'student_created' ? 'bg-green-100 text-green-800' :
                        log.action === 'student_updated' ? 'bg-yellow-100 text-yellow-800' :
                        log.action === 'student_deleted' ? 'bg-red-100 text-red-800' :
                        log.action === 'students_imported' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.action.replace('_', ' ').toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(log.date || log.createdAt || '').toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      by <span className="font-semibold">{log.user || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Action Details</h4>
                      <div className="space-y-2">
                        <div><span className="text-gray-600 dark:text-gray-400">Entity:</span> <span className="font-medium">{log.entity || 'N/A'}</span></div>
                        <div><span className="text-gray-600 dark:text-gray-400">Entity ID:</span> <span className="font-mono text-sm">{log.entityId || 'N/A'}</span></div>
                        {log.ipAddress && (
                          <div><span className="text-gray-600 dark:text-gray-400">IP Address:</span> <span className="font-mono text-sm">{log.ipAddress}</span></div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Change Details</h4>
                      <div className="space-y-2">
                      {log.details && typeof log.details === 'object' ? (
                        log.action === 'status_change' && log.details.oldStatus && log.details.newStatus ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">{log.details.oldStatus}</span>
                              <span className="text-gray-400">→</span>
                              <span className="px-2 py-1 bg-kmuGreen text-white rounded text-xs">{log.details.newStatus}</span>
                            </div>
                          ) : log.action === 'case_created' && log.details.caseData ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">Type:</span> {log.details.caseData.caseType}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Offense:</span> {log.details.caseData.offenseType}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Severity:</span> {log.details.caseData.severity}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Students:</span> {log.details.caseData.studentCount}</div>
                            </div>
                          ) : log.action === 'case_updated' && log.details.changes ? (
                            <div className="text-sm">
                              <div className="text-gray-600 dark:text-gray-400 mb-1">Updated fields:</div>
                              <div className="space-y-1">
                                {Object.keys(log.details.changes).map(key => (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className="text-gray-500">{key}:</span>
                                    <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">
                                      {String(log.details.changes[key]).substring(0, 50)}
                                      {String(log.details.changes[key]).length > 50 ? '...' : ''}
                          </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : log.action === 'case_deleted' ? (
                            <div className="text-sm text-red-600">
                              Case permanently deleted
                            </div>
                          ) : log.action === 'user_login' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">Role:</span> {log.details.role}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Status:</span> <span className="text-green-600">Successful</span></div>
                            </div>
                          ) : log.action === 'login_failed' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">Reason:</span> <span className="text-red-600">{log.details.reason}</span></div>
                              <div><span className="text-gray-600 dark:text-gray-400">Status:</span> <span className="text-red-600">Failed</span></div>
                            </div>
                          ) : log.action === 'user_registered' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">Name:</span> {log.details.name}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Role:</span> {log.details.role}</div>
                            </div>
                          ) : log.action === 'evidence_uploaded' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">File:</span> {log.details.originalName}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Size:</span> {(log.details.fileSize / 1024).toFixed(1)} KB</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Type:</span> {log.details.mimeType}</div>
                            </div>
                          ) : log.action === 'evidence_deleted' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">File:</span> {log.details.filename}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Uploaded by:</span> {log.details.uploadedBy}</div>
                            </div>
                          ) : log.action === 'student_created' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">Name:</span> {log.details.studentData?.fullName}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">ID:</span> {log.details.studentData?.studentId}</div>
                              <div><span className="text-gray-600 dark:text-gray-400">Department:</span> {log.details.studentData?.department}</div>
                            </div>
                          ) : log.action === 'students_imported' && log.details ? (
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600 dark:text-gray-400">Imported:</span> {log.details.count} students</div>
                              {log.details.errors && log.details.errors.length > 0 && (
                                <div><span className="text-gray-600 dark:text-gray-400">Errors:</span> {log.details.errors.length}</div>
                              )}
                            </div>
                          ) : (
                            <pre className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded p-2 overflow-x-auto max-h-32">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400">{log.details || 'No additional details'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {log.userAgent && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">User Agent:</span> {log.userAgent.substring(0, 100)}
                        {log.userAgent.length > 100 ? '...' : ''}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-between items-center mt-6">
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-gray-600 dark:text-gray-300">
            Page {page} of {Math.ceil(total / limit) || 1}
          </span>
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
            onClick={() => setPage(p => (p * limit < total ? p + 1 : p))}
            disabled={page * limit >= total}
          >
            Next
          </button>
        </div>
      </section>
  );
}