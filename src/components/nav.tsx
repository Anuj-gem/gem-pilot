'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Send,
  Users,
  ChevronDown,
} from 'lucide-react'
import {
  type NavUserMenuProfile,
  type NavUserMenuStats,
  type NavUserMenuActivity,
  NavUserMenu,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])
  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false) }, [pathname])

  // Nav tabs — same structure for logged-in and logged-out.
  const [activityOpen, setActivityOpen] = useState(false)
  // Close activity dropdown on route change
  useEffect(() => { setActivityOpen(false) }, [pathname])

  const isProducer = userData?.profile.accountType === 'producer'

  const activitySubLinks = isProducer
    ? [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/partner', label: 'Manage Opportunities', icon: Briefcase },
        { href: '/scripts', label: 'My Scripts', icon: FileText },
      ]
    : [] // Writers: no dropdown — flat "My Projects" link replaces it

  const navLinks = [
    { href: '/discover', label: 'Discover', icon: null, emoji: '🔍' },
    { href: '/opportunities', label: 'Opportunities', icon: null, emoji: '💼' },
  ]

  // Resources dropdown state
  const [resourcesOpen, setResourcesOpen] = useState(false)
  useEffect(() => { setResourcesOpen(false) }, [pathname])

  return (
    <>
      {/* Spacer matching nav height — needed because the nav is `fixed`,
          not `sticky` (sticky breaks under layout's overflow-x-hidden
          wrapper). The spacer reserves the layout slot so page content
          starts below the nav instead of underneath it. */}
      <div className="h-14" aria-hidden />
      <nav className="border-b border-[var(--gem-gray-700)] bg-white/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
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
              {/* Desktop logged-in — My Activity dropdown + flat nav links */}
              <div className="hidden md:flex flex-1 items-center justify-end ml-6">
                <div className="flex items-center gap-1">
                  {/* Writers: flat "My Projects" link. Producers: dropdown. */}
                  {isProducer ? (
                    <div className="relative">
                      <button
                        onClick={() => setActivityOpen(v => !v)}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer border-0 bg-transparent ${
                          pathname === '/dashboard' || pathname.startsWith('/partner')
                            ? 'text-[var(--gem-white)] font-semibold'
                            : 'text-[var(--gem-gray-400)] hover:text-[var(--gem-white)]'
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#7c3aed" />
                          <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#a78bfa" />
                          <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#a78bfa" />
                          <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#7c3aed" />
                        </svg>
                        My Activity
                        <ChevronDown size={14} className={`transition-transform ${activityOpen ? 'rotate-180' : ''}`} />
                        {(pathname === '/dashboard' || pathname.startsWith('/partner')) && (
                          <span
                            aria-hidden
                            className="absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full"
                            style={{ background: 'linear-gradient(90deg,#a78bfa 0%,#7c3aed 100%)' }}
                          />
                        )}
                      </button>
                      {activityOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActivityOpen(false)} />
                          <div className="absolute left-0 top-full mt-2 bg-[#1e1b2e] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 min-w-[180px]">
                            {activitySubLinks.map(link => {
                              const Icon = link.icon
                              const active = link.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(link.href)
                              return (
                                <Link
                                  key={link.href}
                                  href={link.href}
                                  className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors no-underline ${
                                    active
                                      ? 'text-white font-semibold bg-white/10'
                                      : 'text-white/70 hover:text-white hover:bg-white/5'
                                  }`}
                                >
                                  <Icon size={15} />
                                  {link.label}
                                </Link>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <Link
                      href="/dashboard"
                      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors no-underline ${
                        pathname === '/dashboard'
                          ? 'text-[var(--gem-white)] font-semibold'
                          : 'text-[var(--gem-gray-400)] hover:text-[var(--gem-white)]'
                      }`}
                    >
                      <span className="text-[15px] leading-none">📁</span>
                      My Projects
                      {pathname === '/dashboard' && (
                        <span
                          aria-hidden
                          className="absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full"
                          style={{ background: 'linear-gradient(90deg,#a78bfa 0%,#7c3aed 100%)' }}
                        />
                      )}
                    </Link>
                  )}

                  {/* Flat nav links */}
                  {navLinks.map(link => {
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
                        <span className="text-[15px] leading-none">{link.emoji}</span>
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
                  {/* Resources dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setResourcesOpen(v => !v)}
                      className={`relative flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer border-0 bg-transparent ${
                        pathname.startsWith('/blog')
                          ? 'text-[var(--gem-white)] font-semibold'
                          : 'text-[var(--gem-gray-400)] hover:text-[var(--gem-white)]'
                      }`}
                    >
                      <span className="text-[15px] leading-none">📚</span>
                      Resources
                      <ChevronDown size={14} className={`transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
                      {pathname.startsWith('/blog') && (
                        <span aria-hidden className="absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg,#a78bfa 0%,#7c3aed 100%)' }} />
                      )}
                    </button>
                    {resourcesOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setResourcesOpen(false)} />
                        <div className="absolute left-0 top-full mt-2 bg-[#1e1b2e] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 min-w-[160px]">
                          <Link
                            href="/blog"
                            className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors no-underline ${
                              pathname.startsWith('/blog')
                                ? 'text-white font-semibold bg-white/10'
                                : 'text-white/70 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span className="text-[14px]">📝</span>
                            Blog
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                  {userData && !userData.profile.isPro && userData.profile.accountType !== 'producer' && (
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
                  {(!userData || userData.profile.accountType !== 'producer') && (
                    <div className="ml-2">
                      <NewActionMenu />
                    </div>
                  )}
                  {userData && (
                    <div className="ml-2">
                      <NavUserMenu
                        profile={userData.profile}
                        stats={userData.stats}
                        recentActivity={userData.recentActivity}
                        onSignOut={async () => {
                          await supabase.auth.signOut()
                          window.location.href = '/'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile logged-in — hamburger menu */}
              <div className="md:hidden flex items-center gap-2">
                {(!userData || userData.profile.accountType !== 'producer') && <NewActionMenu />}
                <button
                  onClick={() => setMobileMenuOpen(v => !v)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent text-[var(--gem-white)] hover:bg-black/5 transition-colors"
                  aria-label="Menu"
                >
                  {mobileMenuOpen ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Desktop logged-out */}
              <div className="hidden md:flex flex-1 items-center justify-end ml-6">
                <div className="flex items-center gap-1">
                  {navLinks.map(link => {
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
                        <span className="text-[15px] leading-none">{link.emoji}</span>
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
                  {/* Resources dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setResourcesOpen(v => !v)}
                      className={`relative flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer border-0 bg-transparent ${
                        pathname.startsWith('/blog')
                          ? 'text-[var(--gem-white)] font-semibold'
                          : 'text-[var(--gem-gray-400)] hover:text-[var(--gem-white)]'
                      }`}
                    >
                      <span className="text-[15px] leading-none">📚</span>
                      Resources
                      <ChevronDown size={14} className={`transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
                      {pathname.startsWith('/blog') && (
                        <span aria-hidden className="absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg,#a78bfa 0%,#7c3aed 100%)' }} />
                      )}
                    </button>
                    {resourcesOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setResourcesOpen(false)} />
                        <div className="absolute left-0 top-full mt-2 bg-[#1e1b2e] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 min-w-[160px]">
                          <Link
                            href="/blog"
                            className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors no-underline ${
                              pathname.startsWith('/blog')
                                ? 'text-white font-semibold bg-white/10'
                                : 'text-white/70 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span className="text-[14px]">📝</span>
                            Blog
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                  <Link
                    href="/get-started"
                    className="ml-2 text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white no-underline transition-all duration-150 hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                  >
                    Get started
                  </Link>
                  <Link
                    href="/login"
                    className="ml-1 text-sm text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] transition-colors"
                  >
                    Log in
                  </Link>
                </div>
              </div>

              {/* Mobile logged-out — hamburger menu */}
              <div className="md:hidden flex items-center gap-2">
                <button
                  onClick={() => setMobileMenuOpen(v => !v)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent text-[var(--gem-white)] hover:bg-black/5 transition-colors"
                  aria-label="Menu"
                >
                  {mobileMenuOpen ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 px-4 pb-4 pt-2 bg-[#110f1d]">
            <div className="flex flex-col gap-1">
              {/* My Activity links */}
              {activitySubLinks.map(link => {
                const Icon = link.icon
                const active = link.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                      active ? 'text-white font-semibold bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={16} />
                    {link.label}
                  </Link>
                )
              })}
              <div className="border-t border-white/10 my-1" />
              {/* Other nav links */}
              {navLinks.map(link => {
                const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                      active ? 'text-white font-semibold bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="text-[15px] leading-none">{link.emoji}</span>
                    {link.label}
                  </Link>
                )
              })}
              {/* Resources links (mobile) */}
              <div className="border-t border-white/10 my-1" />
              <Link
                href="/blog"
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                  pathname.startsWith('/blog') ? 'text-white font-semibold bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-[15px] leading-none">📝</span>
                Blog
              </Link>
              {!user && (
                <>
                  <div className="border-t border-white/10 my-1" />
                  <Link href="/login" className="flex items-center px-3 py-2.5 rounded-lg text-[14px] text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                    Log in
                  </Link>
                  <Link
                    href="/get-started"
                    className="flex items-center justify-center px-3 py-2.5 rounded-lg text-[14px] font-semibold text-white no-underline"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                  >
                    Get started
                  </Link>
                </>
              )}
              {user && userData && !userData.profile.isPro && userData.profile.accountType !== 'producer' && (
                <>
                  <div className="border-t border-white/10 my-1" />
                  <button
                    onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal')) }}
                    className="flex items-center justify-center px-3 py-2.5 rounded-lg text-[14px] font-semibold text-white border-0 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                  >
                    Become a Member
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  )
}

