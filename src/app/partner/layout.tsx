// Partner layout — provides the standard app shell (Nav + light background).
// This mirrors the (app) layout but without the sidebar, since partner pages
// are their own full-width views.

import Nav from '@/components/nav'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { isProStatus } from '@/lib/subscription'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: '#0f0a1a' }}>
        <Nav />
        <main>{children}</main>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, full_name, handle, headline, avatar_url, heat_score, referral_code, bonus_submissions, account_type')
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
    service.from('script_submissions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('hidden_at', null).eq('status', 'completed'),
  ])

  const isPro = isProStatus(profile?.subscription_status)

  // Derive total heat from sum of all script heat scores
  const { data: heatSubs } = await service
    .from('script_submissions')
    .select('heat_score')
    .eq('user_id', user.id)
    .eq('status', 'completed')
  const totalHeat = (heatSubs || []).reduce((sum: number, s: any) => sum + (s.heat_score ?? 0), 0)

  const navUserData = {
    profile: {
      full_name: profile?.full_name ?? null,
      handle: profile?.handle ?? null,
      headline: profile?.headline ?? null,
      avatar_url: profile?.avatar_url ?? null,
      isPro,
      accountType: (profile as any)?.account_type ?? null,
      heatScore: totalHeat,
      referralCode: (profile as any)?.referral_code ?? null,
      bonusSubmissions: (profile as any)?.bonus_submissions ?? 0,
      referralCount: 0,
    },
    stats: {
      scripts: scriptCount ?? 0,
      followers: followers ?? 0,
      following: following ?? 0,
      reviewsGiven: reviewsGiven ?? 0,
    },
    recentActivity: [],
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0a1a' }}>
      <Nav userData={navUserData} />
      <main>{children}</main>
    </div>
  )
}
