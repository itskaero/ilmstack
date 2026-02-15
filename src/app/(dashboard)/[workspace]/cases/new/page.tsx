import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug } from '@/services/workspace.service'
import { getTopics, getTags } from '@/services/notes.service'
import { NewCaseForm } from './new-case-form'

interface PageProps {
  params: Promise<{ workspace: string }>
}

export default async function NewCasePage({ params }: PageProps) {
  const { workspace: slug } = await params

  const supabase = await createClient()
  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) return null

  const [topics, tags] = await Promise.all([
    getTopics(supabase, workspace.id),
    getTags(supabase, workspace.id),
  ])

  return (
    <div className="flex flex-col h-full">
      <NewCaseForm
        workspaceId={workspace.id}
        workspaceSlug={slug}
        topics={topics}
        tags={tags}
      />
    </div>
  )
}
