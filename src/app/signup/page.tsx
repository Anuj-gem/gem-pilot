import { createClient } from '@/lib/supabase-server'
import { SignupPageClient } from './signup-client'

export default async function SignupPage() {
  const supabase = await createClient()
  // Show the 3 most recent public scripts on Discover — social proof that
  // real writers are using GEM today. No scores or ranking.
  const { data: topScripts } = await supabase
    .from('leaderboard')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3)

  return <SignupPageClient topScripts={topScripts ?? []} />
}
