'use client'

// MatchViewTracker — passive view tracker for /partner inbox cards.
//
// Wraps a match card and watches for it to enter the viewport. When the
// card is >=50% visible for >=800ms, fires a fire-and-forget POST to
// /api/partner/match/[matchId]/seen which flips status pending → opened.
// That makes the writer's "viewed" count reflect real scroll-past
// exposure, not just clicks-into-detail.
//
// Behavior:
//   - threshold: 0.5 (half the card on screen)
//   - dwell: 800ms before firing (debounce against quick scrolls;
//     setTimeout is cleared if the card scrolls out before it fires)
//   - sessionStorage dedupe: each matchId is pinged at most once per
//     browser session
//   - only runs when initialStatus === 'pending'; for any other status
//     the component renders {children} and does nothing (the API would
//     no-op anyway, but skipping the request avoids unnecessary traffic
//     and console noise)
//   - keepalive: true on fetch so the request survives client-side
//     navigation if the producer clicks through
//
// Layout: the wrapping div uses display: contents so it doesn't disrupt
// the parent's layout (works inside flex/grid/space-y rails).

import { useEffect, useRef } from 'react'

interface MatchViewTrackerProps {
  matchId: string
  initialStatus: string
  children: React.ReactNode
}

const DWELL_MS = 800
const VIEW_THRESHOLD = 0.5
// Bumping this prefix invalidates the per-session dedupe (e.g. if we ever
// want to re-fire after a deploy). Kept narrow on purpose so it doesn't
// collide with anything else in sessionStorage.
const SESSION_KEY_PREFIX = 'gem:partner:match-seen:'

export function MatchViewTracker({
  matchId,
  initialStatus,
  children,
}: MatchViewTrackerProps) {
  const observerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Only track cards that are still pending — anything else is a stronger
    // state and the API would no-op anyway. Skip the observer setup entirely
    // to avoid wasted work.
    if (initialStatus !== 'pending') return

    const node = observerRef.current
    if (!node) return

    // SSR guard + IntersectionObserver feature check (older browsers).
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return
    }

    const sessionKey = `${SESSION_KEY_PREFIX}${matchId}`

    // Already pinged this session — don't re-attach the observer.
    try {
      if (window.sessionStorage.getItem(sessionKey)) return
    } catch {
      // sessionStorage can throw in private browsing / iframes — fall
      // through and just observe; worst case we double-fire, which the
      // server endpoint handles idempotently.
    }

    let dwellTimer: ReturnType<typeof setTimeout> | null = null
    let fired = false

    const fire = () => {
      if (fired) return
      fired = true
      try {
        window.sessionStorage.setItem(sessionKey, '1')
      } catch {
        // ignore — see above
      }
      // Fire-and-forget. keepalive lets the request finish if the
      // producer clicks through to the script detail page mid-flight.
      void fetch(`/api/partner/match/${matchId}/seen`, {
        method: 'POST',
        keepalive: true,
      }).catch(() => {
        // Swallow — passive tracking, nothing for the user to see.
      })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= VIEW_THRESHOLD) {
            // Card is visible enough — start the dwell timer if it isn't
            // already running.
            if (dwellTimer === null && !fired) {
              dwellTimer = setTimeout(() => {
                dwellTimer = null
                fire()
                // Once we've fired, stop watching this node.
                observer.disconnect()
              }, DWELL_MS)
            }
          } else {
            // Card scrolled away (or past the threshold) before the timer
            // elapsed — cancel the pending fire.
            if (dwellTimer !== null) {
              clearTimeout(dwellTimer)
              dwellTimer = null
            }
          }
        }
      },
      { threshold: VIEW_THRESHOLD }
    )

    observer.observe(node)

    return () => {
      if (dwellTimer !== null) {
        clearTimeout(dwellTimer)
        dwellTimer = null
      }
      observer.disconnect()
    }
  }, [matchId, initialStatus])

  // Plain block wrapper. We deliberately don't use display:contents
  // because IntersectionObserver needs a layout box to report
  // intersections — display:contents removes the element from the box
  // tree and the observer never fires. A bare div sits transparently
  // inside the parent's space-y / flex / grid rails (it inherits the
  // child card's bounding box and adds zero visual styling), so layout
  // is unchanged but the observer has something to watch.
  return <div ref={observerRef}>{children}</div>
}
