// YourPanel — the personal rail on the dashboard.
// Sidebar on desktop, top-of-page on mobile.
//
// Slimmed (Anuj 2026-04-30): the rail is now just the profile control
// center — avatar + name + handle + stats + View/Edit profile + Submit
// another. The user's actual scripts live in the main column under
// "Your latest scripts" and on /scripts; surfacing them here as well
// was duplicate noise.

import Link from 'next/link'
import { Plus } from 'lucide-react'

export interface YourPanelProfile {
  full_name: string | null
  handle: string | null
  headline: string | null
  avatar_url: string | null
  isPro?: boolean
}

interface Props {
  profile: YourPanelProfile
  stats: {
    scripts: number
    followers: number
    following: number
    reviewsGiven: number
  }
}

function initials(name: string | null | undefined, handle: string | null | undefined) {
  const src = name || handle || '·'
  return src.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·'
}

export function YourPanel({ profile, stats }: Props) {
  const ini = initials(profile.full_name, profile.handle)
  const profileHref = profile.handle ? `/w/${profile.handle}` : '/profile'

  return (
    <aside className="space-y-4">
      {/* PROFILE CHIP */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <Link href={profileHref} prefetch={false} className="shrink-0">
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
            <Link href={profileHref} prefetch={false} className="block group">
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
          <Stat label="Followers" value={stats.followers} href={profile.handle ? `/w/${profile.handle}/followers` : null} />
          <Stat label="Following" value={stats.following} href={profile.handle ? `/w/${profile.handle}/following` : null} />
          <Stat label="Reviews" value={stats.reviewsGiven} />
        </div>

        {/* Profile control row — View public profile + Edit profile */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
          <Link
            href={profileHref}
            prefetch={false}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-800 py-2 transition-colors"
          >
            View profile
          </Link>
          <Link
            href="/profile"
            prefetch={false}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-lg bg-gray-900 hover:bg-black text-white py-2 transition-colors"
          >
            Edit profile
          </Link>
        </div>
      </div>

      {/* PERSISTENT SUBMIT — quiet, not a hero CTA */}
      <Link
        href="/submit"
        prefetch={false}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-[13px] py-2.5 transition-colors"
      >
        <Plus size={14} />
        Submit another script
      </Link>
    </aside>
  )
}

// ---------- subcomponents ----------

function Stat({ label, value, href }: { label: string; value: number; href?: string | null }) {
  const inner = (
    <>
      <div className="font-bold text-[15px] text-gray-900 leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">{label}</div>
    </>
  )
  if (href) {
    return (
      <Link href={href} prefetch={false} className="block hover:bg-gray-50 rounded-md py-1 -mx-0.5 transition-colors">
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

