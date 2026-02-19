// ============================================================
// ILMSTACK HEALTH — Centralized Type Exports
// ============================================================

export * from './database'

// ── API Response Types ────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    message: string
    code?: string
    details?: unknown
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ── Pagination ────────────────────────────────────────────────

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

// ── Filter Types ──────────────────────────────────────────────

export interface NoteFilters {
  status?: import('./database').NoteStatus[]
  topic_id?: string
  tag_ids?: string[]
  author_id?: string
  recommend_for_journal?: boolean
  search?: string
}

export interface CaseFilters {
  status?: import('./database').CaseStatus[]
  topic_id?: string
  tag_ids?: string[]
  author_id?: string
  specialty?: string
  diagnosis?: string
  search?: string
}

export interface ReviewFilters {
  status?: import('./database').ReviewStatus[]
  reviewer_id?: string
  priority?: import('./database').ReviewPriority
}

// ── UI State Types ────────────────────────────────────────────

export interface WorkspaceContextValue {
  workspace: import('./database').WorkspaceRow
  role: import('./database').WorkspaceRole
  members: import('./database').WorkspaceMember[]
}

export interface UserContextValue {
  user: import('@supabase/supabase-js').User
  profile: import('./database').Profile
}

// ── File Upload ───────────────────────────────────────────────

export interface UploadedFile {
  url: string
  storage_path: string
  file_name: string
  file_size: number
  mime_type: string
}

export interface UploadOptions {
  bucket: StorageBucket
  folder: string
  maxSizeMB?: number
  allowedTypes?: string[]
}

export type StorageBucket =
  | 'note-attachments'
  | 'case-imaging'
  | 'journal-covers'
  | 'journal-pdfs'
  | 'workspace-assets'
  | 'avatars'
  | 'workspace-logos'

// ── Navigation ────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string
  href?: string
}

// ── Workspace Settings ────────────────────────────────────────

export interface WorkspaceSettings {
  allow_public_journal?: boolean
  require_review_for_publish?: boolean
  auto_journal_generation?: boolean
  notification_email?: string
}
