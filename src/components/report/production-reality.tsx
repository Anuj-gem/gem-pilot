import type { ProductionReality as ProductionRealityType } from '@/types'
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

export function ProductionReality({ production, blurred = false }: ProductionRealityProps) {
  return (
    <div className="p-4 sm:p-6 rounded-xl border border-[var(--gem-gray-700)]">
      <h2 className="text-xs uppercase tracking-widest text-[var(--gem-gray-400)] mb-6">
        Production Reality Check
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
              </p>
              <p>
                Name talent required:{' '}
                <span className={production.cast.requires_name_talent ? 'text-amber-400' : 'text-emerald-400'}>
                  {production.cast.requires_name_talent ? 'Yes' : 'No'}
                </span>
              </p>
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
              <p>{production.locations.interior_exterior_mix}</p>
              {production.locations.expensive_flags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {production.locations.expensive_flags.map((flag, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-amber-950/30 border border-amber-800/50 text-amber-400">
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
              {production.technical.vfx_requirements && (
                <p><span className="text-[var(--gem-gray-300)]">VFX:</span> {production.technical.vfx_requirements}</p>
              )}
              {production.technical.stunts && (
                <p><span className="text-[var(--gem-gray-300)]">Stunts:</span> {production.technical.stunts}</p>
              )}
              {production.technical.other_flags.map((flag, i) => (
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
        <p className="text-sm text-[var(--gem-gray-400)]">
          <span className="text-[var(--gem-gray-300)] font-medium">Setting:</span>{' '}
          {blurred ? (
            <span className="select-none pointer-events-none" style={{ filter: 'blur(8px)' }} aria-hidden="true">
              {production.period_or_contemporary}
            </span>
          ) : (
            production.period_or_contemporary
          )}
        </p>

        {production.rights_flags.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--gem-gray-200)] mb-2">
              <AlertCircle size={14} className="text-amber-400" />
              Rights & Clearance Flags
            </h3>
            <BlurWrap blurred={blurred}>
              <div className="flex flex-wrap gap-1.5">
                {production.rights_flags.map((flag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded bg-[var(--gem-gray-800)] border border-[var(--gem-gray-600)] text-[var(--gem-gray-300)]"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </BlurWrap>
          </div>
        )}
      </div>
    </div>
  )
}
