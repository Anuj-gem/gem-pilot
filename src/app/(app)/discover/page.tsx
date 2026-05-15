// /discover — renders within the unified OnboardingClient app shell.
// The standalone DiscoverShell is preserved in discover-shell.tsx for reference.

import { OnboardingClient } from '../onboarding/onboarding-client'

export const dynamic = 'force-dynamic'

export default async function DiscoverPage() {
  return <OnboardingClient />
}
