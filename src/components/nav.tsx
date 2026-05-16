'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import {
  LayoutDashboard,
  Briefcase,
  Compass,
} from 'lucide-react'
import {
  type NavUserMenuProfile,
  type NavUserMenuStats,
  type NavUserMenuActivity,
} from '@/components/nav/nav-user-menu'
import { NewActionMenu } from '@/components/nav/new-action-menu'

export interface NavUserData {
  profile: NavUserMenuProfile
  stats: NavUserMenuStats
  recentActivity?: NavUserMenuActivity[]
}

// NAV (unified layout):
//   Logged in:  [GEM]  [Home] [Scripts] [Reviews] [Opportunities]  [+ New]  [avatar]
//   Logged out: [GEM]  [Home] [Scripts] [Reviews] [Opportunities]  [Get started]
//   Mobile:     [GEM]                              [CTA] [☰]

interface NavProps {
  /** Server-provided profile data for the avatar dropdown. Optional —
   *  when omitted (e.g. on marketing pages that mount <Nav/> bare), the
   *  avatar dropdown isn't rendered and we fall back to a small Sign out
   *  button. (Anuj 2026-04-30 v0.10.5.) */
  userData?: NavUserData
}

export default function Nav({ userData }: NavProps = {}) {
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState<{ id: string } | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  // Nav tabs — same structure for logged-in and logged-out.
  // "Home" points to /dashboard (logged in) or / (logged out).
  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/leaderboard', label: 'Leaderboard', icon: Compass },
    { href: '/opportunities', label: 'Opportunities', icon: Briefcase },
  ]

  return (
    <>
      {/* Spacer matching nav height — needed because the nav is `fixed`,
          not `sticky` (sticky breaks under layout's overflow-x-hidden
          wrapper). The spacer reserves the layout slot so page content
          starts below the nav instead of underneath it. */}
      <div className="h-14" aria-hidden />
      <nav className="border-b border-[var(--gem-gray-700)] bg-[var(--gem-black)]/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-3 h-3 rotate-45"
              style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)',
              }}
            />
            <span className="text-lg font-bold tracking-tight">GEM</span>
          </Link>

          {user ? (
            <>
              {/* Desktop logged-in — flat nav links on the right */}
              <div className="hidden md:flex flex-1 items-center justify-end ml-6">
                <div className="flex items-center gap-1">
                  {navLinks.map(link => {
                    const Icon = link.icon
                    const active = pathname.startsWith(link.href)
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          active
                            ? 'text-[var(--gem-white)] font-semibold'
                            : 'text-[var(--gem-gray-400)] hover:text-[var(--gem-white)]'
                        }`}
                      >
                        <Icon size={16} />
                        {link.label}
                        {active && (
                          <span
                            aria-hidden
                            className="absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full"
                            style={{ background: 'linear-gradient(90deg,#a78bfa 0%,#7c3aed 100%)' }}
                          />
                        )}
                      </Link>
                    )
                  })}
                  {userData && !userData.profile.isPro && (
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))}
                      className="ml-2 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 hover:brightness-110 cursor-pointer border-0 text-white"
                      style={{
                        background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                      }}
                    >
                      Become a Member
                    </button>
                  )}
                  <div className="ml-2">
                    <NewActionMenu />
                  </div>
                </div>
              </div>

              {/* Mobile logged-in — compact: upgrade CTA + new action menu. Nav handled by bottom tab bar. */}
              <div className="md:hidden flex items-center gap-2">
                {userData && !userData.profile.isPro && (
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-md cursor-pointer border-0 text-white"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                  >
                    Member
                  </button>
                )}
                <NewActionMenu />
              </div>
            </>
          ) : (
            <>
              {/* Desktop logged-out — same links as logged-in + Sign up button */}
              <div className="hidden md:flex flex-1 items-center justify-end ml-6">
                <div className="flex items-center gap-1">
                  {navLinks.map(link => {
                    const Icon = link.icon
                    const active = link.href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(link.href)
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          active
                            ? 'text-[var(--gem-white)] font-semibold'
                            : 'text-[var(--gem-gray-400)] hover:text-[var(--gem-white)]'
                        }`}
                      >
                        <Icon size={16} />
                        {link.label}
                        {active && (
                          <span
                            aria-hidden
                            className="absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full"
                            style={{ background: 'linear-gradient(90deg,#a78bfa 0%,#7c3aed 100%)' }}
                          />
                        )}
                      </Link>
                    )
                  })}
                  <Link
                    href="/login"
                    className="ml-1 text-sm text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] transition-colors"
                  >
                    Log in
                  </Link>
                </div>
              </div>

              {/* Mobile logged-out — nav handled by bottom tab bar */}
              <div className="md:hidden flex items-center gap-2">
              </div>
            </>
          )}
        </div>

        {/* Mobile navigation is handled by the bottom tab bar (MobileTabBar) */}
      </nav>
    </>
  )
}

