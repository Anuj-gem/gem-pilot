import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/partner']
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from login/signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  // Producer-specific routing. Skip the lookup if there's no user, or if the
  // request is for a path where the producer-specific redirects don't apply
  // (auth flows, API endpoints, the onboarding pages themselves).
  if (user) {
    const producerCheckSkipPaths = [
      '/api',
      '/auth',
      '/login',
      '/signup',
      '/onboarding',
    ]
    const skipProducerCheck = producerCheckSkipPaths.some(p =>
      pathname.startsWith(p)
    )

    if (!skipProducerCheck) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_type, lane')
        .eq('id', user.id)
        .single()

      if (profile?.account_type === 'producer') {
        // Producers without a `lane` need to finish onboarding before they
        // see anything else (except the auth/onboarding paths skipped above).
        if (profile.lane === null) {
          const url = request.nextUrl.clone()
          url.pathname = '/onboarding/producer'
          return NextResponse.redirect(url)
        }

        // Producers hitting the writer dashboard get sent to /partner.
        if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
          const url = request.nextUrl.clone()
          url.pathname = '/partner'
          return NextResponse.redirect(url)
        }
      } else {
        // Writers hitting the old /dashboard get sent to /onboarding (the new home).
        if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
          const url = request.nextUrl.clone()
          url.pathname = '/onboarding'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
