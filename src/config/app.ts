// ============================================================
// ILMSTACK HEALTH — Application Constants
// ============================================================

export const APP_CONFIG = {
  name: 'Clinical Ledger',
  shortName: 'Clinical Ledger',
  description: 'Clinical knowledge platform for hospitals',
  version: '1.0.0',
} as const

export const ROUTES = {
  // Auth
  login: '/login',
  register: '/register',
  magicLink: '/magic-link',
  acceptInvitation: '/accept-invitation',

  // Workspace creation
  newWorkspace: '/workspace/new',

  // Dashboard (workspace-scoped)
  dashboard: (slug: string) => `/${slug}`,
  notes: (slug: string) => `/${slug}/notes`,
  noteDetail: (slug: string, noteId: string) => `/${slug}/notes/${noteId}`,
  newNote: (slug: string) => `/${slug}/notes/new`,
  cases: (slug: string) => `/${slug}/cases`,
  caseDetail: (slug: string, caseId: string) => `/${slug}/cases/${caseId}`,
  newCase: (slug: string) => `/${slug}/cases/new`,
  guidelines: (slug: string) => `/${slug}/guidelines`,
  guidelineDetail: (slug: string, guidelineId: string) => `/${slug}/guidelines/${guidelineId}`,
  newGuideline: (slug: string) => `/${slug}/guidelines/new`,
  review: (slug: string) => `/${slug}/review`,
  journal: (slug: string) => `/${slug}/journal`,
  journalDetail: (slug: string, journalId: string) => `/${slug}/journal/${journalId}`,
  settings: (slug: string) => `/${slug}/settings`,
  settingsMembers: (slug: string) => `/${slug}/settings/members`,
  settingsBranding: (slug: string) => `/${slug}/settings/branding`,
  settingsAudit: (slug: string) => `/${slug}/settings/audit`,
  profile: (slug: string, userId: string) => `/${slug}/profile/${userId}`,
} as const

export const STORAGE_BUCKETS = {
  noteAttachments: 'note-attachments',
  caseImaging: 'case-imaging',
  journalCovers: 'journal-covers',
  journalPdfs: 'journal-pdfs',
  workspaceAssets: 'workspace-assets',
  avatars: 'avatars',
} as const

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
} as const

export const NOTE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  under_review: 'Under Review',
  approved: 'Approved',
  published: 'Published',
  archived: 'Archived',
} as const

export const CASE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
} as const

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  approved: 'Approved',
  changes_requested: 'Changes Requested',
  rejected: 'Rejected',
} as const

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  editor: 'Editor',
  contributor: 'Contributor',
  viewer: 'Viewer',
} as const

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full access including workspace settings and member management',
  editor: 'Can review, approve, and publish content',
  contributor: 'Can create and edit their own notes and cases',
  viewer: 'Read-only access to published content',
} as const

export const INVESTIGATION_CATEGORIES = [
  { value: 'lab_results', label: 'Lab Results' },
  { value: 'radiology', label: 'Radiology' },
  { value: 'clinical_photos', label: 'Clinical Photos' },
  { value: 'ecg_other', label: 'ECG / Other' },
] as const

export type InvestigationCategory = (typeof INVESTIGATION_CATEGORIES)[number]['value']

export const IMAGING_MODALITIES = [
  'XR',
  'CT',
  'MRI',
  'US',
  'ECG',
  'PET',
  'SPECT',
  'Fluoroscopy',
  'Endoscopy',
  'Pathology',
  'Other',
] as const

export const MEDICAL_SPECIALTIES = [
  'Anaesthesiology',
  'Cardiology',
  'Cardiothoracic Surgery',
  'Dermatology',
  'Emergency Medicine',
  'Endocrinology',
  'Gastroenterology',
  'General Surgery',
  'Gynaecology',
  'Haematology',
  'Infectious Diseases',
  'Internal Medicine',
  'Nephrology',
  'Neurology',
  'Neurosurgery',
  'Obstetrics',
  'Oncology',
  'Ophthalmology',
  'Orthopaedics',
  'Otorhinolaryngology',
  'Paediatrics',
  'Palliative Care',
  'Pathology',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Rheumatology',
  'Urology',
  'Vascular Surgery',
  'Other',
] as const

export type ImagingModality = (typeof IMAGING_MODALITIES)[number]
export type MedicalSpecialty = (typeof MEDICAL_SPECIALTIES)[number]

export const GUIDELINE_CATEGORIES = [
  { value: 'antibiotic', label: 'Antibiotic Guidelines' },
  { value: 'management', label: 'Disease Management' },
  { value: 'protocol', label: 'Clinical Protocol' },
  { value: 'dosing', label: 'Dosing Reference' },
  { value: 'nursing', label: 'Nursing Protocol' },
  { value: 'general', label: 'General' },
] as const

export const CLINICAL_ROLES = [
  { value: 'intern', label: 'Intern' },
  { value: 'resident', label: 'Resident' },
  { value: 'senior_registrar', label: 'Senior Registrar' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'other', label: 'Other' },
] as const

export const GUIDELINE_MIN_EDIT_ROLES = [
  { value: 'any_editor', label: 'Any Editor' },
  { value: 'r3_resident_plus', label: 'R3+ Resident or above' },
  { value: 'senior_registrar', label: 'Senior Registrar or above' },
  { value: 'consultant_only', label: 'Consultant / Specialist only' },
] as const

export const RESIDENT_YEARS = [1, 2, 3, 4, 5] as const
