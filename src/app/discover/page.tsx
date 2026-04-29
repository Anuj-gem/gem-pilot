// /discover — retired 2026-04-29. Public Discover feed is gone; the
// industry now sees scripts via the producer dashboard (/partner). Any
// stale link to /discover (old share URLs, indexed pages, marketing
// references) hard-redirects to the homepage.

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function DiscoverRetired() {
  redirect('/')
}
