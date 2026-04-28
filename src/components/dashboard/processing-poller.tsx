'use client'

// ProcessingPoller — fires `router.refresh()` every 3s while there's at
// least one script in `processing` state on the dashboard. When the
// re-fetched data shows no processing rows, the component unmounts (or
// the parent stops rendering it) and polling stops.
//
// Anuj 2026-04-28: existing RealtimeRefresh listens to script_matches,
// but the script_submissions table isn't in the supabase_realtime
// publication, so the writer's "We're reading your script…" hero card
// stays spinning until they manually refresh. Polling closes the gap
// without a DB migration.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  /** True when at least one script on the dashboard is still processing.
   *  When this flips false (next render), the parent will stop
   *  rendering this component and the poll auto-stops. */
  active: boolean
  /** Override the default 3-second cadence. */
  intervalMs?: number
}

export function ProcessingPoller({ active, intervalMs = 3000 }: Props) {
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs, router])
  return null
}
