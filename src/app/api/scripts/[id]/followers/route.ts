import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET — list individual followers/backers for a script
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const supabase = makeServiceClient()

  // 1. Find consideration IDs linked to this script
  const { data: links } = await supabase
    .from('consideration_scripts')
    .select('consideration_id')
    .eq('script_submission_id', submissionId)

  if (!links || links.length === 0) {
    return NextResponse.json([])
  }

  const conIds = links.map(l => l.consideration_id)

  // 2. Get considerations with a backing_status (following or attached)
  const { data: considerations } = await supabase
    .from('considerations')
    .select('id, opportunity_id, backing_status, backing_amount, backing_conditions, backing_note')
    .in('id', conIds)
    .in('backing_status', ['following', 'attached'])

  if (!considerations || considerations.length === 0) {
    return NextResponse.json([])
  }

  // 3. Get opportunity details + owner profiles
  const oppIds = [...new Set(considerations.map(c => c.opportunity_id))]

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, title, owner_id, deal_type')
    .in('id', oppIds)

  const oppMap: Record<string, any> = {}
  if (opportunities) {
    for (const o of opportunities) {
      oppMap[o.id] = o
    }
  }

  // Get owner profiles
  const ownerIds = [...new Set((opportunities || []).map(o => o.owner_id).filter(Boolean))]
  let profileMap: Record<string, any> = {}

  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, headline')
      .in('id', ownerIds)

    if (profiles) {
      profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
    }
  }

  // 4. Assemble the response
  const followers = considerations.map(c => {
    const opp = oppMap[c.opportunity_id]
    const owner = opp?.owner_id ? profileMap[opp.owner_id] : null

    return {
      id: c.id,
      type: c.backing_status, // 'following' or 'attached'
      amount: c.backing_amount,
      conditions: c.backing_conditions,
      note: c.backing_note,
      opportunity: opp ? {
        id: opp.id,
        title: opp.title,
        deal_type: opp.deal_type,
      } : null,
      partner: owner ? {
        name: owner.full_name,
        avatar_url: owner.avatar_url,
        headline: owner.headline,
      } : null,
    }
  })

  return NextResponse.json(followers)
}
