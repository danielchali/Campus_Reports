"use client";
import { useState, useEffect } from 'react';
import SmartStudentSearch from './SmartStudentSearch';
import { API_BASE_URL } from '../config/constants';
import { authHeaders } from '../utils/api';
import { OFFENSE_TYPES, SEVERITY_LEVELS } from '../config/constants';

interface Student {
  _id: string;
  studentId: string;
  fullName: string;
  department: string;
  year?: string;
  gender?: string;
}

interface SmartCaseFormProps {
  onSubmit: (caseData: any) => void;
  loading?: boolean;
}

export default function SmartCaseForm({ onSubmit, loading = false }: SmartCaseFormProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [incidentDate, setIncidentDate] = useState('');
  const [offenseType, setOffenseType] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [sanctions, setSanctions] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [offenseTypeDescription, setOffenseTypeDescription] = useState('');

  // Get description for selected offense type
  const getOffenseTypeDescription = (offenseType: string) => {
    const offense = OFFENSE_TYPES.find(ot => ot.value === offenseType);
    return offense ? offense.description : '';
  };

  // Handle offense type change
  const handleOffenseTypeChange = (offenseType: string) => {
    setOffenseType(offenseType);
    setOffenseTypeDescription(getOffenseTypeDescription(offenseType));
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedStudent) {
      newErrors.student = 'Please select a student';
    }

    if (!incidentDate) {
      newErrors.incidentDate = 'Incident date is required';
    } else {
      const selectedDate = new Date(incidentDate);
      const today = new Date();
      if (selectedDate > today) {
        newErrors.incidentDate = 'Incident date cannot be in the future';
      }
    }

    if (!offenseType) {
      newErrors.offenseType = 'Please select an offense type';
    }

    if (!severity) {
      newErrors.severity = 'Please select severity level';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const caseData = {
      student_id: selectedStudent?.studentId,
      incident_date: incidentDate,
      offense_type: offenseType,
      severity,
      description: description.trim(),
      sanctions: sanctions.trim() || undefined,
      student: selectedStudent
    };

    onSubmit(caseData);
  };

  // Quick lookup by student ID
  const handleQuickLookup = async (studentId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/students/search?q=${studentId}`, {
        headers: { ...authHeaders() }
      });
      
      if (response.ok) {
        const students = await response.json();
        const student = students.find((s: Student) => s.studentId === studentId);
        if (student) {
          setSelectedStudent(student);
        }
      }
    } catch (error) {
      console.error('Quick lookup failed:', error);
    }
  };

  // Auto-fill today's date
  const fillTodayDate = () => {
    const today = new Date().toISOString().split('T')[0];
    setIncidentDate(today);
  };

  // Clear form
  const clearForm = () => {
    setSelectedStudent(null);
    setIncidentDate('');
    setOffenseType('');
    setSeverity('');
    setDescription('');
    setSanctions('');
    setOffenseTypeDescription('');
    setErrors({});
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-kmuOrange mb-4">Create New Case</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Smart Student Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Student *
          </label>
          <SmartStudentSearch
            onStudentSelect={setSelectedStudent}
            placeholder="Search by name or student ID..."
            className="w-full"
          />
          {selectedStudent && (
            <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-green-800 dark:text-green-200">
                    {selectedStudent.fullName}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-300">
                    ID: {selectedStudent.studentId} • {selectedStudent.department} • Year {selectedStudent.year}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          {errors.student && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.student}</p>
          )}
        </div>

        {/* Incident Date with Quick Fill */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Incident Date *
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-kmuGreen focus:border-transparent"
            />
            <button
              type="button"
              onClick={fillTodayDate}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition"
            >
              Today
            </button>
          </div>
          {errors.incidentDate && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.incidentDate}</p>
          )}
        </div>

        {/* Offense Type with Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Offense Type *
          </label>
          <select
            value={offenseType}
            onChange={(e) => handleOffenseTypeChange(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-kmuGreen focus:border-transparent"
          >
            <option value="">Select Offense Type...</option>
            {OFFENSE_TYPES.map(ot => (
              <option key={ot.value} value={ot.value}>
                {ot.label}
              </option>
            ))}
          </select>
          {offenseTypeDescription && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
              {offenseTypeDescription}
            </p>
          )}
          {errors.offenseType && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.offenseType}</p>
          )}
        </div>

        {/* Severity Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Severity *
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-kmuGreen focus:border-transparent"
          >
            <option value="">Select Severity...</option>
            {SEVERITY_LEVELS.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
          {errors.severity && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.severity}</p>
          )}
        </div>

        {/* Description with Character Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={offenseTypeDescription || "Describe the incident in detail..."}
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-kmuGreen focus:border-transparent"
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {description.length}/1000 characters
            </span>
            {description.length < 10 && description.length > 0 && (
              <span className="text-xs text-orange-600 dark:text-orange-400">
                At least 10 characters required
              </span>
            )}
          </div>
          {errors.description && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
          )}
        </div>

        {/* Sanctions (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sanctions (Optional)
          </label>
          <input
            type="text"
            value={sanctions}
            onChange={(e) => setSanctions(e.target.value)}
            placeholder="Any sanctions or disciplinary measures applied..."
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-kmuGreen focus:border-transparent"
          />
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Case...' : 'Create Case'}
          </button>
          <button
            type="button"
            onClick={clearForm}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition"
          >
            Clear Form
          </button>
        </div>
      </form>
    </div>
  );
} 