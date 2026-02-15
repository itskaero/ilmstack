'use server'

import { createClient } from '@/lib/supabase/server'
import { createWorkspace } from '@/services/workspace.service'

type Result =
  | { slug: string; error: null }
  | { slug: null; error: string }

export async function createWorkspaceAction(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { slug: null, error: 'You must be signed in to create a workspace.' }
  }

  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || undefined

  if (!name || !slug) {
    return { slug: null, error: 'Name and URL are required.' }
  }

  const { workspace, error } = await createWorkspace(supabase, {
    name,
    slug,
    description,
    userId: user.id,
  })

  if (error || !workspace) {
    return { slug: null, error: error ?? 'Failed to create workspace.' }
  }

  return { slug: workspace.slug, error: null }
}
