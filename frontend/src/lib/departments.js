// Single source of truth for SRM departments/faculties, shared by the signup
// form (a person belongs to exactly one) and the document upload form. Keeping
// both in sync makes the department-based answer gating reliable.
export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Science & Humanities',
  'Engineering & Technology',
  'Management',
  'Medicine & Health Sciences',
  'Law',
  'Agriculture'
];

// Documents can also target everyone, so the upload dropdown adds "All / General".
export const DOCUMENT_DEPARTMENTS = ['All / General', ...DEPARTMENTS];
