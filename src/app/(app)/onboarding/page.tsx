// /onboarding — Name + intent step only.
// Once the user finishes onboarding, they land on /script.
// If they visit /onboarding after already completing it, redirect to /script.

import { OnboardingClient } from './onboarding-client'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  return <OnboardingClient />
}
