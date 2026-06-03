'use client'

// MobileTabBar — fixed bottom navigation for mobile/tablet users.
// Visible below `lg`, hidden above. Works for both anon and authed.
//
// Tabs: Dashboard · Discover · Opportunities · Profile (avatar sheet)
//
// The Profile tab opens a slide-up sheet instead of navigating.
// All props are server-provided via layout.tsx — no client auth calls.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Home, Compass, Briefcase, User } from 'lucide-react'
import { MobileProfileSheet } from './mobile-profile-sheet'

export interface MobileTabBarProps {
  isAnon: boolean
  userName?: string
  avatarUrl?: string | null
  headline?: string | null
  isPro?: boolean
  heatScore?: number
}

export function MobileTabBar({
  isAnon,
  userName,
  avatarUrl,
  headline,
  isPro,
  heatScore,
}: MobileTabBarProps) {
  const pathname = usePathname() ?? ''
  const [profileOpen, setProfileOpen] = useState(false)

  const tabs = [
    { href: '/dashboard',     label: 'Home',          icon: Home,     match: (p: string) => p === '/dashboard' || p === '/' },
    { href: '/discover',      label: 'Discover',      icon: Compass,  match: (p: string) => p.startsWith('/discover') || p.startsWith('/leaderboard') },
    { href: '/opportunities', label: 'Opportunities', icon: Briefcase, match: (p: string) => p.startsWith('/opportunities') },
  ] as const

  return (
    <>
      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="grid grid-cols-4">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = t.match(pathname)
            return (
              <li key={t.label}>
                <Link
                  href={t.href}
                  prefetch={false}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                    active ? 'text-purple-700' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                  <span className="text-[11px] font-semibold">{t.label}</span>
                </Link>
              </li>
            )
          })}

          {/* Profile tab — opens sheet instead of navigating */}
          <li>
            <button
              onClick={() => setProfileOpen(true)}
              className={`w-full flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors border-0 bg-transparent cursor-pointer ${
                profileOpen ? 'text-purple-700' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {!isAnon && avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-[18px] h-[18px] rounded-full object-cover"
                  style={profileOpen ? { outline: '2px solid #7c3aed', outlineOffset: '1px' } : {}}
                />
              ) : !isAnon && userName ? (
                <div
                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    ...(profileOpen ? { outline: '2px solid #7c3aed', outlineOffset: '1px' } : {}),
                  }}
                >
                  {userName.charAt(0).toUpperCase()}
                </div>
              ) : (
                <User size={18} strokeWidth={profileOpen ? 2.4 : 2} />
              )}
              <span className="text-[11px] font-semibold">Profile</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Profile slide-up sheet */}
      <MobileProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        isAnon={isAnon}
        userName={userName}
        avatarUrl={avatarUrl}
        headline={headline}
        isPro={isPro}
        heatScore={heatScore}
      />
    </>
  )
}
