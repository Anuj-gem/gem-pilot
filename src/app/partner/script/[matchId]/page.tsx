// /partner/script/[matchId] — legacy producer-facing detail URL.
//
// Anuj 2026-04-29: the producer view is now consolidated onto
// /report/[evalId]. Any logged-in producer who has a script_match for
// the report sees Interested/Pass + Reach-out + sticky-bar inline on
// that single URL. This page is now a thin auth-aware redirect that
// preserves the side effect of flipping pending → opened on first view.

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ matchId: string }>
}

export default async function PartnerScriptRedirect({ params }: PageProps) {
  const { matchId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/partner/script/${matchId}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', user.id)
    .single()

  if (profile?.account_type !== 'producer') {
    redirect('/dashboard')
  }

  const { data: match } = await supabase
    .from('script_matches')
    .select('id, producer_id, submission_id, status, unmatched_at')
    .eq('id', matchId)
    .maybeSingle()

  if (!match || match.producer_id !== user.id) {
    notFound()
  }

  if (match.unmatched_at) {
    redirect('/partner')
  }

  // Side effect: pending → opened. Mirrors the old behavior so the
  // producer dashboard's "new since visit" math stays accurate.
  if (match.status === 'pending') {
    await supabase
      .from('script_matches')
      .update({ status: 'opened', opened_at: new Date().toISOString() })
      .eq('id', matchId)
      .eq('status', 'pending')
  }

  // Look up the eval id for this submission (the canonical /report URL
  // is keyed by eval id, not submission id).
  const { data: evalRow } = await supabase
    .from('script_evaluations')
    .select('id')
    .eq('submission_id', match.submission_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!evalRow?.id) notFound()

  redirect(`/report/${evalRow.id}`)
}
