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

  const fullName = profile?.full_name || 'Writer'
  const avatarUrl = profile?.avatar_url
  const isPro = profile?.isPro
  const initial = (fullName?.[0] || 'W').toUpperCase()

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
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-[220px] shrink-0 sticky top-20 self-start">
        {/* Avatar + name */}
        <div className="flex flex-col items-center mb-5 pt-2">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover mb-2" />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-[22px] font-bold text-white mb-2"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
            >
              {initial}
            </div>
          )}
          <p className="text-[15px] font-semibold text-gray-900 m-0">{fullName}</p>
          <p className="text-[12px] text-gray-400 m-0 mt-0.5">
            {isPro ? 'Pro plan' : 'Free plan'}
          </p>
        </div>

        {/* Nav links */}
        <nav className="px-1">
          <ul className="list-none p-0 m-0 space-y-0.5">
            {links.map(link => {
              const active = isActive(link.href)
              return (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                      active
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className={active ? 'text-purple-600' : 'text-gray-400'}>{link.icon}</span>
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* Page content */}
      <main className="min-w-0 flex-1 py-4">{children}</main>
    </div>
  )
}
