// WriterCard — small clickable card linking to a writer's profile.
// Used at the top of /report/[id] and as the byline on each PeerReview.
// Anuj 2026-04-29 (writer profiles v0.3).

import Link from 'next/link'

export interface WriterCardData {
  id: string
  full_name: string | null
  handle: string | null
  headline: string | null
  avatar_url: string | null
}

interface Props {
  writer: WriterCardData
  /** "lg" = top-of-report use; "sm" = compact for review byline. */
  size?: 'sm' | 'lg'
  /** "dark" renders light text for dark backgrounds (report hero). */
  variant?: 'light' | 'dark'
}

export function WriterCard({ writer, size = 'lg', variant = 'light' }: Props) {
  const name = (writer.full_name || writer.handle || 'Anonymous writer').trim()
  const handle = writer.handle ? `@${writer.handle}` : ''
  const profileHref = writer.handle ? `/w/${writer.handle}` : null
  const isLg = size === 'lg'
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

  const inner = (
    <div className={`flex items-center gap-${isLg ? 4 : 3}`}>
      <Avatar url={writer.avatar_url} initials={initials} size={isLg ? 48 : 36} />
      <div className="flex-1 min-w-0">
        <div className={`font-bold ${variant === 'dark' ? 'text-white' : 'text-gray-900'} ${isLg ? 'text-[16px]' : 'text-[14px]'} leading-tight`}>
          {name}
          {handle && (
            <span className={`font-normal ${variant === 'dark' ? 'text-white/40' : 'text-gray-400'} ml-1.5 ${isLg ? 'text-[14px]' : 'text-[12px]'}`}>
              {handle}
            </span>
          )}
        </div>
        {writer.headline && (
          <div className={`${variant === 'dark' ? 'text-white/60' : 'text-gray-600'} ${isLg ? 'text-[13px]' : 'text-[12px]'} leading-snug mt-0.5 truncate`}>
            {writer.headline}
          </div>
        )}
      </div>
    </div>
  )

  if (!profileHref) return inner
  return (
    <Link
      href={profileHref}
      className="block hover:opacity-80 transition-opacity"
    >
      {inner}
    </Link>
  )
}

function Avatar({ url, initials, size }: { url: string | null; initials: string; size: number }) {
  const dim = `${size}px`
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="rounded-full object-cover shrink-0 bg-gray-100"
        style={{ width: dim, height: dim }}
      />
    )
  }
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-bold text-white"
      style={{
        width: dim,
        height: dim,
        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials || '·'}
    </div>
  )
}
