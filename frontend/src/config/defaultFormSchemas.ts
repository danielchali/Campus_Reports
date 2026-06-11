import type { InstitutionFormConfig, ReportFormSchema } from '../types/formSchema';

export const DEFAULT_ANONYMOUS_REPORT_SCHEMA: ReportFormSchema = {
  formType: 'anonymous_report',
  categories: [
    {
      id: 'disciplinary_case',
      label: 'Disciplinary Issue',
      description:
        'Misconduct, harassment, theft, bullying, violence, or other behaviour that needs formal review.',
      icon: 'alert-triangle',
      color: 'rose',
      fields: [
        { id: 'peopleInvolved', type: 'text', label: 'People Involved', required: false },
        { id: 'witnesses', type: 'text', label: 'Witnesses', required: false },
        {
          id: 'riskLevel',
          type: 'select',
          label: 'Risk Level',
          options: ['Low', 'Medium', 'High', 'Immediate threat'],
          defaultValue: 'Medium',
        },
      ],
    },
    {
      id: 'maintenance_issue',
      label: 'Maintenance Issue',
      description:
        'Damaged classrooms, broken equipment, lighting issues, leaks, or safety hazards around campus.',
      icon: 'wrench',
      color: 'amber',
      fields: [
        {
          id: 'issueType',
          type: 'select',
          label: 'Issue Type',
          options: [
            'Electrical',
            'Plumbing',
            'Furniture or fittings',
            'Cleaning or sanitation',
            'IT or classroom equipment',
            'Building safety hazard',
            'Other',
          ],
          defaultValue: 'Electrical',
        },
        {
          id: 'priority',
          type: 'select',
          label: 'Priority',
          options: ['Low', 'Normal', 'High', 'Urgent safety risk'],
          defaultValue: 'Normal',
        },
        {
          id: 'affectedAsset',
          type: 'text',
          label: 'Affected Room, Fixture, or Asset',
          required: false,
        },
        {
          id: 'accessInstructions',
          type: 'text',
          label: 'Access or Timing Notes',
          required: false,
        },
      ],
    },
    {
      id: 'other',
      label: 'Other / General',
      description: 'Any other concern that does not fit the above categories.',
      icon: 'megaphone',
      color: 'blue',
      fields: [],
    },
  ],
  commonFields: [
    {
      id: 'title',
      type: 'text',
      label: 'Report Title',
      placeholder: 'Brief title for the issue',
      required: true,
      mapsTo: 'core',
    },
    {
      id: 'location',
      type: 'text',
      label: 'Location',
      placeholder: 'Building, block, classroom, hostel...',
      required: true,
      mapsTo: 'core',
    },
    {
      id: 'incident_date',
      type: 'date',
      label: 'Date of Incident',
      required: true,
      mapsTo: 'core',
    },
    {
      id: 'description',
      type: 'textarea',
      label: 'Full Description',
      required: true,
      minLength: 10,
      rows: 5,
      mapsTo: 'core',
    },
    {
      id: 'contact_email',
      type: 'email',
      label: 'Contact Email',
      placeholder: 'Only if you want to receive updates',
      required: false,
      mapsTo: 'core',
    },
  ],
};

export const DEFAULT_STUDENT_REPORT_SCHEMA: ReportFormSchema = {
  formType: 'student_report',
  categories: [
    {
      id: 'disciplinary_case',
      label: 'Disciplinary Case',
      description:
        'Misconduct, harassment, theft, intimidation, violence, or other behavior that needs formal review.',
      icon: 'shield-alert',
      color: 'rose',
      fields: [
        { id: 'peopleInvolved', type: 'text', label: 'People Involved', required: false },
        { id: 'witnesses', type: 'text', label: 'Witnesses', required: false },
        {
          id: 'riskLevel',
          type: 'select',
          label: 'Risk Level',
          options: ['Low', 'Medium', 'High', 'Immediate threat'],
          defaultValue: 'Medium',
        },
        {
          id: 'securityAction',
          type: 'textarea',
          label: 'Immediate Action Taken',
          rows: 2,
          required: false,
        },
        {
          id: 'studentInvolved',
          type: 'toggle',
          label: 'Learner/Student Involved',
          mapsTo: 'student_involved',
          required: false,
        },
      ],
    },
    {
      id: 'maintenance_issue',
      label: 'Maintenance Issue',
      description:
        'Damaged classrooms, broken equipment, lighting issues, leaks, or safety hazards around campus.',
      icon: 'wrench',
      color: 'amber',
      fields: [
        {
          id: 'issueType',
          type: 'select',
          label: 'Maintenance Issue Type',
          options: [
            'Electrical',
            'Plumbing',
            'Furniture or fittings',
            'Cleaning or sanitation',
            'IT or classroom equipment',
            'Building safety hazard',
            'Other',
          ],
          defaultValue: 'Electrical',
        },
        {
          id: 'priority',
          type: 'select',
          label: 'Priority',
          options: ['Low', 'Normal', 'High', 'Urgent safety risk'],
          defaultValue: 'Normal',
        },
        { id: 'affectedAsset', type: 'text', label: 'Affected Room, Fixture, or Asset', required: false },
        { id: 'accessInstructions', type: 'text', label: 'Access or Timing Notes', required: false },
      ],
    },
  ],
  commonFields: [
    {
      id: 'title',
      type: 'text',
      label: 'Report Title',
      required: true,
      mapsTo: 'core',
    },
    {
      id: 'location',
      type: 'text',
      label: 'Location',
      required: true,
      mapsTo: 'core',
    },
    {
      id: 'incident_date',
      type: 'date',
      label: 'Date of Incident or Observation',
      required: true,
      mapsTo: 'core',
    },
    {
      id: 'description',
      type: 'textarea',
      label: 'Full Description',
      required: true,
      rows: 6,
      mapsTo: 'core',
    },
  ],
};

export function getFallbackFormSchema(formType: 'anonymous_report' | 'student_report'): ReportFormSchema {
  return formType === 'student_report'
    ? DEFAULT_STUDENT_REPORT_SCHEMA
    : DEFAULT_ANONYMOUS_REPORT_SCHEMA;
}

export const DEFAULT_PORTAL_CONFIG: InstitutionFormConfig['portal'] = {
  enabled: true,
  allowedEmbedOrigins: [],
  embedTitle: 'Report an Issue',
  embedSubtitle: 'Submit confidentially through your institution portal.',
  institutionName: 'Campus Reports',
};
