import type { ProductionReality as ProductionRealityType, RightsFlag } from '@/types'
import { Users, MapPin, Clapperboard, AlertCircle, Tv } from 'lucide-react'

interface ProductionRealityProps {
  production: ProductionRealityType
  blurred?: boolean
}

function BlurWrap({ blurred, children }: { blurred: boolean; children: React.ReactNode }) {
  if (!blurred) return <>{children}</>
  return (
    <div className="select-none pointer-events-none" style={{ filter: 'blur(8px)' }} aria-hidden="true">
      {children}
    </div>
  )
}

/** Normalize rights_flags — v2 uses string[], v3 uses RightsFlag[] */
function normalizeRightsFlags(flags: (string | RightsFlag)[]): RightsFlag[] {
  return flags.map(f =>
    typeof f === 'string' ? { type: 'brand' as const, detail: f } : f
  )
}

export function ProductionReality({ production, blurred = false }: ProductionRealityProps) {
  const rightsFlags = normalizeRightsFlags(production.rights_flags)
  const period = production.locations?.period_or_contemporary ?? production.period_or_contemporary ?? ''
  const locationMix = production.locations?.interior_exterior_ratio ?? production.locations?.interior_exterior_mix ?? ''

  return (
    <div className="p-4 sm:p-6 rounded-xl border border-[var(--gem-gray-700)]">
      <h2 className="text-xs uppercase tracking-widest text-[var(--gem-gray-400)] mb-6">
        Production Reality
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cast */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--gem-gray-200)]">
            <Users size={14} className="text-[var(--gem-gray-400)]" />
            Cast
          </h3>
          <BlurWrap blurred={blurred}>
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
              {production.cast.name_talent_reason && (
                <p className="text-xs">{production.cast.name_talent_reason}</p>
              )}
              {production.cast.child_actors && (
                <p className="text-xs text-amber-600">Child actors required</p>
              )}
              {production.cast.casting_challenges && production.cast.casting_challenges.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {production.cast.casting_challenges.map((c, i) => (
                    <p key={i} className="text-xs text-[var(--gem-gray-500)]">• {c}</p>
                  ))}
                </div>
              )}
              {production.cast.notes && (
                <p className="text-xs">{production.cast.notes}</p>
              )}
            </div>
          </BlurWrap>
        </div>

        {/* Locations */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--gem-gray-200)]">
            <MapPin size={14} className="text-[var(--gem-gray-400)]" />
            Locations
          </h3>
          <BlurWrap blurred={blurred}>
            <div className="text-sm text-[var(--gem-gray-400)] space-y-1">
              <p>
                <span className="text-[var(--gem-gray-300)]">{production.locations.distinct_count}</span> distinct locations
              </p>
              {locationMix && <p>{locationMix}</p>}
              {production.locations.expensive_flags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {production.locations.expensive_flags.map((flag, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-600">
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </BlurWrap>
        </div>

        {/* Technical */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--gem-gray-200)]">
            <Clapperboard size={14} className="text-[var(--gem-gray-400)]" />
            Technical
          </h3>
          <BlurWrap blurred={blurred}>
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
              {production.technical.animals && (
                <p className="text-xs text-amber-600">Animals required</p>
              )}
              {production.technical.other_flags?.map((flag, i) => (
                <p key={i} className="text-xs">{flag}</p>
              ))}
            </div>
          </BlurWrap>
        </div>

        {/* Platform Fit */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--gem-gray-200)]">
            <Tv size={14} className="text-[var(--gem-gray-400)]" />
            Platform Fit
          </h3>
          <BlurWrap blurred={blurred}>
            <div className="text-sm text-[var(--gem-gray-400)] space-y-1">
              <p className="text-[var(--gem-gray-300)]">{production.platform_fit.recommended_lane}</p>
              <p>Content level: {production.platform_fit.content_level}</p>
              <p className="text-xs">{production.platform_fit.series_engine_or_release_model}</p>
            </div>
          </BlurWrap>
        </div>
      </div>

      {/* Period + Rights flags */}
      <div className="mt-6 pt-4 border-t border-[var(--gem-gray-700)] space-y-3">
        {period && (
          <p className="text-sm text-[var(--gem-gray-400)]">
            <span className="text-[var(--gem-gray-300)] font-medium">Setting:</span>{' '}
            {blurred ? (
              <span className="select-none pointer-events-none" style={{ filter: 'blur(8px)' }} aria-hidden="true">
                {period}
              </span>
            ) : period}
          </p>
        )}

        {rightsFlags.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--gem-gray-200)] mb-2">
              <AlertCircle size={14} className="text-amber-600" />
              Rights & Clearance Flags ({rightsFlags.length})
            </h3>
            <BlurWrap blurred={blurred}>
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
            </BlurWrap>
          </div>
        )}
      </div>
    </div>
  )
}
