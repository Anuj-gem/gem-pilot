'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import {
  LayoutDashboard,
  Briefcase,
  LogOut,
  Menu,
  X,
  Compass,
} from 'lucide-react'
import {
  NavUserMenu,
  type NavUserMenuProfile,
  type NavUserMenuStats,
  type NavUserMenuActivity,
} from '@/components/nav/nav-user-menu'
// NewActionMenu removed from top nav — upload trigger moved to dashboard sidebar

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
  const router = useRouter()
  const supabase = createClient()
  // Use userData (server-provided) as the instant auth signal so we never
  // flash logged-out UI while the client-side check resolves.
  const [clientUser, setClientUser] = useState<{ id: string } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    if (!userData) {
      supabase.auth.getUser().then(({ data }) => setClientUser(data.user))
    }
  }, [])

  const isLoggedIn = !!userData || !!clientUser

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // Nav tabs — same 3 links for both logged-in and logged-out.
  // Only difference: logged-in "Home" points to /script.
  const navLinks = [
    { href: isLoggedIn ? '/submit' : '/', label: 'Home', icon: LayoutDashboard },
    { href: '/discover', label: 'Discover', icon: Compass },
    { href: '/opportunities', label: 'Opportunities', icon: Briefcase },
  ]

  return (
    <>
      {/* Spacer matching nav height — needed because the nav is `fixed`,
          not `sticky` (sticky breaks under layout's overflow-x-hidden
          wrapper). The spacer reserves the layout slot so page content
          starts below the nav instead of underneath it. */}
      <div className="h-14" aria-hidden />
      <nav className="border-b bg-[var(--gem-black)]/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-50" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={isLoggedIn ? '/submit' : '/'} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-3 h-3 rotate-45"
              style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)',
              }}
            />
            <span className="text-lg font-bold tracking-tight" style={{ color: '#ffffff' }}>GEM</span>
          </Link>

          {isLoggedIn ? (
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
                            ? 'font-semibold'
                            : 'hover:opacity-100'
                        }`}
                        style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.55)' }}
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
                  {userData ? (
                    <div className="ml-2">
                      <NavUserMenu
                        profile={userData.profile}
                        stats={userData.stats}
                        recentActivity={userData.recentActivity}
                        onSignOut={handleSignOut}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={handleSignOut}
                      className="ml-2 p-1.5 rounded-lg transition-colors"
                      style={{ color: 'rgba(255,255,255,0.55)' }}
                      title="Sign out"
                    >
                      <LogOut size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile logged-in — consideration CTA always visible + hamburger */}
              <div className="md:hidden flex items-center gap-2">
                {userData && (
                  <NavUserMenu
                    profile={userData.profile}
                    stats={userData.stats}
                    recentActivity={userData.recentActivity}
                    onSignOut={handleSignOut}
                  />
                )}
                <button
                  className="p-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
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
                            ? 'font-semibold'
                            : 'hover:opacity-100'
                        }`}
                        style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.55)' }}
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
                  <button
                    onClick={() => {
                      if (pathname === '/') {
                        window.dispatchEvent(new Event('gem:start-onboarding'))
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      } else {
                        window.location.href = '/onboarding'
                      }
                    }}
                    className="ml-2 text-sm px-4 py-1.5 rounded-lg text-white font-semibold transition-all duration-150 hover:brightness-110 cursor-pointer border-0"
                    style={{
                      background: 'var(--gem-accent)',
                      boxShadow: '0 4px 12px rgba(124,58,237,0.25)',
                    }}
                  >
                    Get started
                  </button>
                  <Link
                    href="/login"
                    className="ml-1 text-sm transition-colors hover:opacity-100"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    Log in
                  </Link>
                </div>
              </div>

              {/* Mobile logged-out — Sign up pill + hamburger */}
              <div className="md:hidden flex items-center gap-2">
                <button
                  onClick={() => {
                      if (pathname === '/') {
                        window.dispatchEvent(new Event('gem:start-onboarding'))
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      } else {
                        window.location.href = '/onboarding'
                      }
                    }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer border-0"
                  style={{
                    background: 'var(--gem-accent)',
                    boxShadow: '0 4px 12px rgba(124,58,237,0.30)',
                  }}
                >
                  Get started
                </button>
                <button
                  className="p-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--gem-gray-700)] px-4 py-3 space-y-3">
            {isLoggedIn ? (
              <>
                {navLinks.map(link => (
                  <NavMenuRow
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    icon={<link.icon size={15} />}
                    label={link.label}
                    active={pathname.startsWith(link.href)}
                  />
                ))}

                <button
                  onClick={() => { setMobileOpen(false); handleSignOut() }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors hover:bg-[var(--gem-gray-900)]"
                  style={{
                    border: '1px solid var(--gem-gray-700)',
                    background: 'var(--gem-gray-900)',
                  }}
                >
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-md grid place-items-center text-[var(--gem-gray-300)]"
                    style={{ background: 'var(--gem-gray-800)' }}
                  >
                    <LogOut size={15} />
                  </span>
                  <span className="text-[14px] font-semibold text-[var(--gem-gray-50)]">Sign out</span>
                </button>
              </>
            ) : (
              <>
                {/* Same nav links as logged-in */}
                {navLinks.map(link => (
                  <NavMenuRow
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    icon={<link.icon size={15} />}
                    label={link.label}
                    active={link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)}
                  />
                ))}

                <div className="pt-2 border-t border-[var(--gem-gray-700)] space-y-2">
                  <NavMenuRow
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    label="Log in"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </nav>
    </>
  )
}

function NavMenuRow({
  href,
  onClick,
  icon,
  label,
  hint,
  active = false,
}: {
  href: string
  onClick: () => void
  icon?: React.ReactNode
  label: string
  hint?: string
  active?: boolean
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors hover:bg-[var(--gem-gray-900)]"
      style={{
        border: `1px solid ${active ? 'var(--gem-accent)' : 'var(--gem-gray-700)'}`,
        background: active ? 'rgba(124,58,237,0.08)' : 'var(--gem-gray-900)',
      }}
    >
      {icon && (
        <span
          className="flex-shrink-0 w-7 h-7 rounded-md grid place-items-center text-[var(--gem-gray-300)]"
          style={{ background: active ? 'rgba(124,58,237,0.15)' : 'var(--gem-gray-800)' }}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold text-[var(--gem-gray-50)] leading-tight">
          {label}
        </span>
        {hint && (
          <span className="block text-[11.5px] text-[var(--gem-gray-500)] mt-0.5 leading-tight">
            {hint}
          </span>
        )}
      </span>
    </Link>
  )
}
