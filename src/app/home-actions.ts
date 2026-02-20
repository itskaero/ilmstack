'use server'

import { createClient } from '@/lib/supabase/server'

export async function searchWorkspacesAction(query: string, excludeIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { workspaces: [] }

  const trimmed = query.trim()
  if (trimmed.length < 2) return { workspaces: [] }

  let q = supabase
    .from('workspaces')
    .select('id, name, slug, description, logo_url, primary_color, specialties')
    .or(`name.ilike.%${trimmed}%,slug.ilike.%${trimmed}%`)
    .limit(6)

  // Exclude workspaces the user already belongs to
  if (excludeIds.length > 0) {
    q = q.not('id', 'in', `(${excludeIds.map((id) => `"${id}"`).join(',')})`)
  }

  const { data } = await q
  return { workspaces: data ?? [] }
}
