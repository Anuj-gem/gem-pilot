import { OnboardingClient } from '../onboarding/onboarding-client'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  return <OnboardingClient />
}
