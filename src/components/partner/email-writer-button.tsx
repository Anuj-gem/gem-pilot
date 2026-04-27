'use client'

// EmailWriterButton — producer-side "Reply via email" anchor that fires a
// fire-and-forget tracking ping to /api/partner/match/[id]/email-click on
// click, then lets the browser navigate to the mailto: URL as normal.
//
// Stamping is COALESCE-style server-side, so subsequent clicks don't
// overwrite the first-click timestamp. We optimistically swap the label
// to "Emailed ✓" once the local state knows the stamp exists; the timestamp
// can be passed in pre-stamped (already in the DB on page load).

import { useState } from 'react'
import { Mail, Check } from 'lucide-react'

interface Props {
  matchId: string
  mailtoHref: string
  /**
   * If non-null, the producer has already clicked through at least once;
   * we render the "Emailed ✓" affordance instead of "Reply via email".
   */
  producerEmailedAt: string | null
}

export function EmailWriterButton({
  matchId,
  mailtoHref,
  producerEmailedAt,
}: Props) {
  // Local state mirrors the server-side timestamp so the label flips the
  // moment the producer clicks, without waiting for a router refresh.
  const [emailed, setEmailed] = useState<boolean>(!!producerEmailedAt)

  function handleClick() {
    // Fire-and-forget. We DON'T await — the browser is already on its way
    // to the mail client. The keepalive flag asks the browser to let the
    // request finish even if the page unloads (the user's mail app may
    // steal focus). Errors are silently swallowed; the email click is a
    // soft signal, not a load-bearing action.
    try {
      fetch(`/api/partner/match/${matchId}/email-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        keepalive: true,
      }).catch(() => {
        // Intentionally swallowed — see comment above.
      })
    } catch {
      // Same — never block the navigation.
    }
    setEmailed(true)
    // Don't preventDefault: the <a href="mailto:..."> takes over from here.
  }

  return (
    <a
      href={mailtoHref}
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-lg font-semibold text-white px-5 py-2.5 text-[14px] transition-all duration-150 hover:brightness-110 active:scale-[0.97] shrink-0"
      style={{
        background: 'var(--gem-accent)',
        boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
      }}
    >
      {emailed ? (
        <>
          <Check size={15} strokeWidth={2.5} />
          Emailed
        </>
      ) : (
        <>
          <Mail size={15} strokeWidth={2.25} />
          Reply via email
        </>
      )}
    </a>
  )
}
