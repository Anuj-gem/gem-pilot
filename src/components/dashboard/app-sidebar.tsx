'use client'

// AppSidebar — persistent left sidebar for logged-in users.
// Lives in the (app) layout so it's visible on every page except /report/*.

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
        {/* Identity card */}
        <div className="rounded-xl bg-white px-4 py-4 mb-4"
          style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-3 mb-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
            ) : (
              <div
                className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-[16px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-gray-900 truncate">{userName}</div>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5"
                style={{
                  background: isPro ? '#f5f3ff' : '#f9fafb',
                  color: isPro ? '#7c3aed' : '#9ca3af',
                }}
              >
                {isPro ? 'Pro' : 'Free'}
              </span>
            </div>
          </div>

          {/* Headline */}
          {headline ? (
            <p className="text-[12px] leading-relaxed text-gray-400 m-0 mb-3">{headline}</p>
          ) : (
            <Link href="/settings" className="text-[12px] text-gray-300 hover:text-gray-500 transition-colors mb-3 block">
              + Add a bio
            </Link>
          )}

          {/* Stats row */}
          <div className="flex gap-4 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            {[
              { label: 'Scripts', value: scriptCount },
              { label: 'Apps', value: appCount },
              { label: 'Heat', value: heatScore, color: '#ea580c' },
            ].map((stat) => (
              <div key={stat.label} className="text-center flex-1">
                <div className="text-[17px] font-bold leading-none" style={{ color: (stat as any).color || '#111827' }}>
                  {stat.value}
                </div>
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Links */}
        <nav className="space-y-0.5">
          {links.map((link) => {
            const active = link.match(pathname)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between py-2.5 px-3 rounded-lg text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-white text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                }`}
                style={active ? { boxShadow: '0 1px 2px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' } : { border: '1px solid transparent' }}
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
