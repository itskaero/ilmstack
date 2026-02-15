import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getMemberRole } from '@/services/workspace.service'
import { getJournalById, getEligibleNotes } from '@/services/journals.service'
import { JournalDetailClient } from './journal-detail-client'
import type { Profile } from '@/types'

interface PageProps {
  params: Promise<{ workspace: string; journalId: string }>
}

export default async function JournalDetailPage({ params }: PageProps) {
  const { workspace: slug, journalId } = await params
  const supabase = await createClient()

  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const role = await getMemberRole(supabase, workspace.id, user.id)
  if (!role) notFound()

  const journal = await getJournalById(supabase, journalId, workspace.id)
  if (!journal) notFound()

  // Get eligible notes for the "Add Notes" dialog
  const eligibleNotes = await getEligibleNotes(
    supabase,
    workspace.id,
    journal.period_year,
    journal.period_month
  )

  // Filter out notes already in the journal
  const entryNoteIds = new Set(journal.entries.map((e) => e.note_id))
  const availableNotes = eligibleNotes.filter((n: any) => !entryNoteIds.has(n.id))

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    .returns<Profile>()

  return (
    <JournalDetailClient
      journal={journal as any}
      workspace={workspace}
      role={role}
      availableNotes={availableNotes}
    />
  )
}
