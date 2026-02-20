import type { WorkspaceRole } from '@/types'

export interface HomeProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string
  title: string | null
}

export interface WorkspaceWithRole {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  primary_color: string
  specialties: string[]
  role: WorkspaceRole
}

export interface ActivityItem {
  id: string
  type: 'note' | 'case' | 'guideline'
  title: string
  workspaceId: string
  workspaceSlug: string
  workspaceName: string
  date: string
  status?: string
  specialty?: string | null
}
