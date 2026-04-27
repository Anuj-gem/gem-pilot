// MatchCard / HeroMatchCard — server components for the producer dashboard.
// Renders a single script_match row with title, score, headline, tag chips,
// and an action row (delegated to <MatchActions>, which is a client island).
//
// Two visual treatments:
//   - HeroMatchCard: gold rule + violet border + larger score, used for the
//     "Top choice for you this week" slot at the top of the page.
//   - MatchCard: the compact card used in the rest-of-list rail.

import Link from 'next/link'
import { MatchActions } from './match-actions'

type MatchStatus = 'pending' | 'opened' | 'interested' | 'passed' | 'commented'

export interface MatchCardData {
  matchId: string
  status: MatchStatus
  title: string
  score: number | null
  headline: string | null
  tags: string[]
}

export function MatchCard({ data }: { data: MatchCardData }) {
  return (
    <div
      className="rounded-xl p-5 sm:px-6 sm:py-5"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      <div className="grid sm:grid-cols-[1fr_auto] gap-x-6 gap-y-1 items-start">
        <div className="min-w-0">
          <Link
            href={`/partner/script/${data.matchId}`}
            className="block group"
          >
            <h3 className="text-[19px] sm:text-[20px] font-bold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 group-hover:text-[var(--gem-accent)] transition-colors">
              {data.title}
            </h3>
          </Link>
          {data.headline && (
            <p className="text-[14px] text-[var(--gem-gray-300)] leading-[1.55] mt-2 m-0 max-w-[64ch]">
              {data.headline}
            </p>
          )}
          {data.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-3">
              {data.tags.map((t, i) => (
                <Tag key={i} text={t} />
              ))}
            </div>
          )}
        </div>
        <ScoreBlock score={data.score} variant="card" />
      </div>

      <div
        className="mt-4 pt-3"
        style={{ borderTop: '1px solid var(--gem-gray-700)' }}
      >
        <MatchActions matchId={data.matchId} status={data.status} variant="card" />
      </div>
    </div>
  )
}

export function HeroMatchCard({ data }: { data: MatchCardData }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 0% 0%, rgba(212,160,23,0.07) 0%, transparent 55%), radial-gradient(ellipse at 100% 0%, rgba(124,58,237,0.07) 0%, transparent 55%), #fff',
        border: '1.5px solid var(--gem-accent)',
        boxShadow:
          '0 4px 20px rgba(124,58,237,0.10), 0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div className="px-6 sm:px-8 pt-6 pb-5">
        <div className="grid sm:grid-cols-[1fr_auto] gap-x-8 gap-y-2 items-start">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] font-bold mb-3"
              style={{ color: 'var(--gem-accent)' }}
            >
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 24,
                  height: 2,
                  background: 'var(--gem-gold)',
                  borderRadius: 1,
                }}
              />
              Top choice for you this week
            </div>
            <Link
              href={`/partner/script/${data.matchId}`}
              className="block group"
            >
              <h2 className="text-[26px] sm:text-[30px] font-extrabold tracking-tight text-[var(--gem-gray-50)] leading-[1.15] m-0 group-hover:text-[var(--gem-accent)] transition-colors">
                {data.title}
              </h2>
            </Link>
            {data.headline && (
              <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-200)] leading-[1.5] mt-3 m-0 max-w-[68ch]">
                {data.headline}
              </p>
            )}
            {data.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-4">
                {data.tags.map((t, i) => (
                  <Tag key={i} text={t} />
                ))}
              </div>
            )}
          </div>
          <ScoreBlock score={data.score} variant="hero" />
        </div>

        <div
          className="mt-5 pt-4"
          style={{ borderTop: '1px solid rgba(124,58,237,0.18)' }}
        >
          <MatchActions matchId={data.matchId} status={data.status} variant="hero" />
        </div>
      </div>
    </div>
  )
}

function ScoreBlock({
  score,
  variant,
}: {
  score: number | null
  variant: 'hero' | 'card'
}) {
  if (typeof score !== 'number') return null
  const isHero = variant === 'hero'
  return (
    <div className="flex flex-col items-end shrink-0 min-w-[110px]">
      <div
        className="leading-none tabular-nums font-extrabold tracking-tight"
        style={{
          fontSize: isHero ? 56 : 36,
          color: isHero ? 'var(--gem-accent)' : 'var(--gem-gray-50)',
        }}
      >
        {score.toFixed(1)}
        <span
          className="font-bold ml-0.5"
          style={{
            fontSize: isHero ? 24 : 16,
            color: 'var(--gem-gray-500)',
          }}
        >
          /100
        </span>
      </div>
      <p
        className="text-[10px] uppercase tracking-[0.18em] font-semibold m-0 mt-1.5"
        style={{ color: 'var(--gem-gray-500)' }}
      >
        GEM score
      </p>
    </div>
  )
}

function Tag({ text }: { text: string }) {
  return (
    <span
      className="text-[12px] font-medium px-2.5 py-1 rounded-full"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        color: 'var(--gem-gray-300)',
      }}
    >
      {text}
    </span>
  )
}
