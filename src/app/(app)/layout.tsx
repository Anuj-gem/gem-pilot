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
import { ScriptUploadModal } from "@/components/script-upload-modal"
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import { PrivacyConfirmPrompt } from '@/components/privacy/privacy-confirm-prompt'
import { normalizePrivacyDefaults } from '@/lib/privacy-defaults'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'

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
      <div className="min-h-screen">
        <Nav />
        <div className="max-w-6xl mx-auto px-3 sm:px-5 pt-4 pb-24">
          <div className="rounded-2xl p-4 sm:p-6" style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {children}
          </div>
        </div>
        <ScriptUploadModal redirectTo="/evaluating" />
      </div>
    )
  }

  // Logged-in: pull profile + the four headline counts so the rail can
  // render entirely from server-rendered data on first paint. The rail
  // component itself is a client wrapper so it can hide on /report
  // pages via usePathname.
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, full_name, handle, headline, avatar_url, privacy_defaults, privacy_confirmed_at, referral_code, bonus_submissions')
    .eq('id', user.id)
    .single()

  const service = svc()
  const [
    { count: followers },
    { count: following },
    { count: reviewsGiven },
    { count: scriptCount },
    { data: ownPubs },
    { data: ownReviews },
  ] = await Promise.all([
    service.from('follows').select('id', { count: 'exact', head: true }).eq('followee_id', user.id),
    service.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
    service.from('peer_reviews').select('id', { count: 'exact', head: true }).eq('reviewer_id', user.id).is('deleted_at', null),
    // Match the /scripts page count — completed evaluated submissions
    // only (so the rail's number stays consistent with the user's
    // library). Anuj 2026-04-30 cleanup.
    service.from('script_submissions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('hidden_at', null).eq('status', 'completed'),
    // Own most-recent publishes — bare submissions, no embedded join
    // (PostgREST chokes on multi-FK ambiguity to script_evaluations).
    service.from('script_submissions')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .eq('is_public', true)
      .eq('status', 'completed')
      .is('hidden_at', null)
      .order('created_at', { ascending: false })
      .limit(3),
    // Own most-recent reviews given — bare rows, two-pass eval lookup.
    service.from('peer_reviews')
      .select('id, created_at, submission_id')
      .eq('reviewer_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  type PubRow = { id: string; title: string; created_at: string }
  type RevRow = { id: string; created_at: string; submission_id: string }
  const pubRows = (ownPubs as PubRow[] | null) || []
  const revRows = (ownReviews as RevRow[] | null) || []

  // Second pass: resolve eval IDs + (for reviews) submission titles.
  const submissionIdsForActivity = Array.from(new Set([
    ...pubRows.map((p) => p.id),
    ...revRows.map((r) => r.submission_id),
  ]))
  const evIdBySub = new Map<string, string>()
  const titleBySub = new Map<string, string>()
  if (submissionIdsForActivity.length > 0) {
    const [{ data: evs }, { data: subs }] = await Promise.all([
      service.from('script_evaluations').select('id, submission_id').in('submission_id', submissionIdsForActivity),
      service.from('script_submissions').select('id, title').in('id', submissionIdsForActivity),
    ])
    for (const e of (evs as Array<{ id: string; submission_id: string }> | null) || []) {
      evIdBySub.set(e.submission_id, e.id)
    }
    for (const s of (subs as Array<{ id: string; title: string }> | null) || []) {
      titleBySub.set(s.id, s.title)
    }
  }

  type ActivityItem = { kind: 'publish' | 'review'; ts: number; title: string; href: string }
  const activity: ActivityItem[] = []
  for (const p of pubRows) {
    const evId = evIdBySub.get(p.id)
    if (!evId) continue
    activity.push({ kind: 'publish', ts: new Date(p.created_at).getTime(), title: p.title, href: `/report/${evId}` })
  }
  for (const r of revRows) {
    const evId = evIdBySub.get(r.submission_id)
    const title = titleBySub.get(r.submission_id) || 'a script'
    if (!evId) continue
    activity.push({ kind: 'review', ts: new Date(r.created_at).getTime(), title, href: `/report/${evId}` })
  }
  activity.sort((a, b) => b.ts - a.ts)
  const recentActivity = activity.slice(0, 3)

  const isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
  const needsPrivacyConfirm = !(profile as { privacy_confirmed_at?: string | null } | null)?.privacy_confirmed_at
  const initialPrivacy = normalizePrivacyDefaults((profile as { privacy_defaults?: unknown } | null)?.privacy_defaults)

  // Monthly opportunity submissions for nav display
  let monthlySubmissions: { used: number; limit: number; resetsAt: string } | undefined
  if (isPro) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const { count } = await service
      .from('opportunity_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('writer_id', user.id)
      .neq('status', 'withdrawn')
      .gte('submitted_at', monthStart)
    const bonusSubs = (profile as { bonus_submissions?: number } | null)?.bonus_submissions ?? 0
    monthlySubmissions = { used: count ?? 0, limit: 3 + bonusSubs, resetsAt: nextMonth.toISOString() }
  }

  // Count successful referrals
  let referralCount = 0
  if ((profile as any)?.referral_code) {
    const { count: refCount } = await service
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', user.id)
      .eq('status', 'converted')
    referralCount = refCount ?? 0
  }

  const navUserData = {
    profile: {
      full_name: profile?.full_name ?? null,
      handle: profile?.handle ?? null,
      headline: profile?.headline ?? null,
      avatar_url: profile?.avatar_url ?? null,
      isPro,
      referralCode: (profile as any)?.referral_code ?? null,
      bonusSubmissions: (profile as any)?.bonus_submissions ?? 0,
      referralCount,
    },
    stats: {
      scripts: scriptCount ?? 0,
      followers: followers ?? 0,
      following: following ?? 0,
      reviewsGiven: reviewsGiven ?? 0,
      monthlySubmissions,
    },
    recentActivity,
  }

  return (
    <div className="min-h-screen">
      <Nav userData={navUserData} />
      {/* PrivacyConfirmPrompt hidden — opportunities-v1 strips privacy controls.
          Backend settings + profile columns unchanged for production. */}
      <div className="max-w-[1280px] mx-auto px-3 sm:px-5 pt-4 pb-8">
        <div className="flex gap-6">
          <DashboardSidebar
            fullName={profile?.full_name ?? null}
            isPro={isPro}
            avatarUrl={profile?.avatar_url ?? null}
          />
          <div className="flex-1 min-w-0 rounded-2xl p-4 sm:p-5" style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {children}
          </div>
        </div>
      </div>
      <ScriptUploadModal redirectTo="/onboarding" />
      {!isPro && <UpgradeModalListener />}
    </div>
  )
}
