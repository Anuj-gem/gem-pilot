// /onboarding — The main app experience for all users.
// Anonymous users: upload scripts → see results → create account.
// Authenticated users: see saved scripts, upload new ones, browse opportunities.

import { OnboardingClient } from './onboarding-client'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  // Both anonymous and authenticated users use this page.
  // The client component detects auth state and shows saved scripts.
  return <OnboardingClient />
}
