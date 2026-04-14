import type { WhatsHoldingItBack } from '@/types'
import { AlertTriangle, ChevronDown } from 'lucide-react'

interface Props {
  data: WhatsHoldingItBack
  blurred?: boolean
  /** When true, render the card chrome + section header normally but fully blur
   *  everything inside (no selective first-sentence teaser). Used for anonymous viewers.
   */
  fullBlur?: boolean
}

function BlurWrap({ blurred, children }: { blurred: boolean; children: React.ReactNode }) {
  if (!blurred) return <>{children}</>
  return (
    <div className="select-none pointer-events-none" style={{ filter: 'blur(8px)' }} aria-hidden="true">
      {children}
    </div>
  )
}

function splitFirstSentence(text: string): { first: string; rest: string } {
  if (!text) return { first: '', rest: '' }
  const match = text.match(/^.*?[.!?](?:\s|$)/)
  if (!match) return { first: text, rest: '' }
  return { first: match[0].trim(), rest: text.slice(match[0].length).trim() }
}

function SourceBadge({ source }: { source: string }) {
  const label = source === 'production' ? 'Production' : source === 'both' ? 'Script + Production' : 'Script'
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-600">
      {label}
    </span>
  )
}

export function WhatsHoldingItBackSection({ data, blurred = false, fullBlur = false }: Props) {
  // Full blur mode: chrome + header visible, everything below fully blurred.
  if (fullBlur) {
    return (
      <div className="p-4 sm:p-6 rounded-xl border border-[var(--gem-gray-700)]">
        <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-600 mb-4">
          <AlertTriangle size={14} />
          What needs development
        </h2>
        <BlurWrap blurred={true}>
          {data.headline && (
            <p className="text-sm text-[var(--gem-gray-200)] leading-relaxed mb-5">
              {data.headline}
            </p>
          )}
          <div className="space-y-3">
            {data.themes.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <ChevronDown size={14} className="text-[var(--gem-gray-500)] mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--gem-white)]">{t.theme}</p>
                  <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed mt-1">{t.risk}</p>
                </div>
              </div>
            ))}
          </div>
        </BlurWrap>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 rounded-xl border border-[var(--gem-gray-700)]">
      <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-600 mb-4">
        <AlertTriangle size={14} />
        What needs development
      </h2>

      {/* Headline — tease the first sentence when blurred */}
      {data.headline && (
        blurred ? (
          (() => {
            const { first, rest } = splitFirstSentence(data.headline)
            return (
              <p className="text-sm text-[var(--gem-gray-200)] leading-relaxed mb-5">
                <span>{first}</span>
                {rest && (
                  <>
                    {' '}
                    <span
                      className="select-none pointer-events-none inline-block align-bottom"
                      style={{ filter: 'blur(8px)' }}
                      aria-hidden="true"
                    >
                      {rest}
                    </span>
                  </>
                )}
              </p>
            )
          })()
        ) : (
          <p className="text-sm text-[var(--gem-gray-200)] leading-relaxed mb-5">
            {data.headline}
          </p>
        )
      )}

      {/* Themes list */}
      <div className="space-y-3">
        {data.themes.map((t, i) => (
          <details key={i} className="group">
            <summary className="cursor-pointer list-none flex items-start gap-2">
              <ChevronDown size={14} className="text-[var(--gem-gray-500)] mt-0.5 shrink-0 group-open:rotate-180 transition-transform" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[var(--gem-white)]">
                    {blurred ? (
                      <span className="select-none pointer-events-none" style={{ filter: 'blur(8px)' }} aria-hidden="true">
                        {t.theme}
                      </span>
                    ) : t.theme}
                  </span>
                  {!blurred && <SourceBadge source={t.source} />}
                </div>
              </div>
            </summary>
            <BlurWrap blurred={blurred}>
              <div className="ml-6 mt-2 space-y-1.5">
                <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed">
                  {t.risk}
                </p>
                <p className="text-xs text-[var(--gem-gray-500)] leading-relaxed">
                  {t.evidence}
                </p>
              </div>
            </BlurWrap>
          </details>
        ))}
      </div>
    </div>
  )
}
