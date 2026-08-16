import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// GEM transition — June 2026.
// The SaaS evaluation product is shutting down. Most routes redirect to
// / (the new GEM Studios landing, served from /public/landing.html via rewrite).
//
// Clean URLs:
//   /        → serves /public/landing.html (rewrite, URL stays /)
//   /pitch   → serves /public/pitch.html (rewrite, URL stays /pitch)
//
// Old .html URLs → 301 redirect to clean versions:
//   /landing.html → /
//   /pitch.html   → /pitch
//
// Whitelist — kept alive (pass through to Supabase session refresh):
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

  // Root → serve landing.html content (clean URL stays /)
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/landing.html', request.url))
  }

  // /pitch → serve pitch.html content (clean URL stays /pitch)
  if (pathname === '/pitch') {
    return NextResponse.rewrite(new URL('/pitch.html', request.url))
  }

  // Standalone HTML research posts live in /public/blog/<slug>.html and
  // are served at /blog/<slug> — checked before the /blog whitelist so
  // they don't fall through to the markdown renderer's 404.
  if (pathname === '/blog/which-hollywood-directors-consistently-exceed-expectations') {
    return NextResponse.rewrite(new URL('/blog/which-hollywood-directors-consistently-exceed-expectations.html', request.url))
  }
  if (pathname === '/blog/overperformers') {
    return NextResponse.redirect(new URL('/blog/which-hollywood-directors-consistently-exceed-expectations', request.url), { status: 301 })
  }

  // Old .html URLs → 301 redirect to clean versions
  if (pathname === '/landing.html') {
    return NextResponse.redirect(new URL('/', request.url), { status: 301 })
  }
  if (pathname === '/pitch.html') {
    return NextResponse.redirect(new URL('/pitch', request.url), { status: 301 })
  }

  // Anything not on the keep list → root (landing page)
  const keep = KEEP_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(prefix)
  )
  if (!keep) {
    return NextResponse.redirect(new URL('/', request.url), { status: 302 })
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico|txt|xml)$).*)',
  ],
}
