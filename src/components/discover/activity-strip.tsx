// ActivityStrip — server-rendered lightweight "what's happening" rail.
// Anuj 2026-04-30 v0.6 Discover redesign.
//
// Pulls last N events from existing data: recent publishes (script_submissions
// becoming public) and recent peer reviews. No new tables, no websockets —
// re-renders with the page's revalidate cadence.

import Link from 'next/link'

export interface ActivityEvent {
  kind: 'publish' | 'review'
  ts: number
  // publish
  title?: string
  evaluation_id?: string | null
  // review
  reviewerHandle?: string | null
  reviewerName?: string | null
  // shared writer ref
  writerHandle?: string | null
  writerName?: string | null
  writerAvatar?: string | null
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  const w = Math.floor(d / 7)
  return `${w}w`
}

function initialsOf(name: string | null | undefined, handle: string | null | undefined) {
  const src = name || handle || '·'
  return src.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·'
}

export function ActivityStrip({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return null
  return (
    <div className="mb-6">
      <p className="text-[10.5px] uppercase tracking-[0.16em] font-bold text-gray-500 mb-2 px-1">
        Live activity
      </p>
      <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 overflow-x-auto">
        <div className="flex items-center gap-3 min-w-max">
          <span className="shrink-0 inline-flex items-center pl-1 pr-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          </span>
          {events.map((e, i) => (
            <ActivityItem key={i} e={e} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ActivityItem({ e }: { e: ActivityEvent }) {
  const handle = e.kind === 'review' ? (e.reviewerHandle || e.writerHandle) : e.writerHandle
  const name = e.kind === 'review' ? (e.reviewerName || e.writerName) : e.writerName
  const ini = initialsOf(name, handle)

  // Build the human sentence
  let sentence: React.ReactNode
  if (e.kind === 'publish') {
    sentence = (
      <>
        <Strong>{name || (handle ? `@${handle}` : 'Someone')}</Strong>{' published '}
        {e.evaluation_id ? (
          <Link href={`/report/${e.evaluation_id}`} prefetch={false} className="font-semibold text-gray-900 hover:underline">
            {e.title || 'a script'}
          </Link>
        ) : (
          <span className="font-semibold text-gray-900">{e.title || 'a script'}</span>
        )}
      </>
    )
  } else {
    sentence = (
      <>
        <Strong>{name || (handle ? `@${handle}` : 'Someone')}</Strong>{' reviewed '}
        {e.evaluation_id ? (
          <Link href={`/report/${e.evaluation_id}`} prefetch={false} className="font-semibold text-gray-900 hover:underline">
            {e.title || 'a script'}
          </Link>
        ) : (
          <span className="font-semibold text-gray-900">{e.title || 'a script'}</span>
        )}
      </>
    )
  }

  const profileHref = handle ? `/w/${handle}` : null

  return (
    <div className="shrink-0 flex items-center gap-2 text-[12px] text-gray-700 pr-3">
      {profileHref ? (
        <Link href={profileHref} prefetch={false} className="shrink-0">
          {e.writerAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.writerAvatar} alt="" className="w-6 h-6 rounded-full object-cover bg-gray-100" />
          ) : (
            <Avatar ini={ini} />
          )}
        </Link>
      ) : (
        e.writerAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.writerAvatar} alt="" className="w-6 h-6 rounded-full object-cover bg-gray-100" />
        ) : (
          <Avatar ini={ini} />
        )
      )}
      <div className="whitespace-nowrap">
        {sentence}
        <span className="text-gray-400 ml-2">{timeAgo(e.ts)}</span>
      </div>
    </div>
  )
}

function Avatar({ ini }: { ini: string }) {
  return (
    <div
      className="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold"
      style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', fontSize: 10 }}
    >
      {ini}
    </div>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-gray-900">{children}</span>
}
