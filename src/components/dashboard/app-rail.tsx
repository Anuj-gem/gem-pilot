'use client'

// AppRail — the persistent left rail across all logged-in (app) pages.
// Wraps YourPanel and decides per-route whether to render it or yield
// the canvas to the page (e.g. on /report/[id] which is reader mode).
//
// Layout:
//   ┌─────────────┬──────────────────────────────────┐
//   │ rail (280)  │  children (flex-1)               │
//   └─────────────┴──────────────────────────────────┘
//
// Below `lg`, the rail collapses entirely — the bottom tab bar takes
// over for navigation and the canvas renders edge-to-edge.
//
// Anuj 2026-04-30 v0.7.

import { usePathname } from 'next/navigation'
import { YourPanel, type YourPanelProfile } from './your-panel'

interface Props {
  profile: YourPanelProfile
  stats: {
    scripts: number
    followers: number
    following: number
    reviewsGiven: number
  }
  children: React.ReactNode
}

export function AppRail({ profile, stats, children }: Props) {
  const pathname = usePathname() ?? ''
  // Reader-mode pages give the canvas the full width — no rail. The
  // top nav still shows where the user is, so they're not lost.
  const railHidden = pathname.startsWith('/report')

  if (railHidden) {
    return <div className="w-full">{children}</div>
  }

  return (
    <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
      <aside className="hidden lg:block lg:sticky lg:top-4 self-start py-4">
        <YourPanel profile={profile} stats={stats} />
      </aside>
      <main className="min-w-0 py-4">{children}</main>
    </div>
  )
}
