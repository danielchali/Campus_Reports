export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export const OFFENSE_TYPES = [
  {
    value: 'Malpractice',
    label: 'Malpractice',
    description: 'Cheating, plagiarism, unauthorized collaboration, or other academic integrity violations'
  },
  {
    value: 'Fighting',
    label: 'Fighting',
    description: 'Physical altercations, assault, or violent behavior on campus'
  },
  {
    value: 'Disruptive Behavior',
    label: 'Disruptive Behavior',
    description: 'Classroom disruption, noise violations, or behavior that interferes with learning'
  },
  {
    value: 'Substance Abuse',
    label: 'Substance Abuse',
    description: 'Alcohol, drugs, or other controlled substances on campus'
  },
  {
    value: 'Harassment',
    label: 'Harassment',
    description: 'Bullying, sexual harassment, or discriminatory behavior'
  },
  {
    value: 'Property Damage',
    label: 'Property Damage',
    description: 'Vandalism, destruction of school property, or unauthorized use of facilities'
  },
  {
    value: 'Theft',
    label: 'Theft',
    description: 'Stealing, unauthorized possession of others\' property'
  },
  {
    value: 'Truancy',
    label: 'Truancy',
    description: 'Unexcused absences, skipping classes, or leaving campus without permission'
  },
  {
    value: 'Dress Code Violation',
    label: 'Dress Code Violation',
    description: 'Inappropriate attire or failure to follow dress code policies'
  },
  {
    value: 'Technology Misuse',
    label: 'Technology Misuse',
    description: 'Unauthorized computer use, cyberbullying, or inappropriate online behavior'
  },
  {
    value: 'Other',
    label: 'Other',
    description: 'Any other disciplinary violation not covered by the above categories'
  }
];

export const SEVERITY_LEVELS = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' }
];

export const CASE_STATUSES = [
  { value: 'Open', label: 'Open' },
  { value: 'Under Investigation', label: 'Under Investigation' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Appealed', label: 'Appealed' }
]; 