// ============================================================
// ILMSTACK HEALTH — Environment Configuration
// Validates and exports typed env vars. Fails fast at startup
// if required variables are missing.
// ============================================================

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

// Public env (safe for client)
export const publicEnv = {
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  appUrl: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  appName: optionalEnv('NEXT_PUBLIC_APP_NAME', 'Clinical Ledger'),
  maxAttachmentSize: parseInt(
    optionalEnv('NEXT_PUBLIC_MAX_ATTACHMENT_SIZE', '10485760'),
    10
  ),
  maxImagingSize: parseInt(
    optionalEnv('NEXT_PUBLIC_MAX_IMAGING_SIZE', '52428800'),
    10
  ),
  maxAvatarSize: parseInt(
    optionalEnv('NEXT_PUBLIC_MAX_AVATAR_SIZE', '2097152'),
    10
  ),
} as const

// Server-only env (never expose to client)
export function getServerEnv() {
  return {
    supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  } as const
}

export type PublicEnv = typeof publicEnv
