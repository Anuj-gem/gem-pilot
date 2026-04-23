import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { SignupPageClient } from './signup-client'

export default async function SignupPage() {
  const supabase = await createClient()

  // Already-signed-in writers should go straight to their dashboard rather
  // than see another sign-up form.
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/dashboard')
  }

  // Show the 3 most recent public scripts on Discover — social proof that
  // real writers are using GEM today. No scores or ranking.
  const { data: topScripts } = await supabase
    .from('leaderboard')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3)

  return <SignupPageClient topScripts={topScripts ?? []} />
}
