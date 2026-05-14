'use client'

// MobileTabBar — fixed bottom navigation for logged-in mobile/tablet
// users. Visible below `lg`, hidden above. Mirrors the Twitter /
// Letterboxd / Substack pattern Anuj signed off on.
//
// Tabs: Home (dashboard) · Community (discover) · Scripts (/scripts) ·
// Profile (the user's own /w/[handle], or /profile if no handle yet).
//
// Anuj 2026-04-30 v0.7.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Home, Briefcase, FileText, MessageCircle } from 'lucide-react'

export function MobileTabBar() {
  const pathname = usePathname() ?? ''
  const [authed, setAuthed] = useState<boolean>(false)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      setAuthed(!!data.user)
    })
    return () => { cancelled = true }
  }, [])

  if (!authed) return null

  const tabs = [
    { href: '/dashboard',     label: 'Home',       icon: Home,           match: (p: string) => p === '/dashboard' || p === '/' },
    { href: '/opportunities', label: 'Opportunities', icon: Briefcase,      match: (p: string) => p.startsWith('/opportunities') },
    { href: '/scripts',       label: 'My Scripts', icon: FileText,       match: (p: string) => p.startsWith('/scripts') },
    { href: '/feedback',      label: 'Feedback',   icon: MessageCircle,  match: (p: string) => p.startsWith('/feedback') },
  ] as const

  return (
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
      </ul>
    </nav>
  )
}
