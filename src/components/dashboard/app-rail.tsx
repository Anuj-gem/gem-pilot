'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  children: React.ReactNode
  profile?: any
  stats?: any
  recentActivity?: any
}

export function AppRail({ children, profile }: Props) {
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

  return (
    <div className="flex min-h-screen">
      {/* Light sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[260px] shrink-0 fixed top-0 left-0 h-screen z-40 overflow-y-auto border-r"
        style={{ background: '#ffffff', borderColor: '#e5e7eb' }}
      >
        {/* GEM logo */}
        <div className="px-5 pt-5 pb-5">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <span style={{ color: '#a855f7', fontSize: '20px' }}>◆</span>
            <span className="font-bold text-lg tracking-tight" style={{ color: '#111827' }}>GEM</span>
          </Link>
        </div>

        {/* User card */}
        <div className="px-5 mb-5">
          <div className="flex items-center gap-3">
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
              <p className="text-[14px] font-semibold m-0 leading-tight" style={{ color: '#111827' }}>
                Hi, {fullName.split(' ')[0]}
              </p>
              <p className="text-[12px] m-0 mt-0.5" style={{ color: '#9ca3af' }}>
                {isPro ? 'Pro' : 'Guest'}
              </p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="px-3">
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
      </aside>

      {/* Main content area — dark background, offset by sidebar */}
      <main className="min-w-0 flex-1 lg:ml-[260px]" style={{ background: '#13111a' }}>
        {children}
      </main>
    </div>
  )
}
