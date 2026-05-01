'use client'

// AppRail — was the persistent left rail across logged-in pages.
//
// Anuj 2026-04-30 v0.10.5: the rail is gone. The profile control center
// it used to host (avatar + name + stats + view/edit + recent activity +
// sign out) now lives in the NavUserMenu dropdown in the top nav, so
// every page on every viewport gets the same one-tap path back to the
// user's profile. Mobile + desktop are now consistent.
//
// We keep this component as a thin pass-through so layout.tsx and any
// route that imports it doesn't need to change. Future cleanup: inline
// the children render into layout.tsx and delete this file.

interface Props {
  children: React.ReactNode
  // Props retained for back-compat with callers passing the old YourPanel
  // payload. We ignore them — kept only so the build doesn't break while
  // we tear out the rail end-to-end.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentActivity?: any
}

export function AppRail({ children }: Props) {
  return <main className="min-w-0 py-4">{children}</main>
}
