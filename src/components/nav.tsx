'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  LogOut,
  Menu,
  X,
  Plus,
  Sparkles,
} from 'lucide-react'
import {
  NavUserMenu,
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

// LOGGED-OUT NAV:
//   Desktop: [GEM]   [Opportunities]  [Blog]   [Submit a script]  [Sign up]  [Log in]
//   Mobile:  [GEM]                          [Submit] [☰]
//
// LOGGED-IN NAV (consideration model v1):
//   Desktop: [GEM]   [Opportunities] [Scripts] [Feedback]   [Request consideration]  [avatar]
//   Mobile:  [GEM]                     [Request consideration] [☰]

const PUBLIC_NAV_LINKS: { href: string; label: string }[] = [
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/blog', label: 'Blog' },
]

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
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // Logged-in nav tabs — consideration model (2026-05-05).
  const loggedInLinks = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/scripts', label: 'Scripts', icon: FileText },
    { href: '/review', label: 'Reviews', icon: Sparkles },
    { href: '/opportunities', label: 'Open Calls', icon: Briefcase },
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
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2">
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
                  {loggedInLinks.map(link => {
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
                  <div className="ml-2">
                    <NewActionMenu />
                  </div>
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
                      className="ml-2 p-1.5 rounded-lg text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] transition-colors"
                      title="Sign out"
                    >
                      <LogOut size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile logged-in — consideration CTA always visible + hamburger */}
              <div className="md:hidden flex items-center gap-2">
                <NewActionMenu />
                {userData && (
                  <NavUserMenu
                    profile={userData.profile}
                    stats={userData.stats}
                    recentActivity={userData.recentActivity}
                    onSignOut={handleSignOut}
                  />
                )}
                <button
                  className="p-1.5 text-[var(--gem-gray-300)]"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Desktop logged-out — flat links + Submit + Sign up + Log in */}
              <div className="hidden md:flex items-center gap-3">
                {PUBLIC_NAV_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm transition-colors ${
                      pathname.startsWith(link.href)
                        ? 'text-[var(--gem-white)] font-semibold'
                        : 'text-[var(--gem-gray-300)] hover:text-[var(--gem-white)]'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/submit"
                  className="text-sm px-4 py-1.5 rounded-lg bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors font-semibold"
                >
                  Submit a script
                </Link>
                <Link
                  href="/signup"
                  className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors"
                >
                  Sign up
                </Link>
                <span aria-hidden className="w-px h-4 bg-[var(--gem-gray-700)]" />
                <Link
                  href="/login"
                  className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors"
                >
                  Log in
                </Link>
              </div>

              {/* Mobile logged-out — Submit pill + hamburger. Learn more
                  sub-items + Sign up + Log in live in the hamburger. */}
              <div className="md:hidden flex items-center gap-2">
                {!pathname.startsWith('/submit') && (
                  <Link
                    href="/submit"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{
                      background: 'var(--gem-accent)',
                      boxShadow: '0 4px 12px rgba(124,58,237,0.30)',
                    }}
                  >
                    <Plus size={13} />
                    Submit
                  </Link>
                )}
                <button
                  className="p-1.5 text-[var(--gem-gray-300)]"
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
            {user ? (
              <>
                {loggedInLinks.map(link => (
                  <NavMenuRow
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    icon={<link.icon size={15} />}
                    label={link.label}
                    active={pathname.startsWith(link.href)}
                  />
                ))}

                {/* Blog */}
                <div className="pt-2 space-y-2">
                  <NavMenuRow
                    href="/blog"
                    onClick={() => setMobileOpen(false)}
                    label="Blog"
                    active={pathname.startsWith('/blog')}
                  />
                </div>

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
                {/* Browse links */}
                <div className="space-y-2">
                  {PUBLIC_NAV_LINKS.map(link => (
                    <NavMenuRow
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      label={link.label}
                      active={pathname.startsWith(link.href)}
                    />
                  ))}
                </div>

                {/* Account actions — separated by a divider so they read
                    as a different group from the marketing pages. */}
                <div className="pt-2 border-t border-[var(--gem-gray-700)] space-y-2">
                  <NavMenuRow
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    label="Sign up"
                    hint="Free first read"
                  />
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
