// POST /api/scripts/[id]/poster — upload a poster image for a script.
//
// Body: multipart/form-data with a single 'file' field (image/*).
// Auth: must be the script owner.
// Max size: 5 MB.
//
// Uploads to Supabase Storage bucket 'posters' under path
// {submissionId}/{timestamp}.{ext}. Writes the public URL to
// script_submissions.poster_url. Returns { url }.

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const cookieStore = await cookies()

  // Auth — cookie-based Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Service client for storage + DB writes
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify ownership
  const { data: submission } = await serviceClient
    .from('script_submissions')
    .select('id, user_id')
    .eq('id', submissionId)
    .single()

  if (!submission || submission.user_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Parse multipart form
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File must be an image (JPEG, PNG, WebP, or GIF)' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
  }

  // Determine extension
  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const storagePath = `${submissionId}/${Date.now()}.${ext}`

  // Upload to storage
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await serviceClient.storage
    .from('posters')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('Poster upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  // Get public URL
  const { data: { publicUrl } } = serviceClient.storage
    .from('posters')
    .getPublicUrl(storagePath)

  // Update script_submissions.poster_url
  const { error: updateError } = await serviceClient
    .from('script_submissions')
    .update({ poster_url: publicUrl })
    .eq('id', submissionId)

  if (updateError) {
    console.error('Poster URL update error:', updateError)
    return NextResponse.json({ error: 'Failed to save poster URL' }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl })
}
