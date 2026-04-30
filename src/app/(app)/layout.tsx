// (app) — shared layout for the logged-in surfaces.
// Anuj 2026-04-30 v0.7 — app-shell architecture.
//
// What this layout owns:
//   - Top nav (single canonical placement, pages no longer render <Nav/>)
//   - Persistent left rail (YourPanel) on browse-shaped pages, hidden on
//     /report/[id] so the deep-read column has the page to itself
//   - Bottom tab bar on mobile (Home / Community / Scripts / Profile)
//   - Light background that all child pages sit on
//
// Authentication: this layout handles BOTH logged-in and logged-out
// viewers because /report/[id] and /w/[handle] are publicly addressable.
// Logged-out users see no rail and no bottom tabs — just the page.
//
// Per-page chrome decisions are made client-side via pathname (in
// AppRail / MobileTabBar) so the layout itself stays a clean server
// component and we don't fight per-route layout overrides inside the
// route group.

import Nav from '@/components/nav'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { AppRail } from '@/components/dashboard/app-rail'
import { MobileTabBar } from '@/components/dashboard/mobile-tab-bar'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Logged-out: render the page with just the nav. /report and /w pages
  // remain accessible to anonymous viewers (they're share-link surfaces).
  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
        <Nav />
        <div className="max-w-6xl mx-auto px-4 sm:px-5 pt-4 pb-24">
          {children}
        </div>
      </div>
    )
  }

  // Logged-in: pull profile + the four headline counts so the rail can
  // render entirely from server-rendered data on first paint. The rail
  // component itself is a client wrapper so it can hide on /report
  // pages via usePathname.
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, full_name, handle, headline, avatar_url')
    .eq('id', user.id)
    .single()

  const service = svc()
  const [
    { count: followers },
    { count: following },
    { count: reviewsGiven },
    { count: scriptCount },
  ] = await Promise.all([
    service.from('follows').select('id', { count: 'exact', head: true }).eq('followee_id', user.id),
    service.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
    service.from('peer_reviews').select('id', { count: 'exact', head: true }).eq('reviewer_id', user.id).is('deleted_at', null),
    service.from('script_submissions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('hidden_at', null),
  ])

  const isPro = profile?.subscription_status === 'active'

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      <Nav />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-5 pt-4 pb-28 lg:pb-8">
        <AppRail
          profile={{
            full_name: profile?.full_name ?? null,
            handle: profile?.handle ?? null,
            headline: profile?.headline ?? null,
            avatar_url: profile?.avatar_url ?? null,
            isPro,
          }}
          stats={{
            scripts: scriptCount ?? 0,
            followers: followers ?? 0,
            following: following ?? 0,
            reviewsGiven: reviewsGiven ?? 0,
          }}
        >
          {children}
        </AppRail>
      </div>
      <MobileTabBar />
    </div>
  )
}
