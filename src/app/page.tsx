// Landing page — v19 (2026-05-27).
//
// Hero (side-by-side) → Journey → Compare → Privacy → Steps → Opportunities → Partners → Pro → Final CTA.
// Solid deep purple background #2b1a55.

import { redirect } from 'next/navigation'
import { LandingTracking } from '@/components/landing-tracking'
import { LandingNav } from '@/components/landing/landing-nav'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingJourney } from '@/components/landing/landing-journey'
import { LandingCompare } from '@/components/landing/landing-compare'
import { LandingPrivacy } from '@/components/landing/landing-privacy'
import { LandingSteps } from '@/components/landing/landing-steps'
import { LandingOpportunities } from '@/components/landing/landing-opportunities'
import { LandingPartners } from '@/components/landing/landing-partners'
import { LandingPro } from '@/components/landing/landing-pro'
import { LandingFinalCTA } from '@/components/landing/landing-final-cta'
import { ScriptUploadModal } from '@/components/script-upload-modal'
import { SiteFooter } from '@/components/site-footer'
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
    <div className="min-h-screen text-white" style={{ background: '#2b1a55' }}>
      <LandingTracking />
      <LandingNav />

      <LandingHero />
      <LandingJourney />
      <LandingCompare />
      <LandingPrivacy />
      <LandingSteps />
      <LandingOpportunities />
      <LandingPartners />
      <LandingPro />
      <LandingFinalCTA />

      <SiteFooter />
      <ScriptUploadModal redirectTo="/evaluating" />
    </div>
  )
}
