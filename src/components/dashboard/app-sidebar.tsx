'use client'

// AppSidebar — persistent left sidebar.
// Handles both logged-in (profile + stats + nav) and anonymous (sign-up CTA) states.
// Lives in the (app) layout, visible on every page except /report/*.

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

/** Pass null to render the anonymous state */
export function AppSidebar(props: AppSidebarData | { anonymous: true }) {
  const pathname = usePathname() ?? ''

  // Hide sidebar on report pages (full-width reading experience)
  if (pathname.startsWith('/report/')) return null

  const isAnon = 'anonymous' in props

  return (
    <aside className="hidden lg:block w-[220px] shrink-0">
      <div className="sticky top-20 pt-2">
        {/* Identity card */}
        <div className="rounded-xl bg-white px-4 py-4 mb-4"
          style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

          {isAnon ? (
            <>
              {/* Anonymous: empty avatar + sign up CTA */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center"
                  style={{ background: '#f3f4f6' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-gray-900">Your writer profile</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Sign up to save your work</div>
                </div>
              </div>

              <Link
                href="/signup"
                className="block w-full py-2 rounded-lg text-[13px] font-semibold text-white text-center no-underline transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
              >
                Get started free
              </Link>
            </>
          ) : (
            <>
              {/* Logged in: identity + stats */}
              <div className="flex items-center gap-3 mb-3">
                {props.avatarUrl ? (
                  <img src={props.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                ) : (
                  <div
                    className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-[16px] font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                  >
                    {props.userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-gray-900 truncate">{props.userName}</div>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5"
                    style={{
                      background: props.isPro ? '#f5f3ff' : '#f9fafb',
                      color: props.isPro ? '#7c3aed' : '#9ca3af',
                    }}
                  >
                    {props.isPro ? 'Pro' : 'Guest'}
                  </span>
                </div>
              </div>

              {/* Headline */}
              {props.headline ? (
                <p className="text-[12px] leading-relaxed text-gray-400 m-0 mb-3">{props.headline}</p>
              ) : (
                <Link href="/settings" className="text-[12px] text-gray-300 hover:text-gray-500 transition-colors mb-3 block">
                  + Add a bio
                </Link>
              )}

              {/* Stats row */}
              <div className="flex gap-4 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                {[
                  { label: 'Scripts', value: props.scriptCount },
                  { label: 'Apps', value: props.appCount },
                  { label: 'Heat', value: props.heatScore, color: '#ea580c' },
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
            </>
          )}
        </div>

        {/* Become a member CTA — only for logged-in guest users */}
        {!isAnon && !props.isPro && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))}
            className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white cursor-pointer border-0 transition-all hover:brightness-110 mb-4"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            Become a member
          </button>
        )}

        {/* Links — only for logged-in users */}
        {!isAnon && (
          <NavLinks pathname={pathname} />
        )}
      </div>
    </aside>
  )
}

function NavLinks({ pathname }: { pathname: string }) {
  const links = [
    { label: 'My Scripts', href: '/scripts', match: (p: string) => p.startsWith('/scripts') },
    { label: 'Applications', href: '/applications', match: (p: string) => p.startsWith('/applications') || p.startsWith('/review') },
    { label: 'Settings', href: '/settings', match: (p: string) => p.startsWith('/settings') },
  ]

  return (
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
  )
}
