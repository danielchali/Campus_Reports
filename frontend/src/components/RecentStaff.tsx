"use client";
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/constants';
import { authHeaders } from '../utils/api';

interface Staff {
  _id: string;
  staffId: string;
  fullName: string;
  department: string;
  position?: string;
  lastSelected?: string;
}

interface RecentStaffProps {
  onStaffSelect: (staff: Staff) => void;
  maxItems?: number;
  className?: string;
}

export default function RecentStaff({ 
  onStaffSelect, 
  maxItems = 5, 
  className = "" 
}: RecentStaffProps) {
  const [recentStaff, setRecentStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecentStaff();
  }, []);

  const loadRecentStaff = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/staff/recent`, {
        headers: { ...authHeaders() }
      });
      
      if (response.ok) {
        const staff = await response.json();
        setRecentStaff(staff.slice(0, maxItems));
      }
    } catch (error) {
      console.error('Failed to load recent staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffClick = async (staff: Staff) => {
    // Update last selected timestamp
    try {
      await fetch(`${API_BASE_URL}/staff/${staff._id}/update-last-selected`, {
        method: 'PATCH',
        headers: { ...authHeaders() }
      });
    } catch (error) {
      console.error('Failed to update last selected:', error);
    }

    onStaffSelect(staff);
  };

  if (loading) {
    return (
      <div className={`${className} p-4 bg-gray-50 dark:bg-gray-700 rounded-lg`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-3"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (recentStaff.length === 0) {
    return (
      <div className={`${className} p-4 bg-gray-50 dark:bg-gray-700 rounded-lg`}>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Recent Staff
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No recent staff. Start creating cases to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className={`${className} p-4 bg-gray-50 dark:bg-gray-700 rounded-lg`}>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Recent Staff
      </h3>
      
      <div className="space-y-2">
        {recentStaff.map((staff) => (
          <button
            key={staff._id}
            onClick={() => handleStaffClick(staff)}
            className="w-full text-left p-2 bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {staff.fullName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {staff.staffId} • {staff.department}
                </div>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                {staff.lastSelected ? 
                  new Date(staff.lastSelected).toLocaleDateString() : 
                  'Recently'
                }
              </div>
            </div>
          </button>
        ))}
      </div>

      {recentStaff.length >= maxItems && (
        <button
          onClick={loadRecentStaff}
          className="w-full mt-3 text-xs text-kmuGreen hover:text-kmuOrange transition"
        >
          View More Recent Staff →
        </button>
      )}
    </div>
  );
}