/**
 * Default modular reporting form schemas.
 * Institutions can override via admin system settings or PUT /api/v1/form-schemas.
 */

export const DEFAULT_INSTITUTION_CONFIG = {
  institutionId: "default",
  institutionName: "Campus Reports",
  version: 1,
  portal: {
    enabled: true,
    allowedEmbedOrigins: [],
    embedTitle: "Report an Issue",
    embedSubtitle: "Submit confidentially through your institution portal.",
  },
  forms: {
    anonymous_report: {
      formType: "anonymous_report",
      categories: [
        {
          id: "disciplinary_case",
          label: "Disciplinary Issue",
          description:
            "Misconduct, harassment, theft, bullying, violence, or other behaviour that needs formal review.",
          icon: "alert-triangle",
          color: "rose",
          fields: [
            {
              id: "peopleInvolved",
              type: "text",
              label: "People Involved",
              placeholder: "Names or descriptions (no personal identifiers for yourself)",
              required: false,
            },
            {
              id: "witnesses",
              type: "text",
              label: "Witnesses",
              placeholder: "Anyone who saw what happened",
              required: false,
            },
            {
              id: "riskLevel",
              type: "select",
              label: "Risk Level",
              required: false,
              options: ["Low", "Medium", "High", "Immediate threat"],
              defaultValue: "Medium",
            },
          ],
        },
        {
          id: "maintenance_issue",
          label: "Maintenance Issue",
          description:
            "Damaged classrooms, broken equipment, lighting issues, leaks, or safety hazards around campus.",
          icon: "wrench",
          color: "amber",
          fields: [
            {
              id: "issueType",
              type: "select",
              label: "Issue Type",
              required: false,
              options: [
                "Electrical",
                "Plumbing",
                "Furniture or fittings",
                "Cleaning or sanitation",
                "IT or classroom equipment",
                "Building safety hazard",
                "Other",
              ],
              defaultValue: "Electrical",
            },
            {
              id: "priority",
              type: "select",
              label: "Priority",
              required: false,
              options: ["Low", "Normal", "High", "Urgent safety risk"],
              defaultValue: "Normal",
            },
            {
              id: "affectedAsset",
              type: "text",
              label: "Affected Asset",
              placeholder: "e.g. Projector, leaking sink",
              required: false,
            },
            {
              id: "accessInstructions",
              type: "text",
              label: "Access or Timing Notes",
              placeholder: "When staff can access the area",
              required: false,
            },
          ],
        },
        {
          id: "other",
          label: "Other / General",
          description: "Any other concern that does not fit the above categories.",
          icon: "megaphone",
          color: "blue",
          fields: [],
        },
      ],
      commonFields: [
        {
          id: "title",
          type: "text",
          label: "Report Title",
          placeholder: "Brief title for the issue",
          required: true,
          mapsTo: "core",
        },
        {
          id: "location",
          type: "text",
          label: "Location",
          placeholder: "Building, block, classroom, hostel...",
          required: true,
          mapsTo: "core",
        },
        {
          id: "incident_date",
          type: "date",
          label: "Date of Incident",
          required: true,
          mapsTo: "core",
        },
        {
          id: "description",
          type: "textarea",
          label: "Full Description",
          placeholder:
            "Describe what happened in detail. Do NOT include your own personal information.",
          required: true,
          minLength: 10,
          rows: 5,
          mapsTo: "core",
        },
        {
          id: "contact_email",
          type: "email",
          label: "Contact Email",
          placeholder: "Only if you want to receive updates",
          required: false,
          mapsTo: "core",
        },
      ],
    },
    student_report: {
      formType: "student_report",
      categories: [
        {
          id: "disciplinary_case",
          label: "Disciplinary Case",
          description:
            "Misconduct, harassment, theft, intimidation, violence, or other behavior that needs formal review.",
          icon: "shield-alert",
          color: "rose",
          fields: [
            {
              id: "peopleInvolved",
              type: "text",
              label: "People Involved",
              placeholder: "Names or descriptions of people involved",
              required: false,
            },
            {
              id: "witnesses",
              type: "text",
              label: "Witnesses",
              placeholder: "Anyone who witnessed the incident",
              required: false,
            },
            {
              id: "riskLevel",
              type: "select",
              label: "Risk Level",
              required: false,
              options: ["Low", "Medium", "High", "Immediate threat"],
              defaultValue: "Medium",
            },
            {
              id: "securityAction",
              type: "textarea",
              label: "Immediate Action Taken",
              placeholder: "Any action already taken on scene",
              required: false,
              rows: 2,
            },
            {
              id: "studentInvolved",
              type: "toggle",
              label: "Learner/Student Involved",
              helpText:
                "Turn on for learner misconduct that should be reviewed by the Dean of Students.",
              required: false,
              mapsTo: "student_involved",
            },
          ],
        },
        {
          id: "maintenance_issue",
          label: "Maintenance Issue",
          description:
            "Damaged classrooms, broken equipment, lighting issues, leaks, or safety hazards around campus.",
          icon: "wrench",
          color: "amber",
          fields: [
            {
              id: "issueType",
              type: "select",
              label: "Maintenance Issue Type",
              required: false,
              options: [
                "Electrical",
                "Plumbing",
                "Furniture or fittings",
                "Cleaning or sanitation",
                "IT or classroom equipment",
                "Building safety hazard",
                "Other",
              ],
              defaultValue: "Electrical",
            },
            {
              id: "priority",
              type: "select",
              label: "Priority",
              required: false,
              options: ["Low", "Normal", "High", "Urgent safety risk"],
              defaultValue: "Normal",
            },
            {
              id: "affectedAsset",
              type: "text",
              label: "Affected Asset",
              placeholder: "e.g. Projector",
              required: false,
            },
            {
              id: "accessInstructions",
              type: "text",
              label: "Access or Timing Notes",
              placeholder: "When staff can access the area",
              required: false,
            },
          ],
        },
      ],
      commonFields: [
        {
          id: "title",
          type: "text",
          label: "Report Title",
          placeholder: "Briefly describe the issue",
          required: true,
          mapsTo: "core",
        },
        {
          id: "location",
          type: "text",
          label: "Location",
          placeholder: "Hostel, classroom, lab, walkway, or building",
          required: true,
          mapsTo: "core",
        },
        {
          id: "incident_date",
          type: "date",
          label: "Date of Incident or Observation",
          required: true,
          mapsTo: "core",
        },
        {
          id: "description",
          type: "textarea",
          label: "Full Description",
          placeholder: "Describe what happened in detail",
          required: true,
          rows: 6,
          mapsTo: "core",
        },
      ],
    },
  },
};

export function getDefaultFormSchema(formType) {
  return DEFAULT_INSTITUTION_CONFIG.forms[formType] || null;
}

export function getDefaultCategoryIds(formType) {
  const form = getDefaultFormSchema(formType);
  return form ? form.categories.map((category) => category.id) : [];
}
