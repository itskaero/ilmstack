'use server'

// ============================================================
// ILMSTACK HEALTH — Auth Server Actions
// ============================================================

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  loginSchema,
  registerSchema,
  magicLinkSchema,
} from '@/lib/validations/auth'
import type {
  WorkspaceInvitationRow,
  WorkspaceMemberRow,
  WorkspaceRow,
} from '@/types'

type ActionResult = { error: string } | { success: true }

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/home')
}

export async function registerAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    full_name: formData.get('full_name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirm_password: formData.get('confirm_password') as string,
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const emailRedirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo,
    },
  })

  if (error) return { error: error.message }

  redirect('/login?message=Check+your+email+to+confirm+your+account.')
}

export async function magicLinkAction(formData: FormData): Promise<ActionResult> {
  const raw = { email: formData.get('email') as string }

  const parsed = magicLinkSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (error) return { error: error.message }

  return { success: true }
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function acceptInvitationAction(
  token: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: invData } = await supabase
    .from('workspace_invitations')
    .select('id, workspace_id, email, role, invited_by, status, expires_at')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .returns<Pick<WorkspaceInvitationRow, 'id' | 'workspace_id' | 'email' | 'role' | 'invited_by' | 'status' | 'expires_at'>[]>()

  const invitation = invData?.[0]
  if (!invitation) return { error: 'Invalid or expired invitation link.' }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const raw = {
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirm_password: formData.get('confirm_password') as string,
    }

    const parsed = registerSchema.safeParse(raw)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    if (parsed.data.email !== invitation.email) {
      return { error: `This invitation was sent to ${invitation.email}.` }
    }

    const emailRedirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
    const { error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.full_name },
        emailRedirectTo,
      },
    })

    if (signUpError) return { error: signUpError.message }
  }

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) return { error: 'Authentication failed. Please try again.' }

  // Use admin client to bypass RLS — user is not yet a member so
  // workspace_members_insert_admin policy would block them
  const adminClient = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memberError } = await (adminClient.from('workspace_members') as any).upsert({
    workspace_id: invitation.workspace_id,
    user_id: currentUser.id,
    role: invitation.role,
    invited_by: invitation.invited_by,
  })

  if (memberError) return { error: 'Failed to join workspace.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient.from('workspace_invitations') as any).update({
    status: 'accepted',
    accepted_by: currentUser.id,
    accepted_at: new Date().toISOString(),
  }).eq('id', invitation.id)

  const { data: wsData } = await supabase
    .from('workspaces')
    .select('slug')
    .eq('id', invitation.workspace_id)
    .limit(1)
    .returns<Pick<WorkspaceRow, 'slug'>[]>()

  revalidatePath('/', 'layout')
  redirect(wsData?.[0]?.slug ? `/${wsData[0].slug}` : '/home')
}
