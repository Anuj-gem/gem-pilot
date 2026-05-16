'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  children: React.ReactNode
  profile?: any
  stats?: any
  recentActivity?: any
}

export function AppRail({ children, profile, stats }: Props) {
  const pathname = usePathname()

  // Hide sidebar on report pages — they need the full width
  const hideRail = pathname.startsWith('/report/')

  if (hideRail) {
    return <main className="min-w-0 py-4">{children}</main>
  }

  const fullName = profile?.full_name || 'Guest'
  const avatarUrl = profile?.avatar_url
  const isPro = profile?.isPro
  const headline = profile?.headline || null
  const heatScore = profile?.heatScore ?? 0
  const initial = (fullName?.[0] || 'G').toUpperCase()

  const scriptCount = stats?.scripts ?? 0
  const applicationCount = stats?.reviewsGiven ?? 0

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    )},
    { href: '/scripts', label: 'My Scripts', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    )},
    { href: '/review', label: 'Applications', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    )},
    { href: '/opportunities', label: 'Opportunities', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )},
    { href: '/leaderboard', label: 'Leaderboard', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    )},
  ]

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/script' || pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex min-h-screen">
      {/* Light sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[280px] shrink-0 fixed top-0 left-0 h-screen z-40 overflow-y-auto border-r"
        style={{ background: '#ffffff', borderColor: '#e5e7eb' }}
      >
        {/* GEM logo */}
        <div className="px-5 pt-5 pb-4">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <span style={{ color: '#a855f7', fontSize: '20px' }}>◆</span>
            <span className="font-bold text-lg tracking-tight" style={{ color: '#111827' }}>GEM</span>
          </Link>
        </div>

        {/* Profile hub */}
        <div className="px-5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover" />
            ) : (
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-[16px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
              >
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold m-0 leading-tight truncate" style={{ color: '#111827' }}>
                {fullName}
              </p>
              <p className="text-[12px] m-0 mt-0.5" style={{ color: isPro ? '#7c3aed' : '#9ca3af' }}>
                {isPro ? 'GEM Pro' : 'Free'}
              </p>
            </div>
          </div>

          {/* Bio */}
          {headline ? (
            <p className="text-[13px] leading-relaxed m-0 mb-3" style={{ color: '#6b7280' }}>
              {headline}
            </p>
          ) : (
            <Link
              href="/settings"
              className="text-[12px] font-medium no-underline mb-3 block"
              style={{ color: '#9ca3af' }}
            >
              + Add a bio
            </Link>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center rounded-lg py-2" style={{ background: '#f9fafb' }}>
              <p className="text-[18px] font-bold m-0 leading-none" style={{ color: '#111827' }}>{scriptCount}</p>
              <p className="text-[10px] font-medium m-0 mt-1 uppercase tracking-wide" style={{ color: '#9ca3af' }}>Scripts</p>
            </div>
            <div className="text-center rounded-lg py-2" style={{ background: '#f9fafb' }}>
              <p className="text-[18px] font-bold m-0 leading-none" style={{ color: '#111827' }}>{applicationCount}</p>
              <p className="text-[10px] font-medium m-0 mt-1 uppercase tracking-wide" style={{ color: '#9ca3af' }}>Apps</p>
            </div>
            <div className="text-center rounded-lg py-2" style={{ background: '#fff7ed' }}>
              <p className="text-[18px] font-bold m-0 leading-none" style={{ color: '#ea580c' }}>{heatScore}</p>
              <p className="text-[10px] font-medium m-0 mt-1 uppercase tracking-wide" style={{ color: '#ea580c' }}>🔥 Heat</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 mb-3" style={{ borderTop: '1px solid #f3f4f6' }} />

        {/* Nav links */}
        <nav className="px-3 flex-1">
          <ul className="list-none p-0 m-0 space-y-0.5">
            {links.map(link => {
              const active = isActive(link.href)
              return (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors no-underline"
                    style={{
                      color: active ? '#7c3aed' : '#374151',
                      background: active ? '#f3f0ff' : 'transparent',
                    }}
                  >
                    <span style={{ color: active ? '#7c3aed' : '#9ca3af' }}>
                      {link.icon}
                    </span>
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Settings link at bottom */}
        <div className="px-3 pb-4 mt-auto">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors no-underline"
            style={{ color: '#9ca3af' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Settings
          </Link>
        </div>
      </aside>

      {/* Main content area — dark background, offset by sidebar */}
      <main className="min-w-0 flex-1 lg:ml-[280px]" style={{ background: '#13111a' }}>
        {children}
      </main>
    </div>
  )
}
