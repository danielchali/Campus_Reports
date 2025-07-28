"use client";
import { useState } from 'react';

interface CaseTemplate {
  id: string;
  name: string;
  offenseType: string;
  severity: string;
  description: string;
  sanctions: string;
  color: string;
}

interface QuickCaseTemplatesProps {
  onTemplateSelect: (template: CaseTemplate) => void;
  className?: string;
}

const COMMON_TEMPLATES: CaseTemplate[] = [
  {
    id: 'fighting',
    name: 'Physical Fighting',
    offenseType: 'Fighting',
    severity: 'High',
    description: 'Student was involved in a physical altercation with another student. Immediate intervention required.',
    sanctions: 'Suspension pending investigation',
    color: 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300'
  },
  {
    id: 'disruption',
    name: 'Class Disruption',
    offenseType: 'Disruptive Behavior',
    severity: 'Medium',
    description: 'Student was disruptive during class, affecting the learning environment for others.',
    sanctions: 'Warning and behavioral contract',
    color: 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300'
  },
  {
    id: 'tardiness',
    name: 'Chronic Tardiness',
    offenseType: 'Truancy',
    severity: 'Low',
    description: 'Student has been consistently late to classes without valid excuse.',
    sanctions: 'Attendance monitoring and counseling',
    color: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300'
  },
  {
    id: 'academic_dishonesty',
    name: 'Academic Dishonesty',
    offenseType: 'Academic Dishonesty',
    severity: 'High',
    description: 'Student was caught cheating or plagiarizing during examination.',
    sanctions: 'Grade penalty and academic probation',
    color: 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300'
  },
  {
    id: 'bullying',
    name: 'Bullying/Harassment',
    offenseType: 'Harassment',
    severity: 'High',
    description: 'Student engaged in bullying or harassing behavior towards others.',
    sanctions: 'Suspension and mandatory counseling',
    color: 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300'
  },
  {
    id: 'vandalism',
    name: 'Property Damage',
    offenseType: 'Property Damage',
    severity: 'Medium',
    description: 'Student damaged school property or facilities.',
    sanctions: 'Restitution and community service',
    color: 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-900/20 dark:border-gray-700 dark:text-gray-300'
  },
  {
    id: 'theft',
    name: 'Theft',
    offenseType: 'Theft',
    severity: 'High',
    description: 'Student was found in possession of stolen property or committed theft.',
    sanctions: 'Restitution and disciplinary hearing',
    color: 'bg-pink-100 border-pink-300 text-pink-800 dark:bg-pink-900/20 dark:border-pink-700 dark:text-pink-300'
  },
  {
    id: 'substance_abuse',
    name: 'Substance Abuse',
    offenseType: 'Substance Abuse',
    severity: 'High',
    description: 'Student was found using or in possession of drugs or alcohol on campus.',
    sanctions: 'Suspension and referral to counseling',
    color: 'bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-300'
  },
  {
    id: 'dress_code',
    name: 'Dress Code Violation',
    offenseType: 'Dress Code Violation',
    severity: 'Low',
    description: 'Student failed to comply with the school dress code policy.',
    sanctions: 'Warning and parent notification',
    color: 'bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-900/20 dark:border-teal-700 dark:text-teal-300'
  },
  {
    id: 'technology_misuse',
    name: 'Technology Misuse',
    offenseType: 'Technology Misuse',
    severity: 'Medium',
    description: 'Student used school technology inappropriately (e.g., cyberbullying, unauthorized access).',
    sanctions: 'Loss of device privileges',
    color: 'bg-cyan-100 border-cyan-300 text-cyan-800 dark:bg-cyan-900/20 dark:border-cyan-700 dark:text-cyan-300'
  },
  {
    id: 'truancy',
    name: 'Truancy',
    offenseType: 'Truancy',
    severity: 'Medium',
    description: 'Student had unexcused absences or skipped classes.',
    sanctions: 'Attendance contract and parent meeting',
    color: 'bg-lime-100 border-lime-300 text-lime-800 dark:bg-lime-900/20 dark:border-lime-700 dark:text-lime-300'
  },
  {
    id: 'cheating',
    name: 'Cheating on Exam',
    offenseType: 'Academic Dishonesty',
    severity: 'High',
    description: 'Student was caught cheating during an exam.',
    sanctions: 'Exam invalidation and academic probation',
    color: 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-800 dark:bg-fuchsia-900/20 dark:border-fuchsia-700 dark:text-fuchsia-300'
  },
  {
    id: 'plagiarism',
    name: 'Plagiarism',
    offenseType: 'Academic Dishonesty',
    severity: 'High',
    description: 'Student submitted plagiarized work.',
    sanctions: 'Assignment invalidation and warning',
    color: 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300'
  },
  {
    id: 'inappropriate_language',
    name: 'Inappropriate Language',
    offenseType: 'Disruptive Behavior',
    severity: 'Low',
    description: 'Student used inappropriate or offensive language in class.',
    sanctions: 'Warning and apology',
    color: 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/20 dark:border-rose-700 dark:text-rose-300'
  },
  {
    id: 'vaping',
    name: 'Vaping on Campus',
    offenseType: 'Substance Abuse',
    severity: 'Medium',
    description: 'Student was found vaping on school grounds.',
    sanctions: 'Confiscation and parent notification',
    color: 'bg-sky-100 border-sky-300 text-sky-800 dark:bg-sky-900/20 dark:border-sky-700 dark:text-sky-300'
  },
  {
    id: 'gambling',
    name: 'Gambling',
    offenseType: 'Other',
    severity: 'Medium',
    description: 'Student was caught gambling on campus.',
    sanctions: 'Warning and counseling',
    color: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
  },
  {
    id: 'forgery',
    name: 'Forgery',
    offenseType: 'Other',
    severity: 'High',
    description: 'Student forged a signature or document.',
    sanctions: 'Disciplinary hearing and parent meeting',
    color: 'bg-violet-100 border-violet-300 text-violet-800 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-300'
  },
  {
    id: 'threats',
    name: 'Threats/Intimidation',
    offenseType: 'Harassment',
    severity: 'High',
    description: 'Student made threats or intimidated another student or staff.',
    sanctions: 'Suspension and investigation',
    color: 'bg-red-200 border-red-400 text-red-900 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
  },
  {
    id: 'sexual_misconduct',
    name: 'Sexual Misconduct',
    offenseType: 'Harassment',
    severity: 'Critical',
    description: 'Student engaged in sexual misconduct or harassment.',
    sanctions: 'Immediate suspension and report to authorities',
    color: 'bg-pink-200 border-pink-400 text-pink-900 dark:bg-pink-900/30 dark:border-pink-800 dark:text-pink-400'
  },
  {
    id: 'arson',
    name: 'Arson',
    offenseType: 'Property Damage',
    severity: 'Critical',
    description: 'Student intentionally set fire to property.',
    sanctions: 'Expulsion and report to authorities',
    color: 'bg-orange-200 border-orange-400 text-orange-900 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400'
  },
  {
    id: 'weapons',
    name: 'Weapons Possession',
    offenseType: 'Other',
    severity: 'Critical',
    description: 'Student was found in possession of a weapon on campus.',
    sanctions: 'Immediate expulsion and report to police',
    color: 'bg-gray-200 border-gray-400 text-gray-900 dark:bg-gray-900/30 dark:border-gray-800 dark:text-gray-400'
  },
  {
    id: 'other',
    name: 'Other',
    offenseType: 'Other',
    severity: 'Low',
    description: 'Other disciplinary issue not listed above.',
    sanctions: '',
    color: 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-900/20 dark:border-gray-700 dark:text-gray-300'
  },
];

export default function QuickCaseTemplates({ onTemplateSelect, className = "" }: QuickCaseTemplatesProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = COMMON_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTemplateClick = (template: CaseTemplate) => {
    onTemplateSelect(template);
    setShowTemplates(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setShowTemplates(!showTemplates)}
        className="w-full px-4 py-2 bg-kmuGreen text-white rounded hover:bg-kmuOrange transition flex items-center justify-center gap-2"
      >
        <span>📋</span>
        <span>Quick Templates</span>
        <span className={`transform transition-transform ${showTemplates ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {showTemplates && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-kmuGreen focus:border-transparent"
            />
          </div>

          {/* Templates List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className="p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        {template.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {template.description}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-1 rounded-full ${template.color}`}>
                          {template.severity.toUpperCase()}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {template.offenseType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                      Click to use
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No templates found matching "{searchTerm}"
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Templates auto-fill common case details. You can still edit all fields.
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showTemplates && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
} 