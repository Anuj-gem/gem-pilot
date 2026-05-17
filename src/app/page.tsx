// Landing page — v17 (2026-05-16).
//
// Hero → Activity → Journey → Compare → Privacy → Steps → Opportunities → Partners → Pro → Final CTA.

import { redirect } from 'next/navigation'
import { LandingTracking } from '@/components/landing-tracking'
import Nav from '@/components/nav'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingActivity } from '@/components/landing/landing-activity'
import { LandingJourney } from '@/components/landing/landing-journey'
import { LandingCompare } from '@/components/landing/landing-compare'
import { LandingPrivacy } from '@/components/landing/landing-privacy'
import { LandingSteps } from '@/components/landing/landing-steps'
import { LandingOpportunities } from '@/components/landing/landing-opportunities'
import { LandingPartners } from '@/components/landing/landing-partners'
import { LandingPro } from '@/components/landing/landing-pro'
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
      {/* <LandingActivity /> — hidden until leaderboard is ready */}
      <LandingJourney />
      <LandingCompare />
      <LandingPrivacy />
      <LandingSteps />
      <LandingOpportunities />
      <LandingPartners />
      <LandingPro />
      <LandingFinalCTA />

      <ScriptUploadModal redirectTo="/evaluating" />
    </div>
  )
}
