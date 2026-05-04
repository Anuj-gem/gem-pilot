// Landing page — v0.14.0 consolidated (2026-05-03).
//
// Single page for everything. /writers, /industry, /selznick now
// redirect here. The pitch: structured evaluation + exclusive curated
// opportunities + real feedback from industry + writer profiles.
//
// Page architecture:
//   1. Hero — "Advanced script evaluation. Direct industry access."
//   2. Arc — Upload → Get evaluated → Match → Submit
//   3. Five pillars — evaluation, exclusive opportunities, real
//      feedback, profile, vision (Selznick)
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
    </div>
  )
}
