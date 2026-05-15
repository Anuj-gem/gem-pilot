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
  const initial = (fullName?.[0] || 'G').toUpperCase()

  const links = [
    { href: '/dashboard', label: 'New Script', isNew: true, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    )},
    { href: '/scripts', label: 'My History', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    )},
    { href: '/opportunities', label: 'Opportunities', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )},
    { href: '/discover', label: 'Discover', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    )},
  ]

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/script' || pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  // Stats from server
  const scriptsSubmitted = stats?.scripts ?? 0
  const pending = stats?.pending ?? 0
  const industryMatches = stats?.industryMatches ?? 0
  const avgScore = stats?.avgScore ?? null
  const insiderHeat = stats?.insiderHeat ?? 0

  return (
    <div className="flex min-h-screen">
      {/* Dark sidebar — fixed left */}
      <aside
        className="hidden lg:flex flex-col w-[260px] shrink-0 fixed top-0 left-0 h-screen z-40 overflow-y-auto"
        style={{ background: 'linear-gradient(180deg, #1a1025 0%, #0f0a18 100%)' }}
      >
        {/* GEM logo */}
        <div className="px-5 pt-5 pb-4">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <span style={{ color: '#a855f7', fontSize: '20px' }}>◆</span>
            <span className="text-white font-bold text-lg tracking-tight">GEM</span>
          </Link>
        </div>

        {/* User card */}
        <div className="px-5 mb-5">
          <div className="flex items-center gap-3 mb-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
              >
                {initial}
              </div>
            )}
            <div>
              <p className="text-[14px] font-semibold text-white m-0 leading-tight">Hi, {fullName.split(' ')[0]}</p>
              <p className="text-[12px] m-0 mt-0.5" style={{ color: '#9ca3af' }}>
                {isPro ? 'Pro' : 'Guest'}
              </p>
            </div>
          </div>
          {!isPro && (
            <Link
              href="/pricing"
              className="block w-full text-center py-2 rounded-lg text-[13px] font-semibold no-underline transition-colors"
              style={{
                border: '1px solid #a855f7',
                color: '#a855f7',
                background: 'transparent',
              }}
            >
              Create account to save
            </Link>
          )}
        </div>

        {/* Nav links */}
        <nav className="px-3 flex-1">
          <ul className="list-none p-0 m-0 space-y-0.5">
            {links.map(link => {
              const active = isActive(link.href)
              const isNewScript = (link as any).isNew
              return (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors no-underline"
                    style={{
                      color: isNewScript ? '#a855f7' : active ? '#ffffff' : '#9ca3af',
                      background: active && !isNewScript ? 'rgba(168,85,247,0.12)' : 'transparent',
                    }}
                  >
                    <span style={{ color: isNewScript ? '#a855f7' : active ? '#a855f7' : '#6b7280' }}>
                      {link.icon}
                    </span>
                    {isNewScript && <span style={{ color: '#a855f7', marginRight: '-4px' }}>+</span>}
                    {link.label}
                    {link.label === 'My History' && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto" style={{ color: '#6b7280' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Stats section at bottom */}
        <div className="px-5 pb-5 mt-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wider m-0 mb-3" style={{ color: '#6b7280' }}>
            Your Stats
          </p>
          <div className="space-y-2">
            {[
              { label: 'Scripts submitted', value: scriptsSubmitted },
              { label: 'Pending', value: pending },
              { label: 'Industry matches', value: industryMatches },
              { label: 'Avg GEM score', value: avgScore !== null ? avgScore : '—' },
              { label: 'Insider heat', value: insiderHeat, highlight: true },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: '#9ca3af' }}>{stat.label}</span>
                <span
                  className="text-[13px] font-semibold"
                  style={{ color: stat.highlight ? '#f59e0b' : '#ffffff' }}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Warning for unsaved work */}
          {!profile?.full_name && (
            <div
              className="mt-4 px-3 py-2.5 rounded-lg text-[12px] leading-snug"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              Your work isn&apos;t saved yet. Create an account or it&apos;ll be lost if you leave.
            </div>
          )}
        </div>
      </aside>

      {/* Main content area — offset by sidebar width */}
      <main className="min-w-0 flex-1 lg:ml-[260px]">
        {children}
      </main>
    </div>
  )
}
