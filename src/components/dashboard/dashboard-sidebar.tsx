// DashboardSidebar — matches prototype Screen 5.
// Avatar circle + name + plan label + nav links + upgrade card.
// Only renders on /dashboard (hidden on /report, /discover, etc).
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface DashboardSidebarProps {
  fullName: string | null
  isPro: boolean
  avatarUrl: string | null
}

export function DashboardSidebar({ fullName, isPro, avatarUrl }: DashboardSidebarProps) {
  const pathname = usePathname()

  // Show sidebar on all main app pages
  const appRoutes = ['/dashboard', '/submit', '/scripts', '/applications', '/opportunities', '/discover', '/profile']
  const showSidebar = appRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))

  if (!showSidebar) return null

  const initial = (fullName || 'U').charAt(0).toUpperCase()

  const sidebarLinks = [
    {
      href: '/submit',
      label: 'Submit',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
      exact: true,
    },
    {
      href: '/scripts',
      label: 'My Scripts',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
    },
    {
      href: '/applications',
      label: 'My Applications',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      href: '/opportunities',
      label: 'Opportunities',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    {
      href: '/discover',
      label: 'Discover',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
  ]

  const settingsLink = {
    href: '/profile',
    label: 'Settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside className="hidden lg:flex flex-col w-[240px] shrink-0 pt-2">
      {/* Avatar + name + plan */}
      <div className="flex flex-col items-center py-6">
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
        <p className="text-[15px] font-semibold text-gray-900 m-0">{fullName || 'Writer'}</p>
        <p className="text-[12px] text-gray-400 m-0 mt-0.5">
          {isPro ? 'Pro plan' : 'Free plan'}
        </p>
      </div>

      {/* Main nav links */}
      <nav className="flex-1 px-3">
        <ul className="list-none p-0 m-0 space-y-0.5">
          {sidebarLinks.filter(l => !(l as any).disabled).map(link => {
            const active = isActive(link.href, link.exact)
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

        <div className="my-3 border-t border-gray-200" />

        <ul className="list-none p-0 m-0">
          <li>
            <Link
              href={settingsLink.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                isActive(settingsLink.href)
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className={isActive(settingsLink.href) ? 'text-purple-600' : 'text-gray-400'}>{settingsLink.icon}</span>
              {settingsLink.label}
            </Link>
          </li>
        </ul>
      </nav>

      {/* Upgrade card — only for free users */}
      {!isPro && (
        <div className="mx-3 mb-4 mt-auto">
          <div className="border-t border-gray-200 pt-4">
            <div className="rounded-xl bg-gray-50 px-4 py-4">
              <p className="text-[13px] font-semibold text-gray-900 m-0">0 free evaluations left</p>
              <p className="text-[12px] text-gray-400 m-0 mt-1">$20/mo for unlimited</p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))}
                className="mt-3 w-full text-[12px] font-semibold py-2 rounded-lg text-white border-0 cursor-pointer transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
              >
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
