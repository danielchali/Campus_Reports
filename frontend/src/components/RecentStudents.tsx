"use client";
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/constants';
import { authHeaders } from '../utils/api';

interface Student {
  _id: string;
  studentId: string;
  fullName: string;
  department: string;
  year?: string;
  gender?: string;
  lastSelected?: string;
}

interface RecentStudentsProps {
  onStudentSelect: (student: Student) => void;
  maxItems?: number;
  className?: string;
}

export default function RecentStudents({ 
  onStudentSelect, 
  maxItems = 5, 
  className = "" 
}: RecentStudentsProps) {
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecentStudents();
  }, []);

  const loadRecentStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/students/recent`, {
        headers: { ...authHeaders() }
      });
      
      if (response.ok) {
        const students = await response.json();
        setRecentStudents(students.slice(0, maxItems));
      }
    } catch (error) {
      console.error('Failed to load recent students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = async (student: Student) => {
    // Update last selected timestamp
    try {
      await fetch(`${API_BASE_URL}/students/${student._id}/update-last-selected`, {
        method: 'PATCH',
        headers: { ...authHeaders() }
      });
    } catch (error) {
      console.error('Failed to update last selected:', error);
    }

    onStudentSelect(student);
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

  if (recentStudents.length === 0) {
    return (
      <div className={`${className} p-4 bg-gray-50 dark:bg-gray-700 rounded-lg`}>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Recent Students
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No recent students. Start creating cases to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className={`${className} p-4 bg-gray-50 dark:bg-gray-700 rounded-lg`}>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Recent Students
      </h3>
      
      <div className="space-y-2">
        {recentStudents.map((student) => (
          <button
            key={student._id}
            onClick={() => handleStudentClick(student)}
            className="w-full text-left p-2 bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {student.fullName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {student.studentId} • {student.department}
                </div>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                {student.lastSelected ? 
                  new Date(student.lastSelected).toLocaleDateString() : 
                  'Recently'
                }
              </div>
            </div>
          </button>
        ))}
      </div>

      {recentStudents.length >= maxItems && (
        <button
          onClick={loadRecentStudents}
          className="w-full mt-3 text-xs text-kmuGreen hover:text-kmuOrange transition"
        >
          View More Recent Students →
        </button>
      )}
    </div>
  );
} 