// Landing page — v17 (2026-05-14).
//
// Hero → Free Evaluation → Opportunities → Competitor Comparison → Membership → Final CTA.

import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { LandingTracking } from '@/components/landing-tracking'
import Nav from '@/components/nav'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingCredibility } from '@/components/landing/landing-credibility'
import { LandingOpportunities, type LandingOpportunity } from '@/components/landing/landing-opportunities'
import { LandingCompare } from '@/components/landing/landing-compare'
import { LandingHeat } from '@/components/landing/landing-heat'
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
    .select('id, title, slug, description, formats, genres, budget_tiers, min_score, deadline, subtitle')
    .eq('status', 'active')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(3)

  const opportunities = (opps || []) as LandingOpportunity[]

  return (
    <div className="min-h-screen bg-[var(--gem-black)] text-[var(--gem-gray-50)]">
      <LandingTracking />
      <Nav />

      {/* ── Above fold: dark cinematic hero (handles its own bg) ── */}
      <LandingHero />

      {/* ── Below fold: light-themed sections ── */}
      <div style={{ background: '#F7F8FA', color: '#18181b' }}>
        {/* ── How it works: Free evaluation ── */}
        <LandingCredibility />

        {/* ── Opportunities ── */}
        <div className="h-px mx-auto max-w-5xl" style={{ background: '#e4e4e7' }} />
        <LandingOpportunities opportunities={opportunities} />

        {/* ── Competitor comparison ── */}
        <div className="h-px mx-auto max-w-5xl" style={{ background: '#e4e4e7' }} />
        <LandingCompare />

        {/* ── Heat score ── */}
        <div className="h-px mx-auto max-w-5xl" style={{ background: '#e4e4e7' }} />
        <LandingHeat />

        {/* ── Membership ── */}
        <div className="h-px mx-auto max-w-5xl" style={{ background: '#e4e4e7' }} />
        <LandingPro />
      </div>

      {/* ── Final CTA (dark band) ── */}
      <LandingFinalCTA />

      <ScriptUploadModal redirectTo="/evaluating" />
    </div>
  )
}
