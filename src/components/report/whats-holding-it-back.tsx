import type { WhatsHoldingItBack, ProductionReality as ProductionRealityType, RightsFlag } from '@/types'
import { AlertTriangle, ChevronDown, Users, MapPin, Clapperboard, Tv, AlertCircle } from 'lucide-react'

interface Props {
  data: WhatsHoldingItBack
  blurred?: boolean
  /** When true, render the card chrome + section header normally but fully blur
   *  everything inside (no selective first-sentence teaser). Used for anonymous viewers.
   */
  fullBlur?: boolean
  /** Production reality data — rendered as a sub-section within this card */
  production?: ProductionRealityType
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

/** Normalize rights_flags — v2 uses string[], v3 uses RightsFlag[] */
function normalizeRightsFlags(flags: (string | RightsFlag)[]): RightsFlag[] {
  return flags.map(f =>
    typeof f === 'string' ? { type: 'brand' as const, detail: f } : f
  )
}

/** Build a one-line production summary */
function buildProductionSummary(production: ProductionRealityType): string {
  const parts: string[] = []
  if (production.cast.speaking_roles) parts.push(`${production.cast.speaking_roles} speaking roles`)
  if (production.cast.leads) parts.push(`${production.cast.leads} leads`)
  if (production.cast.requires_name_talent) parts.push('Name talent required')
  if (production.locations?.distinct_count) parts.push(`${production.locations.distinct_count} locations`)
  if (production.technical?.vfx_level) parts.push(`${production.technical.vfx_level} VFX`)
  const rightsFlags = production.rights_flags ?? []
  if (rightsFlags.length > 0) parts.push(`${rightsFlags.length} rights flag${rightsFlags.length > 1 ? 's' : ''}`)
  return parts.join(' · ')
}

function ProductionSubSection({ production, blurred }: { production: ProductionRealityType; blurred: boolean }) {
  const rightsFlags = normalizeRightsFlags(production.rights_flags)
  const locationMix = production.locations?.interior_exterior_ratio ?? production.locations?.interior_exterior_mix ?? ''
  const summary = buildProductionSummary(production)

  return (
    <div className="mt-6 pt-5 border-t border-[var(--gem-gray-700)]">
      <h3 className="text-xs uppercase tracking-widest text-[var(--gem-gray-400)] mb-3">
        Production Considerations
      </h3>

      <BlurWrap blurred={blurred}>
        <p className="text-sm font-medium text-[var(--gem-gray-300)] mb-4">{summary}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Cast */}
          <div className="space-y-1.5">
            <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--gem-gray-200)]">
              <Users size={14} className="text-[var(--gem-gray-400)]" />
              Cast
            </h4>
            <div className="text-sm text-[var(--gem-gray-400)] space-y-1">
              <p>
                <span className="text-[var(--gem-gray-300)]">{production.cast.speaking_roles}</span> speaking roles,{' '}
                <span className="text-[var(--gem-gray-300)]">{production.cast.leads}</span> leads
                {production.cast.series_regulars != null && (
                  <>, <span className="text-[var(--gem-gray-300)]">{production.cast.series_regulars}</span> regulars</>
                )}
              </p>
              <p>
                Name talent:{' '}
                <span className={production.cast.requires_name_talent ? 'text-amber-600' : 'text-emerald-600'}>
                  {production.cast.requires_name_talent ? 'Yes' : 'No'}
                </span>
              </p>
              {production.cast.child_actors && <p className="text-xs text-amber-600">Child actors required</p>}
              {production.cast.casting_challenges && production.cast.casting_challenges.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {production.cast.casting_challenges.map((c, i) => (
                    <p key={i} className="text-xs text-[var(--gem-gray-500)]">• {c}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-1.5">
            <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--gem-gray-200)]">
              <MapPin size={14} className="text-[var(--gem-gray-400)]" />
              Locations
            </h4>
            <div className="text-sm text-[var(--gem-gray-400)] space-y-1">
              <p><span className="text-[var(--gem-gray-300)]">{production.locations.distinct_count}</span> distinct locations</p>
              {locationMix && <p>{locationMix}</p>}
              {production.locations.expensive_flags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {production.locations.expensive_flags.map((flag, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-600">{flag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Technical */}
          <div className="space-y-1.5">
            <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--gem-gray-200)]">
              <Clapperboard size={14} className="text-[var(--gem-gray-400)]" />
              Technical
            </h4>
            <div className="text-sm text-[var(--gem-gray-400)] space-y-1">
              {(production.technical.vfx_level || production.technical.vfx_requirements) && (
                <p>
                  <span className="text-[var(--gem-gray-300)]">VFX:</span>{' '}
                  {production.technical.vfx_level ?? ''}{production.technical.vfx_details ? ` — ${production.technical.vfx_details}` : production.technical.vfx_requirements ?? ''}
                </p>
              )}
              {(production.technical.stunts_level || production.technical.stunts) && (
                <p>
                  <span className="text-[var(--gem-gray-300)]">Stunts:</span>{' '}
                  {production.technical.stunts_level ?? production.technical.stunts ?? ''}
                </p>
              )}
              {production.technical.sfx_needs && (
                <p><span className="text-[var(--gem-gray-300)]">SFX:</span> {production.technical.sfx_needs}</p>
              )}
              {production.technical.night_shoots && (
                <p><span className="text-[var(--gem-gray-300)]">Night shoots:</span> {production.technical.night_shoots}</p>
              )}
              {production.technical.animals && <p className="text-xs text-amber-600">Animals required</p>}
            </div>
          </div>

          {/* Platform Fit */}
          <div className="space-y-1.5">
            <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--gem-gray-200)]">
              <Tv size={14} className="text-[var(--gem-gray-400)]" />
              Platform Fit
            </h4>
            <div className="text-sm text-[var(--gem-gray-400)] space-y-1">
              <p className="text-[var(--gem-gray-300)]">{production.platform_fit.recommended_lane}</p>
              <p>Content level: {production.platform_fit.content_level}</p>
              <p className="text-xs">{production.platform_fit.series_engine_or_release_model}</p>
            </div>
          </div>
        </div>

        {/* Rights flags */}
        {rightsFlags.length > 0 && (
          <div className="pt-4 mt-4 border-t border-[var(--gem-gray-700)]">
            <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--gem-gray-200)] mb-2">
              <AlertCircle size={14} className="text-amber-600" />
              Rights & Clearance Flags ({rightsFlags.length})
            </h4>
            <div className="space-y-1.5">
              {rightsFlags.map((flag, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--gem-gray-800)] border border-[var(--gem-gray-600)] text-[var(--gem-gray-400)] shrink-0 mt-0.5">
                    {flag.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-[var(--gem-gray-300)]">{flag.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </BlurWrap>
    </div>
  )
}

export function WhatsHoldingItBackSection({ data, blurred = false, fullBlur = false, production }: Props) {
  // Full blur mode: chrome + header visible, everything below fully blurred.
  if (fullBlur) {
    return (
      <div className="p-4 sm:p-6 rounded-xl border border-[var(--gem-gray-700)]">
        <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-600 mb-4">
          <AlertTriangle size={14} />
          What to Address During Development
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
          {production && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-widest text-[var(--gem-gray-400)] mb-2">Production Considerations</p>
              <p className="text-sm text-[var(--gem-gray-300)]">{buildProductionSummary(production)}</p>
            </div>
          )}
        </BlurWrap>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 rounded-xl border border-[var(--gem-gray-700)]">
      <h2 className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-600 mb-4">
        <AlertTriangle size={14} />
        What to Address During Development
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

      {/* Production Considerations sub-section */}
      {production && (
        <ProductionSubSection production={production} blurred={blurred} />
      )}
    </div>
  )
}
