'use client'

// RealtimeRefresh — producer-side dashboard auto-refresh.
//
// Subscribes to UPDATE events on script_matches scoped to the current
// producer. When a writer unmatches (or "removes" their script, which now
// propagates to script_matches), the producer's Inbox/Slate stops showing
// the row without requiring a manual reload.
//
// We just call router.refresh() on any matching event — the server
// component re-runs its query and React reconciles the diff. One refresh
// per event is fine (rate is low); we don't debounce.
//
// Requires: public.script_matches in the supabase_realtime publication.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

interface RealtimeRefreshProps {
  producerId: string
}

export function RealtimeRefresh({ producerId }: RealtimeRefreshProps) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`partner-matches-${producerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'script_matches',
          filter: `producer_id=eq.${producerId}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [producerId, router])

  return null
}
