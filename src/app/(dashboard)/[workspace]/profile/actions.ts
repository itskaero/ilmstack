'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const full_name = (formData.get('full_name') as string)?.trim() || null
  const title = (formData.get('title') as string)?.trim() || null
  const specialty = (formData.get('specialty') as string)?.trim() || null
  const bio = (formData.get('bio') as string)?.trim() || null
  const slug = formData.get('slug') as string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ full_name, title, specialty, bio, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }

  if (slug) {
    revalidatePath(`/${slug}/profile/${user.id}`)
  }

  return { success: true }
}
