import { Mail } from 'lucide-react'
import { TIER_META, type Tier } from '@/types'
import { ScoreRing } from '@/components/ui/score-ring'

interface ReportHeaderProps {
  title: string
  author: string
  tier: Tier
  weightedScore: number
  format: string
  genre: string
  genreTags: string[]
  tone: string
  createdAt: string
}

export function ReportHeader({
  title,
  author,
  tier,
  weightedScore,
  format,
  genre,
  genreTags,
  tone,
  createdAt,
}: ReportHeaderProps) {
  const tierMeta = TIER_META[tier]
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Title + Score */}
      <div className="flex items-start justify-between gap-4 sm:gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">{title}</h1>
          <p className="text-sm text-[var(--gem-gray-400)] mt-1 flex items-center gap-2">
            by {author}
            {author !== 'Anonymous' && (
              <a
                href={`mailto:contact@gem.studio?subject=${encodeURIComponent(`Regarding "${title}" on GEM`)}&body=${encodeURIComponent(`I'd like to connect with ${author} regarding their script "${title}" on the GEM leaderboard.`)}`}
                className="text-[var(--gem-gray-500)] hover:text-[var(--gem-accent)] transition-colors"
                title="Contact writer"
              >
                <Mail size={14} />
              </a>
            )}
            — {date}
          </p>
          <p className="text-sm text-[var(--gem-gray-300)] mt-1">{format} · {genre}</p>

          {/* Tier badge */}
          <div className="mt-4">
            <span
              className={`
                inline-flex items-center px-4 py-1.5 rounded border text-sm font-medium uppercase tracking-widest
                ${tierMeta.bgClass} ${tierMeta.colorClass}
              `}
            >
              {tierMeta.label}
            </span>
            <p className="text-xs text-[var(--gem-gray-400)] mt-2 max-w-md">
              {tierMeta.description}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <div className="hidden sm:block">
            <ScoreRing score={weightedScore} size={100} strokeWidth={5} label="GEM score" />
          </div>
          <div className="sm:hidden">
            <ScoreRing score={weightedScore} size={72} strokeWidth={4} label="GEM score" />
          </div>
        </div>
      </div>

      {/* Genre tags & tone pill */}
      <div className="flex flex-wrap gap-2">
        {genreTags.map(tag => (
          <span key={tag} className="tag-pill">{tag}</span>
        ))}
        <span className="tag-pill">{tone}</span>
      </div>

    </div>
  )
}
