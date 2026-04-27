'use client'

// Sticky bottom action bar for the producer script detail page. Pinned to
// the viewport so the producer can react from anywhere on the page without
// scrolling back to the hero. Mounts the same MatchActions client component
// the inline header bar uses, with a slight visual treatment (full-width
// shadow + opaque background) to read as a separate UI layer.

import { MatchActions } from './match-actions'

type Status = 'pending' | 'opened' | 'interested' | 'passed' | 'commented'

export function StickyMatchActions({
  matchId,
  status,
}: {
  matchId: string
  status: Status
}) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'saturate(180%) blur(8px)',
        WebkitBackdropFilter: 'saturate(180%) blur(8px)',
        borderTop: '1px solid var(--gem-gray-700)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.04)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
        <MatchActions matchId={matchId} status={status} variant="detail" />
      </div>
    </div>
  )
}
