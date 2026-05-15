// /onboarding — New user onboarding flow.
// Anonymous users: upload scripts → see results → create account.
// Authenticated users: redirect to dashboard.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { OnboardingClient } from './onboarding-client'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Already logged in — send to dashboard
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white">
      <OnboardingClient />
    </div>
  )
}
