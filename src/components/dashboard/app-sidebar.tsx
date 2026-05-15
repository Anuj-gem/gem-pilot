'use client'

// AppSidebar — persistent left sidebar for logged-in users.
// Lives in the (app) layout so it's visible on every page except /report/*.
// Light theme — matches the content area.

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface AppSidebarData {
  userName: string
  avatarUrl: string | null
  headline: string | null
  isPro: boolean
  scriptCount: number
  appCount: number
  heatScore: number
}

export function AppSidebar({
  userName,
  avatarUrl,
  headline,
  isPro,
  scriptCount,
  appCount,
  heatScore,
}: AppSidebarData) {
  const pathname = usePathname() ?? ''

  // Hide sidebar on report pages (full-width reading experience)
  if (pathname.startsWith('/report/')) return null

  const links = [
    { label: 'My Scripts', href: '/scripts', match: (p: string) => p.startsWith('/scripts') },
    { label: 'Applications', href: '/applications', match: (p: string) => p.startsWith('/applications') || p.startsWith('/review') },
    { label: 'Settings', href: '/settings', match: (p: string) => p.startsWith('/settings') },
  ]

  return (
    <aside className="hidden lg:block w-[220px] shrink-0">
      <div className="sticky top-20 pt-2">
        {/* Identity */}
        <div className="flex items-center gap-3 mb-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div
              className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[15px] font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-gray-900 truncate">{userName}</div>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5"
              style={{
                background: isPro ? 'rgba(124,58,237,0.08)' : 'rgba(0,0,0,0.04)',
                color: isPro ? '#7c3aed' : '#9ca3af',
              }}
            >
              {isPro ? 'Pro' : 'Free'}
            </span>
          </div>
        </div>

        {/* Headline */}
        {headline ? (
          <p className="text-[12px] leading-relaxed text-gray-400 m-0 mb-4">{headline}</p>
        ) : (
          <Link href="/settings" className="text-[12px] text-gray-300 hover:text-gray-500 transition-colors mb-4 block">
            + Add a bio
          </Link>
        )}

        {/* Stats */}
        <div className="flex gap-5 mb-5 pb-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          {[
            { label: 'Scripts', value: scriptCount },
            { label: 'Apps', value: appCount },
            { label: 'Heat', value: heatScore, color: '#ea580c' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-[18px] font-bold" style={{ color: (stat as any).color || '#111827' }}>
                {stat.value}
              </div>
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Links */}
        <nav className="space-y-0.5">
          {links.map((link) => {
            const active = link.match(pathname)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between py-2 px-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {link.label}
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
