import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { SignupPageClient } from './signup-client'

interface PageProps {
  searchParams: Promise<{ redirect?: string; email?: string }>
}

export default async function SignupPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const sp = await searchParams

  // Already-signed-in writers should go to wherever they were headed
  // (or dashboard by default).
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect(sp.redirect || '/dashboard')
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
