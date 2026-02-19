// ============================================================
// ILMSTACK HEALTH — Supabase Database Types
// Auto-derived from schema; keep in sync with migrations.
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enums ────────────────────────────────────────────────────

export type WorkspaceRole = 'admin' | 'editor' | 'contributor' | 'viewer'
export type NoteStatus = 'draft' | 'under_review' | 'approved' | 'published' | 'archived'
export type CaseStatus = 'draft' | 'published' | 'archived'
export type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'changes_requested' | 'rejected'
export type ReviewActionType =
  | 'submitted'
  | 'assigned'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'comment_added'
  | 'revision_submitted'
  | 'reopened'
export type JournalStatus = 'generating' | 'draft' | 'published' | 'archived'
export type CommentType = 'general' | 'inline' | 'review'
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'
export type WorkspacePlan = 'free' | 'starter' | 'professional' | 'enterprise'
export type ReviewPriority = 'low' | 'normal' | 'high' | 'urgent'
export type PatientGender = 'male' | 'female' | 'other' | 'not_disclosed'
export type ClinicalRole = 'intern' | 'resident' | 'senior_registrar' | 'consultant' | 'specialist' | 'other'
export type GuidelineStatus = 'draft' | 'active' | 'archived'
export type GuidelineMinEditRole = 'any_editor' | 'r3_resident_plus' | 'senior_registrar' | 'consultant_only'

// ── Row Types (exact DB representation) ──────────────────────

export interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  specialty: string | null
  title: string | null
  bio: string | null
  clinical_role: ClinicalRole
  resident_year: number | null
  created_at: string
  updated_at: string
}

export interface WorkspaceRow {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  primary_color: string
  specialties: string[]
  plan: WorkspacePlan
  settings: Json
  created_by: string
  created_at: string
  updated_at: string
}

export interface WorkspaceMemberRow {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  invited_by: string | null
  joined_at: string
}

export interface WorkspaceInvitationRow {
  id: string
  workspace_id: string
  email: string
  role: WorkspaceRole
  token: string
  status: InvitationStatus
  invited_by: string
  accepted_by: string | null
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export interface TopicRow {
  id: string
  workspace_id: string
  parent_id: string | null
  name: string
  slug: string
  description: string | null
  color: string | null
  icon: string | null
  sort_order: number
  created_by: string
  created_at: string
}

export interface TagRow {
  id: string
  workspace_id: string
  name: string
  color: string
  created_by: string
  created_at: string
}

export interface NoteRow {
  id: string
  workspace_id: string
  topic_id: string | null
  author_id: string
  title: string
  content: string
  content_html: string | null
  status: NoteStatus
  recommend_for_journal: boolean
  current_version: number
  view_count: number
  published_at: string | null
  created_at: string
  updated_at: string
  search_vector?: string // pg tsvector, not typically used in app
}

export interface NoteVersionRow {
  id: string
  note_id: string
  version_number: number
  title: string
  content: string
  changed_by: string
  change_summary: string | null
  created_at: string
}

export interface NoteAttachmentRow {
  id: string
  note_id: string
  workspace_id: string
  uploader_id: string
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
  storage_path: string
  created_at: string
}

export interface NoteCommentRow {
  id: string
  note_id: string
  workspace_id: string
  author_id: string
  parent_id: string | null
  comment_type: CommentType
  content: string
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  anchor_ref: string | null
  created_at: string
  updated_at: string
}

export interface ReviewRequestRow {
  id: string
  note_id: string
  workspace_id: string
  requested_by: string
  reviewer_id: string | null
  status: ReviewStatus
  priority: ReviewPriority
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface ReviewActionRow {
  id: string
  review_request_id: string
  workspace_id: string
  actor_id: string
  action: ReviewActionType
  note: string | null
  metadata: Json
  created_at: string
}

export interface ManagementTimelineEntry {
  date: string
  action: string
  notes: string | null
}

export interface GrowthMeasurement {
  id: string
  date: string
  age_months: number
  weight_kg: number | null
  height_cm: number | null
  head_circumference_cm: number | null
  bmi: number | null
}

export interface GrowthData {
  measurements: GrowthMeasurement[]
  parents?: {
    father_height_cm?: number
    mother_height_cm?: number
  }
  chart_type: 'who' | 'cdc'
}

export interface CaseRow {
  id: string
  workspace_id: string
  author_id: string
  topic_id: string | null
  title: string
  status: CaseStatus
  presentation: string | null
  history: string | null
  examination: string | null
  investigations: string | null
  management_timeline: ManagementTimelineEntry[]
  outcome: string | null
  learning_points: string | null
  patient_age_range: string | null
  patient_gender: PatientGender | null
  specialty: string | null
  diagnosis: string | null
  icd_codes: string[]
  growth_data: GrowthData | null
  view_count: number
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface CaseImagingRow {
  id: string
  case_id: string
  workspace_id: string
  uploader_id: string
  caption: string | null
  modality: string | null
  findings: string | null
  category: string
  file_url: string
  storage_path: string
  file_name: string
  file_size: number
  sort_order: number
  created_at: string
}

export interface JournalRow {
  id: string
  workspace_id: string
  title: string
  period_year: number
  period_month: number
  status: JournalStatus
  editorial_note: string | null
  cover_image_url: string | null
  pdf_url: string | null
  pdf_storage_path: string | null
  generated_by: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface JournalEntryRow {
  id: string
  journal_id: string
  note_id: string
  workspace_id: string
  section: string | null
  sort_order: number
  featured: boolean
  added_by: string
  created_at: string
}

export interface AuditLogRow {
  id: string
  workspace_id: string
  actor_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  metadata: Json
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface GuidelineRow {
  id: string
  workspace_id: string
  title: string
  content: string
  category: string
  specialty: string | null
  status: GuidelineStatus
  min_edit_clinical_role: GuidelineMinEditRole
  version: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface GuidelineVersionRow {
  id: string
  guideline_id: string
  version_number: number
  title: string
  content: string
  change_note: string | null
  changed_by: string
  created_at: string
}

// ── Enriched / Joined Types (app-layer) ──────────────────────

export interface Profile extends ProfileRow {}

export interface WorkspaceWithRole extends WorkspaceRow {
  role: WorkspaceRole
  member_count?: number
}

export interface WorkspaceMember extends WorkspaceMemberRow {
  profile: Profile
}

export interface Topic extends TopicRow {
  children?: Topic[]
  note_count?: number
}

export interface Tag extends TagRow {}

export interface NoteWithRelations extends NoteRow {
  author: Profile
  topic: Topic | null
  tags: Tag[]
  comment_count?: number
  latest_review?: ReviewRequestRow | null
}

export interface NoteVersion extends NoteVersionRow {
  changed_by_profile: Profile
}

export interface NoteAttachment extends NoteAttachmentRow {
  uploader: Profile
}

export interface NoteComment extends NoteCommentRow {
  author: Profile
  replies?: NoteComment[]
}

export interface ReviewRequest extends ReviewRequestRow {
  note: Pick<NoteRow, 'id' | 'title' | 'status'>
  requester: Profile
  reviewer: Profile | null
  actions?: ReviewAction[]
}

export interface ReviewAction extends ReviewActionRow {
  actor: Profile
}

export interface CaseWithRelations extends CaseRow {
  author: Profile
  topic: Topic | null
  tags: Tag[]
  imaging: CaseImagingRow[]
}

export interface JournalWithEntries extends JournalRow {
  entries: JournalEntryWithNote[]
  generator: Profile
}

export interface GuidelineWithAuthor extends GuidelineRow {
  author: Profile
  updater: Profile
}

export interface GuidelineVersionWithAuthor extends GuidelineVersionRow {
  changed_by_profile: Profile
}

export interface JournalEntryWithNote extends JournalEntryRow {
  note: NoteWithRelations
}

// ── Insert Types (for creating records) ──────────────────────

export type CreateNoteInput = {
  title: string
  content: string
  topic_id?: string | null
  tag_ids?: string[]
  recommend_for_journal?: boolean
}

export type UpdateNoteInput = Partial<CreateNoteInput> & {
  status?: NoteStatus
  content_html?: string
}

export type CreateCaseInput = {
  title: string
  topic_id?: string | null
  tag_ids?: string[]
  presentation?: string
  history?: string
  examination?: string
  investigations?: string
  management_timeline?: ManagementTimelineEntry[]
  outcome?: string
  learning_points?: string
  patient_age_range?: string
  patient_gender?: PatientGender
  specialty?: string
  diagnosis?: string
  icd_codes?: string[]
  growth_data?: GrowthData | null
}

export type UpdateCaseInput = Partial<CreateCaseInput> & {
  status?: CaseStatus
}

export type CreateJournalInput = {
  title: string
  period_year: number
  period_month: number
  editorial_note?: string
}

export type CreateGuidelineInput = {
  title: string
  content?: string
  category?: string
  specialty?: string | null
  min_edit_clinical_role?: GuidelineMinEditRole
}

export type UpdateGuidelineInput = Partial<CreateGuidelineInput> & {
  status?: GuidelineStatus
  change_note?: string | null
}

export type CreateReviewRequestInput = {
  note_id: string
  reviewer_id?: string
  priority?: ReviewPriority
  due_date?: string
}

export type CreateCommentInput = {
  note_id: string
  content: string
  comment_type?: CommentType
  parent_id?: string
  anchor_ref?: string
}

// ── Supabase Database schema definition ──────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Omit<ProfileRow, 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at'>>
      }
      workspaces: {
        Row: WorkspaceRow
        Insert: Omit<WorkspaceRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<WorkspaceRow, 'id' | 'created_at'>>
      }
      workspace_members: {
        Row: WorkspaceMemberRow
        Insert: Omit<WorkspaceMemberRow, 'id' | 'joined_at'>
        Update: Pick<WorkspaceMemberRow, 'role'>
      }
      workspace_invitations: {
        Row: WorkspaceInvitationRow
        Insert: Omit<WorkspaceInvitationRow, 'id' | 'created_at' | 'token'>
        Update: Partial<Omit<WorkspaceInvitationRow, 'id' | 'created_at'>>
      }
      topics: {
        Row: TopicRow
        Insert: Omit<TopicRow, 'id' | 'created_at'>
        Update: Partial<Omit<TopicRow, 'id' | 'workspace_id' | 'created_at'>>
      }
      tags: {
        Row: TagRow
        Insert: Omit<TagRow, 'id' | 'created_at'>
        Update: Partial<Pick<TagRow, 'name' | 'color'>>
      }
      notes: {
        Row: NoteRow
        Insert: Omit<NoteRow, 'id' | 'created_at' | 'updated_at' | 'current_version' | 'view_count' | 'search_vector'>
        Update: Partial<Omit<NoteRow, 'id' | 'workspace_id' | 'author_id' | 'created_at' | 'search_vector'>>
      }
      note_versions: {
        Row: NoteVersionRow
        Insert: Omit<NoteVersionRow, 'id' | 'created_at'>
        Update: never
      }
      note_attachments: {
        Row: NoteAttachmentRow
        Insert: Omit<NoteAttachmentRow, 'id' | 'created_at'>
        Update: never
      }
      note_comments: {
        Row: NoteCommentRow
        Insert: Omit<NoteCommentRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Pick<NoteCommentRow, 'content' | 'resolved' | 'resolved_by' | 'resolved_at'>>
      }
      review_requests: {
        Row: ReviewRequestRow
        Insert: Omit<ReviewRequestRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Pick<ReviewRequestRow, 'reviewer_id' | 'status' | 'priority' | 'due_date'>>
      }
      review_actions: {
        Row: ReviewActionRow
        Insert: Omit<ReviewActionRow, 'id' | 'created_at'>
        Update: never
      }
      cases: {
        Row: CaseRow
        Insert: Omit<CaseRow, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'search_vector'>
        Update: Partial<Omit<CaseRow, 'id' | 'workspace_id' | 'author_id' | 'created_at' | 'search_vector'>>
      }
      case_imaging: {
        Row: CaseImagingRow
        Insert: Omit<CaseImagingRow, 'id' | 'created_at'>
        Update: Partial<Pick<CaseImagingRow, 'caption' | 'sort_order' | 'findings' | 'category'>>
      }
      journals: {
        Row: JournalRow
        Insert: Omit<JournalRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<JournalRow, 'id' | 'workspace_id' | 'created_at'>>
      }
      journal_entries: {
        Row: JournalEntryRow
        Insert: Omit<JournalEntryRow, 'id' | 'created_at'>
        Update: Partial<Pick<JournalEntryRow, 'section' | 'sort_order' | 'featured'>>
      }
      audit_logs: {
        Row: AuditLogRow
        Insert: Omit<AuditLogRow, 'id' | 'created_at'>
        Update: never
      }
      guidelines: {
        Row: GuidelineRow
        Insert: Omit<GuidelineRow, 'id' | 'created_at' | 'updated_at' | 'version'>
        Update: Partial<Omit<GuidelineRow, 'id' | 'workspace_id' | 'created_by' | 'created_at'>>
      }
      guideline_versions: {
        Row: GuidelineVersionRow
        Insert: Omit<GuidelineVersionRow, 'id' | 'created_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: {
      get_workspace_role: {
        Args: { p_workspace_id: string }
        Returns: WorkspaceRole
      }
      is_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      has_workspace_role: {
        Args: { p_workspace_id: string; p_roles: WorkspaceRole[] }
        Returns: boolean
      }
      get_workspace_stats: {
        Args: { p_workspace_id: string }
        Returns: {
          notes_total: number
          notes_published: number
          notes_pending: number
          cases_total: number
          members_total: number
          journals_total: number
        }
      }
      increment_note_views: {
        Args: { p_note_id: string }
        Returns: void
      }
      increment_case_views: {
        Args: { p_case_id: string }
        Returns: void
      }
    }
    Enums: {
      workspace_role: WorkspaceRole
      note_status: NoteStatus
      case_status: CaseStatus
      review_status: ReviewStatus
      review_action_type: ReviewActionType
      journal_status: JournalStatus
      comment_type: CommentType
      invitation_status: InvitationStatus
    }
  }
}
