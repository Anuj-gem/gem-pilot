import { createClient } from '@/lib/supabase-server'
import { OnboardingClient } from '../onboarding/onboarding-client'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initialName: string | undefined
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    initialName = profile?.full_name || user.user_metadata?.full_name || undefined
  }

  return <OnboardingClient initialName={initialName} />
}
