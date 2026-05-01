// Landing page — v0.11.0 community-first relaunch (2026-04-30).
//
// The pitch: GEM is where screenwriters get seen — post your script,
// trade peer reviews, build a public profile, get on the radar of the
// people who buy.
//
// Page architecture (locked by council 2026-04-30):
//   1. Hero — "Where screenwriters get seen." Primary CTA "Join free",
//      secondary path is the PDF drop zone.
//   2. The Arc — Post → Get peer reviews → Build your profile → Get
//      noticed. Single visual that carries the whole story.
//   3. Three pillars — peer reviews, public profile, direct industry
//      contact. Each is paired with an illustrative product mockup
//      (NOT live data — we don't promise what we can't yet show).
//   4. Pricing — Free vs Pro $20/mo. Pro is the conversion driver.
//   5. Final CTA.
//
// What we deliberately don't have here yet (per the council):
//   - No marquee of real writers / badges
//   - No real /community grid screenshots or user counts
//   - No testimonials, founder story, FAQ, "as featured in" logos
//   - No video / animated hero
// These get added once we have density behind them. Today's job is to
// sell the IDEA of the platform, not the success of it.
//
// Hero-upload handoff unchanged: LandingHero stashes the picked PDF
// via setPendingFile() and routes to /submit?from=hero.

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
