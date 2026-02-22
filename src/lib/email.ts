// ============================================================
// ILMSTACK HEALTH — Email Utilities
//
// Priority:
//   1. Resend      — if RESEND_API_KEY is set in env
//   2. Supabase    — falls back to Supabase's own email
//                    infrastructure (auth.admin.inviteUserByEmail).
//                    Works for new users; existing Supabase users
//                    get a console warning with the manual link.
// ============================================================

import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'

const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'IlmStack Health <noreply@ilmstack.health>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── Workspace Invitation ──────────────────────────────────────────────────

interface SendInvitationEmailParams {
  to: string
  inviterName: string
  workspaceName: string
  role: string
  token: string
}

export async function sendInvitationEmail({
  to,
  inviterName,
  workspaceName,
  role,
  token,
}: SendInvitationEmailParams): Promise<{ error: string | null }> {
  const acceptUrl = `${APP_URL}/accept-invitation?token=${token}`

  // ── Primary: Resend ──────────────────────────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `You've been invited to join ${workspaceName} on IlmStack Health`,
      html: buildInvitationHtml({ inviterName, workspaceName, role, acceptUrl }),
      text: buildInvitationText({ inviterName, workspaceName, role, acceptUrl }),
    })

    if (error) {
      console.error('[Email] Resend failed:', error)
      return { error: error.message }
    }

    return { error: null }
  }

  // ── Fallback: Supabase built-in email ────────────────────────────────────
  // Uses Supabase's own email infrastructure — either its default SMTP or a
  // custom SMTP configured in the Supabase dashboard under Auth > SMTP.
  //
  // Limitation: inviteUserByEmail only works for users who do not yet have a
  // Supabase auth account. For existing users it will return an error, but the
  // invitation record is always saved to the DB, so the admin can share the
  // accept link manually.
  const admin = createAdminClient()

  // Route through the auth callback so PKCE code exchange happens and a
  // session is established before landing on the accept-invitation page.
  const callbackUrl =
    `${APP_URL}/api/auth/callback?next=${encodeURIComponent('/accept-invitation?token=' + token)}`

  const { error } = await admin.auth.admin.inviteUserByEmail(to, {
    redirectTo: callbackUrl,
  })

  if (error) {
    console.warn(
      `[Email] Supabase invite skipped for ${to}: ${error.message}\n` +
        `The invitation is saved in the database. Share this link manually:\n${acceptUrl}`
    )
    // Do not propagate the error — the invitation record still exists in the DB.
  }

  return { error: null }
}

// ── Email templates ───────────────────────────────────────────────────────

interface TemplateData {
  inviterName: string
  workspaceName: string
  role: string
  acceptUrl: string
}

function buildInvitationHtml({ inviterName, workspaceName, role, acceptUrl }: TemplateData) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Workspace Invitation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
    .header { background: #0f172a; padding: 24px 32px; }
    .header h1 { color: #ffffff; font-size: 20px; margin: 0; font-weight: 700; letter-spacing: -0.3px; }
    .header p { color: #94a3b8; font-size: 13px; margin: 4px 0 0; }
    .body { padding: 32px; }
    .body p { color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .workspace-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
    .workspace-card .ws-name { font-size: 17px; font-weight: 600; color: #0f172a; margin: 0 0 4px; }
    .workspace-card .ws-role { font-size: 13px; color: #64748b; margin: 0; }
    .badge { display: inline-block; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px; border: 1px solid #bfdbfe; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; margin: 8px 0 24px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .footer { padding: 0 32px 24px; }
    .footer p { color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0 0 6px; }
    .footer a { color: #6b7280; }
    .link-box { background: #f3f4f6; border-radius: 6px; padding: 10px 14px; word-break: break-all; font-size: 12px; color: #6b7280; font-family: monospace; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>IlmStack Health</h1>
      <p>Clinical Knowledge Platform</p>
    </div>
    <div class="body">
      <p>Hi there,</p>
      <p><strong>${inviterName}</strong> has invited you to join their workspace on IlmStack Health.</p>

      <div class="workspace-card">
        <p class="ws-name">${workspaceName}</p>
        <p class="ws-role">You&rsquo;ll be joining as &nbsp;<span class="badge">${role}</span></p>
      </div>

      <p>Click the button below to accept the invitation. This link expires in <strong>7 days</strong>.</p>

      <a href="${acceptUrl}" class="btn">Accept Invitation</a>

      <hr class="divider" />
      <p style="font-size:13px;color:#6b7280;">If you weren&rsquo;t expecting this invitation or don&rsquo;t recognise <strong>${workspaceName}</strong>, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>Or copy and paste this link into your browser:</p>
      <div class="link-box">${acceptUrl}</div>
    </div>
  </div>
</body>
</html>
`
}

function buildInvitationText({ inviterName, workspaceName, role, acceptUrl }: TemplateData) {
  return `
IlmStack Health — Workspace Invitation

${inviterName} has invited you to join "${workspaceName}" as ${role}.

Accept your invitation here:
${acceptUrl}

This link expires in 7 days.

If you weren't expecting this, you can safely ignore this email.
`.trim()
}
