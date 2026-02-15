import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getMemberRole } from '@/services/workspace.service'
import {
  getNoteById,
  getNoteVersions,
  getNoteComments,
  getTopics,
  getTags,
} from '@/services/notes.service'
import { NoteDetailClient } from './note-detail-client'

interface PageProps {
  params: Promise<{ workspace: string; noteId: string }>
}

export default async function NoteDetailPage({ params }: PageProps) {
  const { workspace: slug, noteId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) notFound()

  const role = await getMemberRole(supabase, workspace.id, user.id)
  if (!role) notFound()

  const [note, versions, comments, topics, tags, profileData] = await Promise.all([
    getNoteById(supabase, noteId, workspace.id),
    getNoteVersions(supabase, noteId, workspace.id),
    getNoteComments(supabase, noteId, workspace.id),
    getTopics(supabase, workspace.id),
    getTags(supabase, workspace.id),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!note) notFound()

  const currentUser = profileData.data

  // Increment view count asynchronously (fire and forget)
  ;(supabase.rpc as any)('increment_note_views', { p_note_id: noteId }).then(() => {})

  return (
    <NoteDetailClient
      note={note}
      versions={versions}
      comments={comments}
      topics={topics}
      tags={tags}
      workspaceSlug={slug}
      workspaceId={workspace.id}
      currentUser={currentUser!}
      role={role}
    />
  )
}
