'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function uploadAvatarAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('avatar') as File | null
  if (!file || file.size === 0) return { error: 'No file provided' }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) return { error: 'Only JPEG, PNG or WebP images are allowed' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Image must be smaller than 2 MB' }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${user.id}/${Date.now()}.${ext}`

  // Delete any existing avatar files for this user
  const { data: existing } = await supabase.storage.from('avatars').list(user.id)
  if (existing && existing.length > 0) {
    await supabase.storage.from('avatars').remove(existing.map((f) => `${user.id}/${f.name}`))
  }

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(storagePath, file, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(storagePath)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (supabase as any)
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (dbError) return { error: dbError.message }

  const slug = formData.get('slug') as string | null
  if (slug) revalidatePath(`/${slug}/profile/${user.id}`)

  return { url: publicUrl }
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const full_name = (formData.get('full_name') as string)?.trim() || null
  const title = (formData.get('title') as string)?.trim() || null
  const specialty = (formData.get('specialty') as string)?.trim() || null
  const bio = (formData.get('bio') as string)?.trim() || null
  const clinical_role = (formData.get('clinical_role') as string)?.trim() || 'other'
  const residentYearRaw = formData.get('resident_year')
  const resident_year = residentYearRaw ? parseInt(residentYearRaw as string, 10) || null : null
  const slug = formData.get('slug') as string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ full_name, title, specialty, bio, clinical_role, resident_year, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }

  if (slug) {
    revalidatePath(`/${slug}/profile/${user.id}`)
  }

  return { success: true }
}
