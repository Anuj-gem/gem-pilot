// /discover → /community redirect.
//
// The community surface lives at /community now. We keep this route as a
// permanent redirect so old shared links (Apollo emails, social posts,
// bookmarks) still land in the right place.
//
// Anuj 2026-04-30 v0.10.4.

import { permanentRedirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DiscoverRedirect({ searchParams }: PageProps) {
  const sp = await searchParams
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') params.set(k, v)
    else if (Array.isArray(v)) for (const vv of v) params.append(k, vv)
  }
  const qs = params.toString()
  permanentRedirect(qs ? `/community?${qs}` : '/community')
}
