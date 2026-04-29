'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Plus,
  ChevronDown,
} from 'lucide-react'

// LOGGED-OUT NAV (Anuj 2026-04-28 redesign):
//   Desktop: [GEM]   [Learn more ▾]   [Submit a script]  [Sign up]  [Log in]
//   Mobile:  [GEM]                          [Submit] [☰]
//   Hamburger: Learn more (For writers / For producers / About Selznick),
//              Sign up, Log in.
//
// Same nav renders on every marketing page (/, /writers, /industry,
// /selznick, /login, /signup) so the user can always navigate back to
// any other page without learning a new chrome layout.
//
// LOGGED-IN NAV: unchanged — Dashboard, Submit, Sign out.

const LEARN_MORE_LINKS: { href: string; label: string; description: string }[] = [
  {
    href: '/writers',
    label: 'For writers',
    description: 'Upload, get a producer-grade read, share with anyone.',
  },
  {
    href: '/industry',
    label: 'For producers',
    description: 'Filter the matched feed and reach writers directly.',
  },
  {
    href: '/selznick',
    label: 'About Selznick',
    description: 'How GEM reads every script.',
  },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [learnMoreOpen, setLearnMoreOpen] = useState(false)
  const learnMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  // Close the desktop "Learn more" dropdown on outside click + Escape.
  useEffect(() => {
    if (!learnMoreOpen) return
    function onDocClick(e: MouseEvent) {
      if (!learnMoreRef.current) return
      if (!learnMoreRef.current.contains(e.target as Node)) setLearnMoreOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLearnMoreOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [learnMoreOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const loggedInLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
              {/* Desktop logged-in */}
              <div className="hidden md:flex items-center gap-1">
                {loggedInLinks.map(link => {
                  const Icon = link.icon
                  const active = pathname.startsWith(link.href)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        active
                          ? 'bg-[var(--gem-gray-800)] text-[var(--gem-white)] font-medium'
                          : 'text-[var(--gem-gray-400)] hover:text-[var(--gem-white)]'
                      }`}
                    >
                      <Icon size={16} />
                      {link.label}
                    </Link>
                  )
                })}
                <Link
                  href="/submit"
                  className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
                >
                  <Plus size={16} />
                  Submit
                </Link>
                <button
                  onClick={handleSignOut}
                  className="ml-2 p-1.5 rounded-lg text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] transition-colors"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>

              {/* Mobile logged-in — Submit pill (always except on /submit
                  itself) + hamburger. */}
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
          ) : (
            <>
              {/* Desktop logged-out — Learn more dropdown + Submit primary
                  + Sign up + Log in (to the side). */}
              <div className="hidden md:flex items-center gap-3">
                <div ref={learnMoreRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setLearnMoreOpen(o => !o)}
                    aria-expanded={learnMoreOpen}
                    aria-haspopup="menu"
                    className={`inline-flex items-center gap-1 text-sm transition-colors ${
                      LEARN_MORE_LINKS.some(l => pathname.startsWith(l.href))
                        ? 'text-[var(--gem-white)]'
                        : 'text-[var(--gem-gray-300)] hover:text-[var(--gem-white)]'
                    }`}
                  >
                    Learn more
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${learnMoreOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {learnMoreOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-2 min-w-[280px] rounded-xl bg-white p-2 z-50"
                      style={{
                        border: '1px solid var(--gem-gray-700)',
                        boxShadow: '0 18px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.05)',
                      }}
                    >
                      {LEARN_MORE_LINKS.map(link => {
                        const active = pathname.startsWith(link.href)
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setLearnMoreOpen(false)}
                            role="menuitem"
                            className="block px-3 py-2 rounded-lg transition-colors hover:bg-[var(--gem-gray-900)]"
                            style={
                              active
                                ? { background: 'rgba(124,58,237,0.06)' }
                                : undefined
                            }
                          >
                            <span className="block text-[13.5px] font-semibold text-[var(--gem-gray-50)] leading-tight">
                              {link.label}
                            </span>
                            <span className="block text-[12px] text-[var(--gem-gray-400)] leading-snug mt-0.5">
                              {link.description}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
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
                {/* Learn more group — small section header + the three
                    sub-pages as direct rows. Avoids a nested
                    accordion-in-a-hamburger UX. */}
                <div>
                  <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-2 px-1">
                    Learn more
                  </p>
                  <div className="space-y-2">
                    {LEARN_MORE_LINKS.map(link => (
                      <NavMenuRow
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        label={link.label}
                        hint={link.description}
                        active={pathname.startsWith(link.href)}
                      />
                    ))}
                  </div>
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
