import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// GEM transition — June 2026.
// The SaaS evaluation product is shutting down. Most routes redirect to
// /landing.html (the new GEM Studios static page, served from /public).
//
// Whitelist — kept alive:
//   /landing.html  — new GEM Studios landing
//   /pitch.html    — pitch intake form
//   /screenshots   — static assets used by landing
//   /discover      — public script leaderboard
//   /report        — existing report links
//   /w/            — public writer profiles
//   /admin         — internal tooling
//   /auth          — OAuth callbacks (Supabase requires this)
//   /api           — API routes
//   /privacy, /terms — legal
//   /sample        — sample reports
//   /selznick      — internal
//   /blog          — blog posts

const KEEP_PREFIXES = [
  '/landing.html',
  '/pitch.html',
  '/screenshots',
  '/discover',
  '/report',
  '/w/',
  '/admin',
  '/auth',
  '/api',
  '/privacy',
  '/terms',
  '/sample',
  '/selznick',
  '/blog',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Root → new landing page
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/landing.html'
    return NextResponse.redirect(url, { status: 302 })
  }

  // Anything not on the keep list → landing page
  const keep = KEEP_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(prefix)
  )
  if (!keep) {
    const url = request.nextUrl.clone()
    url.pathname = '/landing.html'
    return NextResponse.redirect(url, { status: 302 })
  }

  // For kept routes — run Supabase session refresh (required for SSR auth).
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html|css|js|ico|txt|xml)$).*)',
  ],
}
