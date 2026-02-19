import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceBySlug, getMemberRole } from '@/services/workspace.service'
import { NewGuidelineForm } from './new-guideline-form'
import { ROUTES } from '@/config/app'

interface PageProps {
  params: Promise<{ workspace: string }>
}

export default async function NewGuidelinePage({ params }: PageProps) {
  const { workspace: slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const workspace = await getWorkspaceBySlug(supabase, slug)
  if (!workspace) redirect('/')

  const role = await getMemberRole(supabase, workspace.id, user.id)
  if (role !== 'admin' && role !== 'editor') {
    redirect(ROUTES.guidelines(slug))
  }

  return (
    <div className="flex flex-col h-full">
      <NewGuidelineForm workspaceId={workspace.id} workspaceSlug={slug} />
    </div>
  )
}
