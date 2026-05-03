"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, BellRing, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_URL } from '../config/constants';
import { authHeaders } from '../utils/api';
import { markStudentReportSeen, markAllStudentReportsSeen, getAllStudentReports, type StudentReport } from '../utils/studentReports';
import { useAuth } from '../context/AuthContext';

type NotificationItem = {
  _id: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
  type: 'system' | 'report';
  report?: StudentReport;
};

const STAFF_NOTIFICATION_ROLES = [
  'admin',
  'chief_security_officer',
  'dean_of_students',
  'assistant_dean',
  'secretary',
  'security_officer',
  'maintenance',
] as const;

export default function NotificationBell() {
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isStaffRole = !!user && STAFF_NOTIFICATION_ROLES.includes(user.role as typeof STAFF_NOTIFICATION_ROLES[number]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadAll = useCallback(async () => {
    if (loading) return;
    if (!token || !user) {
      setNotifications([]);
      return;
    }

    let systemNotifications: NotificationItem[] = [];
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { ...authHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        systemNotifications = (Array.isArray(data) ? data : []).map((n: any) => ({
          _id: `sys_${n._id}`,
          message: n.message,
          createdAt: n.createdAt,
          isRead: !!n.isRead,
          link: n.link,
          type: 'system' as const,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }

    let reportNotifications: NotificationItem[] = [];
    if (isStaffRole) {
      try {
        const reports = await getAllStudentReports();
        const userId = user.id || '';
        const unreadReports = reports.filter((r) => !(r.seenBy || []).includes(userId));
        reportNotifications = unreadReports.slice(0, 10).map((r) => ({
          _id: `report_${r.id}`,
          message: `${r.anonymous ? 'Anonymous' : (r.ownerName || 'Named reporter')} submitted ${r.title}`,
          createdAt: r.submittedAt,
          isRead: false,
          link: '/reports',
          type: 'report' as const,
          report: r,
        }));
      } catch (err) {
        console.error('Failed to fetch student reports', err);
      }
    }

    setNotifications([...reportNotifications, ...systemNotifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  }, [isStaffRole, loading, token, user]);

  useEffect(() => {
    if (loading) return;

    loadAll();
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, [loadAll, loading]);

  const markAsRead = async (id: string) => {
    const item = notifications.find(n => n._id === id);
    if (!item) return;

    if (item.type === 'report' && item.report) {
      try {
        await markStudentReportSeen(item.report.id, user?.id || '');
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      } catch (err) {
        console.error(err);
      }
      return;
    }

    const sysId = id.replace('sys_', '');
    try {
      await fetch(`${API_URL}/notifications/${sysId}/read`, {
        method: 'PATCH',
        headers: { ...authHeaders() }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: 'POST',
        headers: { ...authHeaders() }
      });
    } catch (err) {
      console.error(err);
    }

    if (isStaffRole) {
      try {
        await markAllStudentReportsSeen(user?.id || '');
      } catch (err) {
        console.error(err);
      }
    }

    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleReportClick = async (item: NotificationItem) => {
    if (item.type === 'report' && item.report) {
      await markStudentReportSeen(item.report.id, user?.id || '');
      setNotifications(prev => prev.map(n => n._id === item._id ? { ...n, isRead: true } : n));
      setIsOpen(false);
      router.push('/reports');
    }
  };


  const normalizeNotificationLink = (link: string) => {
    if (link.startsWith('/anonymous-reports/')) {
      const tracking = link.split('/').pop();
      return tracking ? `/anonymous-report?track=${encodeURIComponent(tracking)}` : '/anonymous-report';
    }
    return link;
  };

  const handleSystemNotificationOpen = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markAsRead(item._id);
    }

    setIsOpen(false);
    if (item.link) {
      router.push(normalizeNotificationLink(item.link));
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-kmuOrange px-1 text-[10px] font-bold leading-none text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed left-2 right-2 top-14 z-50 max-h-[70vh] w-auto max-w-none overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[400px] sm:w-[320px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              Notifications
              {unreadCount > 0 && <span className="bg-kmuOrange/10 text-kmuOrange text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
            </h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-kmuGreen hover:underline font-medium">
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-500">
                <BellRing size={32} className="text-slate-300 mb-3" />
                <p className="text-sm">No new notifications</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((n) => (
                  <div key={n._id} className={`p-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!n.isRead ? 'bg-kmuGreen/5 dark:bg-kmuGreen/10' : ''}`}>
                    <div className="flex gap-3">
                      {n.type === 'report' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                          <FileText size={14} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.isRead ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                          {n.message}
                        </p>
                        <span className="text-xs text-slate-400 mt-1 block">
                          {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {n.type === 'report' ? (
                          <button
                            onClick={() => handleReportClick(n)}
                            className="text-xs text-kmuGreen mt-2 inline-block font-medium hover:underline"
                          >
                            View report
                          </button>
                        ) : n.link && (
                          <Link href={normalizeNotificationLink(n.link)} className="text-xs text-kmuGreen mt-2 inline-block font-medium hover:underline" onClick={(event) => {
                            event.preventDefault();
                            handleSystemNotificationOpen(n);
                          }}>
                            View details
                          </Link>
                        )}
                      </div>
                      {!n.isRead && (
                        <button onClick={() => markAsRead(n._id)} className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:text-kmuGreen hover:bg-kmuGreen/10 transition-colors shrink-0" title="Mark as read">
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
