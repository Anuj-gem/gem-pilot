'use client'

// Discover shell — placeholder cards, sort toggles, gated overlay.
// Anuj 2026-05-14 v0.4.

import { useState } from 'react'
import Link from 'next/link'

type SortMode = 'score' | 'recent' | 'heat'

const PLACEHOLDER_CARDS = Array.from({ length: 9 }, (_, i) => i)

export function DiscoverShell({ loggedIn }: { loggedIn: boolean }) {
  const [sort, setSort] = useState<SortMode>('score')

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-[26px] font-bold text-gray-900"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Discover
        </h1>
        <p className="mt-1 text-[14px] text-gray-500">
          Find scripts which match your needs.
        </p>
      </div>

      {/* Sort + Filter bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5">
          <SortPill active={sort === 'score'} onClick={() => setSort('score')}>
            GEM Score
          </SortPill>
          <SortPill active={sort === 'recent'} onClick={() => setSort('recent')}>
            Recent
          </SortPill>
          <SortPill active={sort === 'heat'} onClick={() => setSort('heat')}>
            Heat
          </SortPill>
        </div>

        <button
          className="text-[12px] font-medium text-gray-400 px-3 py-1.5 rounded-lg border border-gray-200 cursor-default"
        >
          Filters
        </button>
      </div>

      {/* Card list with overlay */}
      <div className="relative">
        {/* Placeholder cards */}
        <div className="space-y-2">
          {PLACEHOLDER_CARDS.map((_, i) => (
            <PlaceholderCard key={i} rank={i + 1} />
          ))}
        </div>

        {/* Gated overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.85) 30%, rgba(255,255,255,0.97) 60%)',
          }}
        >
          <div className="text-center px-6 py-8 max-w-sm">
            <p
              className="text-[20px] font-bold text-gray-900 m-0 mb-2"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              For GEM Insiders only.
            </p>
            <p className="text-[14px] text-gray-500 m-0 mb-5">
              Get your script evaluated to access rankings, reports, and filters.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                className="text-[13px] font-semibold px-5 py-2.5 rounded-lg text-white border-0 cursor-pointer transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                onClick={() => window.dispatchEvent(new Event('gem:open-script-upload-modal'))}
              >
                Apply for access
              </button>
              {!loggedIn && (
                <Link
                  href="/login?redirect=/discover"
                  className="text-[13px] font-medium text-gray-500 hover:text-gray-700 transition-colors px-4 py-2.5 rounded-lg border border-gray-200"
                >
                  Log in
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sort pill ───────────────────────────────────────────── */

function SortPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[12px] font-medium px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer ${
        active
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

/* ── Placeholder card — no real data, just shapes ────────── */

function PlaceholderCard({ rank }: { rank: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5">
      <div className="flex items-center gap-3">
        {/* Rank */}
        <span className="text-[14px] font-semibold text-gray-200 w-5 text-center shrink-0">
          {rank}
        </span>

        {/* Score badge placeholder */}
        <div
          className="shrink-0 w-11 h-11 rounded-lg"
          style={{ background: '#f3f4f6', border: '1.5px solid #e5e7eb' }}
        />

        {/* Title + meta placeholder bars */}
        <div className="min-w-0 flex-1 space-y-2">
          <div
            className="h-3.5 rounded"
            style={{
              background: '#f0f0f0',
              width: `${50 + ((rank * 17) % 30)}%`,
            }}
          />
          <div
            className="h-2.5 rounded"
            style={{
              background: '#f5f5f5',
              width: `${30 + ((rank * 13) % 20)}%`,
            }}
          />
        </div>

        {/* Report link placeholder */}
        <div
          className="h-3 w-16 rounded shrink-0"
          style={{ background: '#f0f0f0' }}
        />
      </div>
    </div>
  )
}
