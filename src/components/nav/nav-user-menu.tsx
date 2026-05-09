'use client'

// NavUserMenu — avatar in the top nav. Click opens a minimal dropdown
// with sign-out and profile links. Profile info now lives on the dashboard.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { LogOut, User } from 'lucide-react'

export interface NavUserMenuProfile {
  full_name: string | null
  handle: string | null
  headline: string | null
  avatar_url: string | null
  isPro?: boolean
  referralCode?: string | null
  bonusSubmissions?: number
  referralCount?: number
}
export interface NavUserMenuStats {
  scripts: number
  followers: number
  following: number
  reviewsGiven: number
  monthlySubmissions?: { used: number; limit: number; resetsAt: string }
}
export interface NavUserMenuActivity {
  kind: 'publish' | 'review'
  ts: number
  title: string
  href: string
}

interface Props {
  profile: NavUserMenuProfile
  stats: NavUserMenuStats
  recentActivity?: NavUserMenuActivity[]
  onSignOut: () => void
}

function initialsOf(name: string | null | undefined, handle: string | null | undefined) {
  const src = name || handle || '·'
  return src.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·'
}

export function NavUserMenu({ profile, stats, recentActivity = [], onSignOut }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const ini = initialsOf(profile.full_name, profile.handle)
  // profileHref removed — public profiles disabled

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open profile menu"
        aria-expanded={open}
        className="block rounded-full ring-2 ring-transparent hover:ring-[var(--gem-accent)]/40 transition"
      >
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover bg-gray-200" />
        ) : (
          <div
            className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', fontSize: 11 }}
          >
            {ini}
          </div>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-[200px] rounded-xl bg-white z-[60] overflow-hidden py-1"
          style={{
            border: '1px solid #E5E7EB',
            boxShadow: '0 18px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <Link
            href="/profile"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <User size={14} className="text-gray-400" />
            Edit profile
          </Link>
          <div className="border-t border-gray-100 my-1" />
          <button
            type="button"
            onClick={() => { setOpen(false); onSignOut() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={14} className="text-gray-400" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
