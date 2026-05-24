// POST /api/opportunity/create — create a new opportunity (producer only)

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

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify producer account
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, account_type')
    .eq('id', user.id)
    .single()

  if (profile?.account_type !== 'producer') {
    return NextResponse.json({ error: 'Producer account required' }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, subtitle, formats, genres, budget_tiers, tags } = body

  if (!title || !description) {
    return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
  }

  const service = svc()

  // Generate unique slug
  let slug = generateSlug(title)
  const { data: existing } = await service
    .from('opportunities')
    .select('id')
    .eq('slug', slug)
    .limit(1)

  if (existing && existing.length > 0) {
    slug = `${slug}-${randomSuffix()}`
  }

  const { data: opportunity, error: insertError } = await service
    .from('opportunities')
    .insert({
      title,
      subtitle: subtitle || null,
      description,
      formats: formats || [],
      genres: genres || [],
      budget_tiers: budget_tiers || [],
      tags: tags || [],
      slug,
      owner_id: user.id,
      posted_by: profile.full_name || null,
      status: 'active',
      published: true,
    })
    .select('id, slug')
    .single()

  if (insertError || !opportunity) {
    return NextResponse.json({ error: insertError?.message || 'Failed to create opportunity' }, { status: 500 })
  }

  return NextResponse.json({ id: opportunity.id, slug: opportunity.slug })
}
