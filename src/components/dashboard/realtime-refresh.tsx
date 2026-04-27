'use client'

// RealtimeRefresh — writer-side dashboard auto-refresh.
//
// Subscribes to UPDATE events on script_matches scoped to the writer's
// own submissions. When a producer flips a row to interested / commented /
// passed (or anything else), the writer's dashboard re-fetches without a
// hard reload.
//
// The Supabase realtime `filter` only supports a single `eq` / `in` per
// column, so we pass the writer's submission IDs as a comma-separated
// `submission_id=in.(...)` list. If the writer has zero submissions, we
// skip the subscription entirely.
//
// One refresh per event is fine; rate is low.
//
// Requires: public.script_matches in the supabase_realtime publication.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

interface RealtimeRefreshProps {
  writerId: string
  submissionIds: string[]
}

export function RealtimeRefresh({ writerId, submissionIds }: RealtimeRefreshProps) {
  const router = useRouter()
  // Stable cache key so the effect only re-subscribes when the set of
  // submission IDs actually changes (order-independent).
  const idsKey = [...submissionIds].sort().join(',')

  useEffect(() => {
    if (!idsKey) return
    const ids = idsKey.split(',').filter(Boolean)
    if (ids.length === 0) return

    const supabase = createClient()
    const channel = supabase
      .channel(`writer-matches-${writerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'script_matches',
          filter: `submission_id=in.(${ids.join(',')})`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [writerId, idsKey, router])

  return null
}
