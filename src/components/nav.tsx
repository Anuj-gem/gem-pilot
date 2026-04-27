'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { LayoutDashboard, LogOut, Menu, X, FileText, Plus, Sparkles } from 'lucide-react'

export default function Nav() {
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

  // Industry tab intentionally removed from the signed-in nav as part of the
  // two-sided pivot — visibility happens via the Publish button on the
  // report, not a public Discover tab.
  const links = user ? [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ] : []

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
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)' }}
          />
          <span className="text-lg font-bold tracking-tight">GEM</span>
        </Link>

        {user ? (
          <>
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {links.map(link => {
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

            {/* Mobile nav — Submit pill (always) + hamburger (always).
                Submit is hidden ONLY on /submit itself (where it's redundant).
                Everything else — Industry, Dashboard, Sign Out — lives in
                the hamburger panel as designed pill rows. */}
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
            {/* Desktop logged-out — Industry tab removed as part of the
                two-sided pivot. */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/submit"
                className="text-sm px-4 py-1.5 rounded-lg bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
              >
                Submit
              </Link>
            </div>

            {/* Mobile logged-out — same pattern as logged-in: persistent
                Submit pill + hamburger. Industry / Log in / Sign up live in
                the hamburger panel. */}
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

      {/* Mobile menu — designed pill rows. Submit is intentionally NOT here
          (it lives as its own persistent button in the top bar). */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--gem-gray-700)] px-4 py-3 space-y-2">
          {user ? (
            <>
              {links.map(link => (
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
              <NavMenuRow
                href="/signup"
                onClick={() => setMobileOpen(false)}
                icon={<Sparkles size={15} />}
                label="Sign up"
                hint="Free first read"
              />
              <NavMenuRow
                href="/login"
                onClick={() => setMobileOpen(false)}
                icon={<FileText size={15} />}
                label="Log in"
              />
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
  icon: React.ReactNode
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
      <span
        className="flex-shrink-0 w-7 h-7 rounded-md grid place-items-center text-[var(--gem-gray-300)]"
        style={{ background: active ? 'rgba(124,58,237,0.15)' : 'var(--gem-gray-800)' }}
      >
        {icon}
      </span>
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
