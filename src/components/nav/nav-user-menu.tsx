'use client'

// NavUserMenu — avatar in the top nav. Click opens a dropdown with the
// same profile control center the old left-rail YourPanel used to host
// (avatar + name + headline, stats row, View / Edit profile buttons,
// Privacy settings link, Recent activity, Sign out).
//
// We dropped "Submit another script" from this dropdown — Submit is
// always one click away in the nav (Anuj 2026-04-30 v0.10.5).
//
// Renders on both desktop and mobile so the user has the same one-tap
// path back to their profile from anywhere in the app. The persistent
// left rail is gone.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { LogOut } from 'lucide-react'

export interface NavUserMenuProfile {
  full_name: string | null
  handle: string | null
  headline: string | null
  avatar_url: string | null
  isPro?: boolean
}
export interface NavUserMenuStats {
  scripts: number
  followers: number
  following: number
  reviewsGiven: number
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
  const profileHref = profile.handle ? `/w/${profile.handle}` : '/profile'

  // Close on outside click + Escape.
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
          className="absolute right-0 top-full mt-2 w-[300px] rounded-xl bg-white z-[60] overflow-hidden"
          style={{
            border: '1px solid #E5E7EB',
            boxShadow: '0 18px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          {/* PROFILE CHIP */}
          <div className="p-4">
            <div className="flex items-start gap-3">
              <Link
                href={profileHref}
                prefetch={false}
                onClick={() => setOpen(false)}
                className="shrink-0"
              >
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover bg-gray-100" />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full text-white flex items-center justify-center font-bold"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', fontSize: 16 }}
                  >
                    {ini}
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={profileHref}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                  className="block group"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[15px] text-gray-900 group-hover:underline truncate" style={{ fontFamily: 'Georgia, serif' }}>
                      {profile.full_name || (profile.handle ? `@${profile.handle}` : 'Your profile')}
                    </span>
                    {profile.isPro && <ProBadge />}
                  </div>
                  {profile.handle && (
                    <div className="text-[12px] text-purple-700 font-semibold truncate">@{profile.handle}</div>
                  )}
                </Link>
                {profile.headline && (
                  <div className="text-[12px] text-gray-600 mt-1.5 leading-snug line-clamp-2">{profile.headline}</div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-4 gap-1 text-center">
              <Stat label="Scripts" value={stats.scripts} />
              <Stat
                label="Followers"
                value={stats.followers}
                href={profile.handle ? `/w/${profile.handle}/followers` : null}
                onNavigate={() => setOpen(false)}
              />
              <Stat
                label="Following"
                value={stats.following}
                href={profile.handle ? `/w/${profile.handle}/following` : null}
                onNavigate={() => setOpen(false)}
              />
              <Stat label="Reviews" value={stats.reviewsGiven} />
            </div>

            {/* View / Edit */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
              <Link
                href={profileHref}
                prefetch={false}
                onClick={() => setOpen(false)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-800 py-2 transition-colors"
              >
                View profile
              </Link>
              <Link
                href="/profile"
                prefetch={false}
                onClick={() => setOpen(false)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-lg bg-gray-900 hover:bg-black text-white py-2 transition-colors"
              >
                Edit profile
              </Link>
            </div>
            <div className="mt-2">
              <Link
                href="/profile/privacy"
                prefetch={false}
                onClick={() => setOpen(false)}
                className="block w-full text-center text-[11.5px] font-semibold text-gray-500 hover:text-gray-900 hover:underline py-1"
              >
                Privacy settings →
              </Link>
            </div>
          </div>

          {/* RECENT ACTIVITY */}
          {recentActivity.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-gray-500 mb-2">
                Recent activity
              </p>
              <ul className="space-y-1.5">
                {recentActivity.map((a, i) => (
                  <li key={i} className="text-[12px] leading-snug">
                    <span className="text-gray-400 mr-1">
                      {a.kind === 'publish' ? 'Published' : 'Reviewed'}
                    </span>
                    <Link
                      href={a.href}
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      className="text-gray-800 hover:text-purple-700 hover:underline"
                      title={a.title}
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* SIGN OUT */}
          <div className="border-t border-gray-100 p-2">
            <button
              type="button"
              onClick={() => { setOpen(false); onSignOut() }}
              className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut size={14} className="text-gray-500" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, href, onNavigate }: { label: string; value: number; href?: string | null; onNavigate?: () => void }) {
  const inner = (
    <>
      <div className="font-bold text-[15px] text-gray-900 leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">{label}</div>
    </>
  )
  if (href) {
    return (
      <Link
        href={href}
        prefetch={false}
        onClick={onNavigate}
        className="block hover:bg-gray-50 rounded-md py-1 -mx-0.5 transition-colors"
      >
        {inner}
      </Link>
    )
  }
  return <div className="py-1">{inner}</div>
}

function ProBadge() {
  return (
    <span
      className="inline-flex items-center text-[8.5px] font-extrabold uppercase tracking-[0.12em] text-white px-1.5 py-0.5 rounded"
      style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
      title="GEM Pro member"
    >
      Pro
    </span>
  )
}
