import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getWorkspaceStats } from '@/services/workspace.service'
import { notFound } from 'next/navigation'
import { WorkspaceDashboard } from './workspace-dashboard'
import type { WorkspaceStats } from '@/services/workspace.service'
import type { NoteRow, CaseRow, ReviewRequestRow, WorkspaceRole } from '@/types'

interface Props {
  params: Promise<{ workspace: string }>
}

export default async function WorkspaceHomePage({ params }: Props) {
  const { workspace: slug } = await params
  const supabase = await createClient()

  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) notFound()

  // Parallel data fetching
  const [stats, recentNotes, recentCases, pendingReviews] = await Promise.all([
    getWorkspaceStats(supabase, workspace.id),

    supabase
      .from('notes')
      .select('id, title, status, created_at, updated_at, author_id')
      .eq('workspace_id', workspace.id)
      .order('updated_at', { ascending: false })
      .limit(5)
      .returns<Pick<NoteRow, 'id' | 'title' | 'status' | 'created_at' | 'updated_at' | 'author_id'>[]>()
      .then(({ data }) => data ?? []),

    supabase
      .from('cases')
      .select('id, title, status, specialty, diagnosis, created_at')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<Pick<CaseRow, 'id' | 'title' | 'status' | 'specialty' | 'diagnosis' | 'created_at'>[]>()
      .then(({ data }) => data ?? []),

    supabase
      .from('review_requests')
      .select('id, note_id, status, priority, created_at, reviewer_id')
      .eq('workspace_id', workspace.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<Pick<ReviewRequestRow, 'id' | 'note_id' | 'status' | 'priority' | 'created_at' | 'reviewer_id'>[]>()
      .then(({ data }) => data ?? []),
  ])

  return (
    <WorkspaceDashboard
      workspace={workspace}
      stats={stats}
      recentNotes={recentNotes}
      recentCases={recentCases}
      pendingReviews={pendingReviews}
    />
  )
}
