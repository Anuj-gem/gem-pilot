'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Compass, FolderOpen, MessageCircle, User, Plus, LogOut, Menu, X } from 'lucide-react'

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
    { href: '/discover', label: 'Discover', icon: Compass },
    { href: '/projects', label: 'Projects', icon: FolderOpen },
    { href: '/messages', label: 'Messages', icon: MessageCircle },
    { href: `/creators/${user.id}`, label: 'Profile', icon: User },
  ] : []

  return (
    <nav className="border-b border-[var(--gem-gray-700)] bg-[var(--gem-black)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={user ? '/discover' : '/'} className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">GEM</span>
          <span className="text-[10px] uppercase tracking-widest text-[var(--gem-gray-400)] hidden sm:inline">
            AI-Native Creator Network
          </span>
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
                        ? 'bg-[var(--gem-gray-700)] text-white'
                        : 'text-[var(--gem-gray-300)] hover:text-white hover:bg-[var(--gem-gray-800)]'
                    }`}
                  >
                    <Icon size={16} />
                    {link.label}
                  </Link>
                )
              })}
              <Link
                href="/projects/new"
                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
              >
                <Plus size={16} />
                New Project
              </Link>
              <button
                onClick={handleSignOut}
                className="ml-2 p-1.5 rounded-lg text-[var(--gem-gray-400)] hover:text-white hover:bg-[var(--gem-gray-800)] transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-[var(--gem-gray-300)]"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-[var(--gem-gray-300)] hover:text-white transition-colors"
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
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--gem-gray-300)] hover:text-white hover:bg-[var(--gem-gray-800)]"
              >
                <Icon size={16} />
                {link.label}
              </Link>
            )
          })}
          <Link
            href="/projects/new"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[var(--gem-accent)] text-white"
          >
            <Plus size={16} />
            New Project
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--gem-gray-400)] hover:text-white w-full text-left"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  )
}
