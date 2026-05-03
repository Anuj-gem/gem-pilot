// CRUD for submission annotations.
// POST — create annotation
// PUT — update annotation
// DELETE — delete annotation
// GET — fetch annotations for a submission

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

// Verify the user owns the opportunity this submission belongs to
async function verifyOwnership(userId: string, submissionId: string) {
  const service = svc()
  const { data: sub } = await service
    .from('opportunity_submissions')
    .select('id, opportunity_id')
    .eq('id', submissionId)
    .single()
  if (!sub) return false

  const { data: opp } = await service
    .from('opportunities')
    .select('owner_id')
    .eq('id', sub.opportunity_id)
    .single()
  return opp?.owner_id === userId
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { submission_id, anchor, comment, sentiment } = await req.json()
  if (!submission_id || !anchor || !comment?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (sentiment && !['strength', 'concern', 'context'].includes(sentiment)) {
    return NextResponse.json({ error: 'Invalid sentiment' }, { status: 400 })
  }

  const owns = await verifyOwnership(user.id, submission_id)
  if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = svc()
  const { data, error } = await service
    .from('submission_annotations')
    .insert({
      submission_id,
      reviewer_id: user.id,
      anchor,
      comment: comment.trim(),
      sentiment: sentiment || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, comment, sentiment } = await req.json()
  if (!id || !comment?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const service = svc()

  // Check annotation belongs to this reviewer and submission isn't reviewed yet
  const { data: ann } = await service
    .from('submission_annotations')
    .select('id, submission_id, reviewer_id')
    .eq('id', id)
    .single()
  if (!ann || ann.reviewer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check if submission is still pending (annotations lock after review)
  const { data: sub } = await service
    .from('opportunity_submissions')
    .select('status')
    .eq('id', ann.submission_id)
    .single()
  if (sub?.status === 'reviewed') {
    return NextResponse.json({ error: 'Annotations are locked after review is complete' }, { status: 403 })
  }

  const { data, error } = await service
    .from('submission_annotations')
    .update({
      comment: comment.trim(),
      sentiment: sentiment || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const service = svc()

  const { data: ann } = await service
    .from('submission_annotations')
    .select('id, submission_id, reviewer_id')
    .eq('id', id)
    .single()
  if (!ann || ann.reviewer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check if submission is still pending
  const { data: sub } = await service
    .from('opportunity_submissions')
    .select('status')
    .eq('id', ann.submission_id)
    .single()
  if (sub?.status === 'reviewed') {
    return NextResponse.json({ error: 'Annotations are locked after review is complete' }, { status: 403 })
  }

  const { error } = await service
    .from('submission_annotations')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const submissionId = req.nextUrl.searchParams.get('submission_id')
  if (!submissionId) return NextResponse.json({ error: 'Missing submission_id' }, { status: 400 })

  const service = svc()
  const { data, error } = await service
    .from('submission_annotations')
    .select('id, anchor, comment, sentiment, created_at')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
