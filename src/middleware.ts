// ============================================================
// ILMSTACK HEALTH — Next.js Middleware
// Handles auth session refresh and route protection.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

// Routes accessible without authentication
const PUBLIC_ROUTES = [
  '/',              // public landing page
  '/login',
  '/register',
  '/magic-link',
  '/accept-invitation',
  '/auth/callback',
  '/api/auth/callback',
]

// Routes that should redirect authenticated users away (to the home dashboard)
const AUTH_ROUTES = ['/login', '/register', '/magic-link']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  const supabase = createMiddlewareClient(request, response)

  // Refresh session if expired (critical for SSR)
  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages to the home dashboard
  if (user && AUTH_ROUTES.some((route) => pathname === route)) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     * - API routes we want to remain unprotected
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
