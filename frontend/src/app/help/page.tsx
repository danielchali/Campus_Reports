"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useState } from 'react';

export default function HelpPage() {
  return (
    <section className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 text-kmuGreen">Help & Documentation</h1>
        <p className="text-gray-700 dark:text-gray-300 text-lg">
          Welcome to KMU DisciplineDesk! Your comprehensive disciplinary case management system.
        </p>
      </div>

      {/* Quick Start Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-kmuOrange">🚀 Quick Start Guide</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3 text-kmuGreen">For New Users</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>• Use the sidebar to navigate between different sections</li>
              <li>• Click "+ New Case" to report a new disciplinary case</li>
              <li>• Search for students by name or ID to view their history</li>
              <li>• Use the search and filter options to find specific cases</li>
              <li>• Export data using the export buttons in dashboards</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3 text-kmuGreen">Navigation Tips</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">

              <li>• Toggle dark mode using the button in the sidebar</li>
              <li>• Check audit logs for system activity</li>
              <li>• Update your profile and settings as needed</li>
              <li>• Use the audit logs for transparency tracking</li>
            </ul>
          </div>
        </div>
      </div>

      
        

      {/* Key Features */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-kmuOrange">✨ Key Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3 text-kmuGreen">Case Management</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>• <strong>Predefined Offense Types:</strong> Academic Dishonesty, Fighting, Drug/Alcohol, Theft, Vandalism, Harassment, etc.</li>
              <li>• <strong>Severity Levels:</strong> Low, Medium, High, Critical</li>
              <li>• <strong>Case Status:</strong> Open, Under Investigation, Closed, Appealed</li>
              <li>• <strong>Guided Descriptions:</strong> Dynamic placeholders based on offense type</li>
              <li>• <strong>Sanctions Tracking:</strong> Optional disciplinary measures</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3 text-kmuGreen">Advanced Features</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>• <strong>Evidence Management:</strong> Upload and manage case evidence files</li>
              <li>• <strong>Audit Logging:</strong> Complete transparency and accountability</li>
              <li>• <strong>Export Options:</strong> DOCX and Excel formats</li>
              <li>• <strong>Search & Filter:</strong> Find cases and students quickly</li>
              <li>• <strong>Offline Support:</strong> Work without internet connection</li>
            </ul>
          </div>
        </div>
      </div>

      {/* How-To Guides */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-kmuOrange">📋 How-To Guides</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3 text-kmuGreen">Creating a New Case</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li>Navigate to "Cases" → "New Case" or click "+ New Case" in the top bar</li>
              <li>Search and select the student involved</li>
              <li>Enter the incident date</li>
              <li>Select the offense type from the dropdown</li>
              <li>Choose the severity level</li>
              <li>Write a detailed description (guided by offense type)</li>
              <li>Add any sanctions applied (optional)</li>
              <li>Click "Create Case" to submit</li>
            </ol>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3 text-kmuGreen">Managing Cases</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li>View all cases in the "Cases" section</li>
              <li>Use search and filters to find specific cases</li>
              <li>Click "View Details" to see full case information</li>
              <li>Update case status (Open/Closed) as needed</li>
              <li>Add evidence files if required</li>
              <li>Export case data for reporting</li>
            </ol>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3 text-kmuGreen">Student Management</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li>View all students in the "Students" section</li>
              <li>Search by name or student ID</li>
              <li>Click on a student name to view their profile</li>
              <li>See their complete case history</li>
              <li>Add new cases directly from student profile</li>
              <li>Export student records as needed</li>
            </ol>
          </div>
        </div>
      </div>

     

      {/* Footer with Developer Info */}
      <footer className="bg-gray-100 dark:bg-gray-900 rounded-lg shadow p-6 text-center">
        <div className="text-gray-600 dark:text-gray-400">
          <p className="mb-2">
            <strong>KMU DisciplineDesk</strong> - Comprehensive Disciplinary Case Management System
          </p>
          <p className="text-sm">
            Developed by: <strong>Chali Daniel</strong> | 2025 ICT with Education | Third Year of Study
          </p>
          <p className="text-xs mt-2">
            © 2025 Kapasa Makasa University. All rights reserved.
          </p>
        </div>
      </footer>
    </section>
  );
}