// Landing page — v12 (2026-05-08).
//
// Three steps: instant coverage → human review → get matched.
// Three pillars: instant coverage, human review, matching.
//
// Page architecture:
//   1. Hero — "Get your work in front of the right people."
//   2. Arc — Instant coverage → Human review → Get matched (3 steps)
//   3. Three pillars — instant coverage, human review, matching
//   4. Pricing — Free vs Pro $20/mo
//   5. Final CTA

import { redirect } from 'next/navigation'
import { LandingTracking } from '@/components/landing-tracking'
import Nav from '@/components/nav'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingArc } from '@/components/landing/landing-arc'
import { LandingPillars } from '@/components/landing/landing-pillars'
import { LandingPricing } from '@/components/landing/landing-pricing'
import { LandingFinalCTA } from '@/components/landing/landing-final-cta'
import { ScriptUploadModal } from '@/components/script-upload-modal'
import { createClient } from '@/lib/supabase-server'

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

  return (
    <div className="min-h-screen bg-[var(--gem-black)] text-[var(--gem-gray-50)]">
      <LandingTracking />
      <Nav />
      <LandingHero />
      <div className="h-px bg-[var(--gem-gray-700)]" />
      <LandingArc />
      <LandingPillars />
      <div className="h-px bg-[var(--gem-gray-700)] mx-auto max-w-5xl" />
      <LandingPricing />
      <LandingFinalCTA />
      <ScriptUploadModal />
    </div>
  )
}
