'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { LayoutDashboard, Trophy, LogOut, Menu, X, FileText, Home, Plus } from 'lucide-react'

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

  const links = user ? [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/discover', label: 'Leaderboard', icon: Trophy },
  ] : []

  return (
    <nav className="border-b border-[var(--gem-gray-700)] bg-[var(--gem-black)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2">
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

            {/* Mobile nav — context-aware quick actions + hamburger */}
            <div className="md:hidden flex items-center gap-1">
              {pathname.startsWith('/discover') ? (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-[var(--gem-gray-300)] transition-colors"
                >
                  <Home size={16} />
                </Link>
              ) : (
                <Link
                  href="/discover"
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    pathname.startsWith('/discover')
                      ? 'bg-[var(--gem-gray-800)] text-[var(--gem-white)] font-medium'
                      : 'text-[var(--gem-gray-400)]'
                  }`}
                >
                  <Trophy size={16} />
                  Leaderboard
                </Link>
              )}
              {!pathname.startsWith('/submit') && (
                <Link
                  href="/submit"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-[var(--gem-accent)] text-white"
                >
                  <Plus size={14} />
                  Submit
                </Link>
              )}
              <button
                className="p-2 text-[var(--gem-gray-300)]"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/discover"
              className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors"
            >
              Leaderboard
            </Link>
            <Link
              href="/login"
              className="text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm px-4 py-1.5 rounded-lg bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Join GEM
            </Link>
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {mobileOpen && user && (
        <div className="md:hidden border-t border-[var(--gem-gray-700)] px-4 py-3 space-y-1">
          {links.map(link => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] hover:bg-[var(--gem-gray-800)]"
              >
                <Icon size={16} />
                {link.label}
              </Link>
            )
          })}
          <Link
            href="/submit"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[var(--gem-accent)] text-white"
          >
            <Plus size={16} />
            Submit
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] w-full text-left"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  )
}
