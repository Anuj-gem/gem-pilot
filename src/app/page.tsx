// Landing page — v3 (2026-06-13).
// Production-company positioning. Hero → The Read → What you get → How we work → Partner → Close.
// Logged-in users redirect to /dashboard. Discover/Opportunities removed from the landing.

import { redirect } from 'next/navigation'
import { LandingTracking } from '@/components/landing-tracking'
import { LandingV3 } from '@/components/landing/landing-v3'
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

  return (
    <>
      <LandingTracking />
      <LandingV3 />
    </>
  )
}
