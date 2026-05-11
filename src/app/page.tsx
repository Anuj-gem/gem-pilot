// Landing page — v13c (2026-05-11).
//
// Above fold: Hero (compact upload + flow graphic) + Live opportunities.
// Below fold: GEM Evaluation → How partners work → GEM Pro → Final CTA.

import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { LandingTracking } from '@/components/landing-tracking'
import Nav from '@/components/nav'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingOpportunities, type LandingOpportunity } from '@/components/landing/landing-opportunities'
import { LandingCredibility } from '@/components/landing/landing-credibility'
import { LandingPro } from '@/components/landing/landing-pro'
import { LandingFinalCTA } from '@/components/landing/landing-final-cta'
import { ScriptUploadModal } from '@/components/script-upload-modal'
import { createClient } from '@/lib/supabase-server'

export const revalidate = 60

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  // OAuth safety net — forward dangling ?code= to /auth/callback.
  const sp = await searchParams
  if (sp.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(sp.code)}&next=/onboarding`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  // Query live opportunities for above-fold section.
  const service = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
  const { data: opps } = await service
    .from('opportunities')
    .select('id, title, slug, description, formats, genres, budget_tiers, min_score, deadline, perspective, deal_type')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3)

  const opportunities = (opps || []) as LandingOpportunity[]

  return (
    <div className="min-h-screen bg-[var(--gem-black)] text-[var(--gem-gray-50)]">
      <LandingTracking />
      <Nav />

      {/* ── Above fold ── */}
      <LandingHero />
      <LandingOpportunities opportunities={opportunities} />

      {/* ── Below fold ── */}
      <div className="h-px bg-[var(--gem-gray-700)] mx-auto max-w-5xl" />
      <LandingCredibility />
      <div className="h-px bg-[var(--gem-gray-700)] mx-auto max-w-5xl" />
      <LandingPro />
      <LandingFinalCTA />

      <ScriptUploadModal redirectTo="/evaluating" />
    </div>
  )
}
