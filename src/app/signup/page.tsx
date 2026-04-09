import { createClient } from '@/lib/supabase-server'
import { SignupPageClient } from './signup-client'

export default async function SignupPage() {
  const supabase = await createClient()
  const { data: topScripts } = await supabase
    .from('leaderboard')
    .select('*')
    .order('weighted_score', { ascending: false })
    .limit(3)

  return <SignupPageClient topScripts={topScripts ?? []} />
}
