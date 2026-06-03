// Landing page — v19 (2026-05-27).
//
// Hero (side-by-side) → Journey → Compare → Privacy → Steps → Opportunities → Partners → Pro → Final CTA.
// Solid deep purple background #2b1a55.

import { redirect } from 'next/navigation'
import { LandingTracking } from '@/components/landing-tracking'
import { LandingNav } from '@/components/landing/landing-nav'
import { LandingPageV21 } from '@/components/landing/landing-page-v21'
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

      <LandingPageV21 />

      <SiteFooter />
      <ScriptUploadModal redirectTo="/evaluating" />
    </div>
  )
}
