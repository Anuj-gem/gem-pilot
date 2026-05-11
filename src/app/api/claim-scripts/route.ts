// POST /api/claim-scripts
// Claims anonymous script submissions (stored in gem_anon_scripts cookie)
// for the currently authenticated user. Called after signup from the
// /evaluating page so we don't need to route through /start.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Read anonymous script IDs from cookie
  const cookieStore = await cookies()
  const anonCookie = cookieStore.get('gem_anon_scripts')
  let claimed = 0

  if (anonCookie?.value) {
    const anonIds = anonCookie.value.split(',').filter(Boolean)
    if (anonIds.length > 0) {
      const service = svc()
      const { data } = await service
        .from('script_submissions')
        .update({ user_id: user.id })
        .in('id', anonIds)
        .is('user_id', null)
        .select('id')

      claimed = data?.length ?? 0
    }
    // Clear the cookie
    cookieStore.set('gem_anon_scripts', '', { path: '/', maxAge: 0 })
  }

  return NextResponse.json({ claimed })
}
