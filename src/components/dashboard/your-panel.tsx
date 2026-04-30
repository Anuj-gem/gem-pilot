// YourPanel — the personal "your work" rail on the new community-first
// dashboard. Sidebar on desktop, top-of-page on mobile.
//
// Anuj 2026-04-30 v0.7.
//
// Contents:
//   - Profile chip (avatar, name, @handle, headline) → links to /w/[handle]
//   - 4-up stats strip (scripts / followers / following / reviews given)
//   - "Your latest" hero card. State machine:
//       processing  → animated processing card. No score yet.
//       awaiting_pdf → "Upload your PDF" CTA
//       failed      → "Something went wrong" + Retry
//       completed   → typographic mini poster card with score
//       no scripts  → "Upload your first script" pitch
//   - Up to 2 additional scripts as compact rows (only shown on desktop —
//     keeps the mobile top section short).
//   - "Manage your work →" link to public profile.
//   - Persistent "Submit another" affordance.

import Link from 'next/link'
import { Plus, Upload, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

export interface YourPanelScript {
  id: string
  title: string
  status: string                      // 'processing' | 'awaiting_pdf' | 'failed' | 'completed' | ...
  declared_format: string | null
  evaluationId: string | null
  weighted_score: number | null
  logline: string | null
  genre: string | null
  is_public: boolean
  created_at: string
}

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
  latest: YourPanelScript | null
  others: YourPanelScript[]   // siblings beyond `latest` — render up to 2
}

const CARD = {
  bg:     '#FBF1DC',
  border: '#ECDDB4',
  ink:    '#8a6a2e',
}

function initials(name: string | null | undefined, handle: string | null | undefined) {
  const src = name || handle || '·'
  return src.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·'
}

function timeAgo(ts: string | null) {
  if (!ts) return ''
  const s = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

export function YourPanel({ profile, stats, latest, others }: Props) {
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
      </div>

      {/* YOUR LATEST */}
      <div>
        <div className="flex items-end justify-between mb-2 px-1">
          <p className="text-[10.5px] uppercase tracking-[0.16em] font-bold text-gray-500">Your latest</p>
          <Link href={profileHref} prefetch={false} className="text-[11px] text-gray-500 hover:text-gray-900 inline-flex items-center gap-1">
            Manage <ArrowRight size={11} />
          </Link>
        </div>

        {!latest ? (
          <EmptyLatest />
        ) : latest.status === 'processing' ? (
          <ProcessingCard script={latest} />
        ) : latest.status === 'awaiting_pdf' ? (
          <AwaitingPdfCard script={latest} />
        ) : latest.status === 'failed' ? (
          <FailedCard script={latest} />
        ) : (
          <CompletedCard script={latest} />
        )}
      </div>

      {/* OTHERS — desktop only to keep the mobile top section compact */}
      {others.length > 0 && (
        <div className="hidden md:block">
          <p className="text-[10.5px] uppercase tracking-[0.16em] font-bold text-gray-500 mb-2 px-1">Other scripts</p>
          <div className="space-y-1">
            {others.slice(0, 2).map((s) => (
              <OtherRow key={s.id} script={s} />
            ))}
          </div>
        </div>
      )}

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

function ProcessingCard({ script }: { script: YourPanelScript }) {
  return (
    <div
      className="rounded-xl border p-4 relative overflow-hidden"
      style={{ background: CARD.bg, borderColor: CARD.border }}
    >
      {/* Animated shimmer band */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 overflow-hidden"
      >
        <div
          className="h-full w-1/3 animate-[shimmer_1.6s_ease-in-out_infinite]"
          style={{ background: 'linear-gradient(90deg,transparent,#7c3aed,transparent)' }}
        />
      </div>
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>

      <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.14em] font-bold text-purple-700 mb-2">
        <Loader2 size={12} className="animate-spin" />
        Reading your script…
      </div>
      <div className="font-bold text-[16px] text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
        {script.title}
      </div>
      <div className="mt-2 text-[12px] text-gray-700 leading-snug">
        About a minute. Keep scrolling — your report will pop up here as soon as it&apos;s ready.
      </div>
      <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-[10.5px] uppercase tracking-[0.08em] font-semibold" style={{ borderColor: CARD.border, color: CARD.ink }}>
        <span>{script.declared_format || 'Script'}</span>
        <span>{timeAgo(script.created_at)}</span>
      </div>
    </div>
  )
}

function AwaitingPdfCard({ script }: { script: YourPanelScript }) {
  return (
    <Link
      href={`/submit?id=${script.id}`}
      prefetch={false}
      className="block rounded-xl border p-4 hover:shadow-md transition-shadow"
      style={{ background: CARD.bg, borderColor: CARD.border }}
    >
      <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.14em] font-bold text-amber-700 mb-2">
        <Upload size={12} />
        One more step
      </div>
      <div className="font-bold text-[16px] text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
        {script.title}
      </div>
      <div className="mt-2 text-[12px] text-gray-700 leading-snug">
        Upload your PDF to start the evaluation.
      </div>
      <div
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-[12px] font-semibold px-3 py-1.5"
      >
        <Upload size={12} />
        Upload PDF
      </div>
    </Link>
  )
}

function FailedCard({ script }: { script: YourPanelScript }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.14em] font-bold text-red-700 mb-2">
        <AlertCircle size={12} />
        Something went wrong
      </div>
      <div className="font-bold text-[15px] text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
        {script.title}
      </div>
      <Link
        href={`/submit?id=${script.id}`}
        prefetch={false}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-[12px] font-semibold px-3 py-1.5"
      >
        Try again
      </Link>
    </div>
  )
}

function CompletedCard({ script }: { script: YourPanelScript }) {
  const score = script.weighted_score == null ? null : Math.round(Number(script.weighted_score))
  const href = script.evaluationId ? `/report/${script.evaluationId}` : '#'
  return (
    <Link
      href={href}
      prefetch={false}
      className="block rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: CARD.bg, borderColor: CARD.border }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div
              className="font-bold text-gray-900 leading-tight"
              style={{ fontFamily: 'Georgia, serif', fontSize: 18 }}
            >
              {script.title}
            </div>
            {script.logline && (
              <div className="italic text-gray-700 mt-1.5 leading-snug line-clamp-2" style={{ fontFamily: 'Georgia, serif', fontSize: 12.5 }}>
                &ldquo;{script.logline}&rdquo;
              </div>
            )}
          </div>
          {score != null && (
            <div
              className="shrink-0 rounded-md text-white font-extrabold flex flex-col items-center justify-center leading-none"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', width: 44, height: 44 }}
              title="GEM score"
            >
              <span style={{ fontSize: 6, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.9, marginBottom: 1 }}>GEM</span>
              <span style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{score}</span>
            </div>
          )}
        </div>
        <div
          className="mt-3 pt-2.5 flex items-center justify-between text-[10.5px] uppercase tracking-[0.08em] font-semibold"
          style={{ borderTop: `1px solid ${CARD.border}`, color: CARD.ink }}
        >
          <span>{[script.declared_format, script.genre].filter(Boolean).join(' · ') || 'Script'}</span>
          <span className="normal-case tracking-normal">
            {script.is_public ? 'Public' : 'Private'} · {timeAgo(script.created_at)}
          </span>
        </div>
      </div>
    </Link>
  )
}

function OtherRow({ script }: { script: YourPanelScript }) {
  const score = script.weighted_score == null ? null : Math.round(Number(script.weighted_score))
  const href = script.evaluationId ? `/report/${script.evaluationId}` : `/submit?id=${script.id}`
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
    >
      {score != null ? (
        <div
          className="shrink-0 rounded-md text-white font-extrabold flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', width: 32, height: 32, fontSize: 13 }}
        >
          {score}
        </div>
      ) : (
        <div className="shrink-0 w-8 h-8 rounded-md bg-gray-100 text-gray-400 flex items-center justify-center text-[10px] uppercase font-bold">
          {script.status === 'processing' ? '…' : '—'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[13.5px] text-gray-900 truncate" style={{ fontFamily: 'Georgia, serif' }}>
          {script.title}
        </div>
        <div className="text-[11px] text-gray-500 truncate">
          {script.declared_format || 'Script'} · {script.is_public ? 'Public' : 'Private'}
        </div>
      </div>
    </Link>
  )
}

function EmptyLatest() {
  return (
    <Link
      href="/submit"
      prefetch={false}
      className="block rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/40 hover:bg-purple-50 transition-colors p-5 text-center"
    >
      <div className="font-bold text-[15px] text-gray-900 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
        Submit your first script
      </div>
      <div className="text-[12px] text-gray-600 mb-3 leading-snug">
        Get a free evaluation in about a minute.
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-[12px] font-semibold px-3 py-1.5">
        <Plus size={12} />
        Get started
      </span>
    </Link>
  )
}
