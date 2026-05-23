// POST /api/scripts/[id]/media — add a media item (file upload or YouTube URL)
// DELETE /api/scripts/[id]/media — remove a media item by url
//
// Body (POST): multipart/form-data with either:
//   - 'file' field (image/* or application/pdf, max 10MB)
//   - 'youtube_url' field (string)
//   - 'label' field (optional string)
//
// Body (DELETE): JSON { url: string }
//
// Auth: must be the script owner.

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
]

interface MediaItem {
  type: 'image' | 'youtube' | 'pdf'
  url: string
  thumbnail?: string
  label?: string
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

async function getAuthAndSubmission(request: NextRequest, submissionId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: submission } = await serviceClient
    .from('script_submissions')
    .select('id, user_id, media_urls')
    .eq('id', submissionId)
    .single()

  if (!submission || submission.user_id !== user.id) {
    return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  }

  return { user, submission, serviceClient }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const auth = await getAuthAndSubmission(request, submissionId)
  if ('error' in auth && auth.error) return auth.error
  const { submission, serviceClient } = auth as any

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const youtubeUrl = formData.get('youtube_url') as string | null
  const label = (formData.get('label') as string | null) || undefined

  let newItem: MediaItem

  if (youtubeUrl) {
    const videoId = extractYouTubeId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }
    newItem = {
      type: 'youtube',
      url: `https://www.youtube.com/embed/${videoId}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      label,
    }
  } else if (file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File must be an image or PDF' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File must be under 10 MB' }, { status: 400 })
    }

    const isPdf = file.type === 'application/pdf'
    const ext = isPdf ? 'pdf' : (file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1])
    const storagePath = `${submissionId}/${Date.now()}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await serviceClient.storage
      .from('application-media')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Media upload error:', uploadError)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: { publicUrl } } = serviceClient.storage
      .from('application-media')
      .getPublicUrl(storagePath)

    newItem = {
      type: isPdf ? 'pdf' : 'image',
      url: publicUrl,
      label,
    }
  } else {
    return NextResponse.json({ error: 'Provide a file or youtube_url' }, { status: 400 })
  }

  const existingMedia: MediaItem[] = submission.media_urls || []
  const updatedMedia = [...existingMedia, newItem]

  const { error: updateError } = await serviceClient
    .from('script_submissions')
    .update({ media_urls: updatedMedia })
    .eq('id', submissionId)

  if (updateError) {
    console.error('Media URL update error:', updateError)
    return NextResponse.json({ error: 'Failed to save media' }, { status: 500 })
  }

  return NextResponse.json({ item: newItem, media_urls: updatedMedia })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params
  const auth = await getAuthAndSubmission(request, submissionId)
  if ('error' in auth && auth.error) return auth.error
  const { submission, serviceClient } = auth as any

  const { url } = await request.json()
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  const existingMedia: MediaItem[] = submission.media_urls || []
  const updatedMedia = existingMedia.filter((item) => item.url !== url)

  const { error: updateError } = await serviceClient
    .from('script_submissions')
    .update({ media_urls: updatedMedia })
    .eq('id', submissionId)

  if (updateError) {
    console.error('Media delete error:', updateError)
    return NextResponse.json({ error: 'Failed to remove media' }, { status: 500 })
  }

  return NextResponse.json({ media_urls: updatedMedia })
}
