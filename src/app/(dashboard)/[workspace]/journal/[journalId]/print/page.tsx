import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug } from '@/services/workspace.service'
import { getJournalById } from '@/services/journals.service'
import { PrintView } from './print-view'

interface PageProps {
  params: Promise<{ workspace: string; journalId: string }>
}

export default async function JournalPrintPage({ params }: PageProps) {
  const { workspace: slug, journalId } = await params
  const supabase = await createClient()

  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) notFound()

  const journal = await getJournalById(supabase, journalId, workspace.id)
  if (!journal) notFound()

  return (
    <PrintView
      journal={journal as any}
      workspaceName={workspace.name}
    />
  )
}
