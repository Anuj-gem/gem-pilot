// /discover — shell page.
// Anuj 2026-05-14 v0.4.

import { createClient } from '@/lib/supabase-server'
import { DiscoverShell } from './discover-shell'

export const dynamic = 'force-dynamic'

export default async function DiscoverPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()

  return <DiscoverShell loggedIn={!!user} />
}
