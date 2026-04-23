'use client'
// PrivacyPanel — writer-facing control for per-section report visibility.
//
// Design intent (Anuj, 2026-04-23): writers are in the driver seat.
// 3 presets (Teaser / Balanced / Open) cover 90% of cases. Power users open
// the "Adjust sections" drawer to toggle specific sections public/private.
// Score defaults to private — writers who aren't thrilled with their number
// can still show up on Discover without being compared to top scorers.
//
// Wire up: owner side of the report page only. Non-owners never see this.

import { useMemo, useState, useTransition } from 'react'
import { Check, ChevronDown, Eye, EyeOff, Lock, Shield } from 'lucide-react'
import {
  PRESETS,
  SECTION_KEYS,
  SECTION_META,
  matchPreset,
  normalizePrivacy,
  publicSectionCount,
  resolveVisibility,
  type PresetKey,
  type ReportPrivacy,
  type SectionKey,
  type Visibility,
} from '@/lib/report-privacy'

interface Props {
  submissionId: string
  initialPrivacy: ReportPrivacy | null
  initialContactEnabled: boolean
  /** Whether the writer's report is already on Discover. When false the
   *  panel displays but saves have no public-facing effect until they publish. */
  isPublic: boolean
  /** Whether the writer is on Pro. Free writers can still tune their privacy
   *  defaults (so they preview their sharing posture before paying) but the
   *  panel shows a Go-Pro CTA because they can't actually publish yet. */
  isSubscribed: boolean
  /** Called after a successful save so the parent can update any derived UI. */
  onSaved?: (privacy: ReportPrivacy, contactEnabled: boolean) => void
}

export function PrivacyPanel({
  submissionId,
  initialPrivacy,
  initialContactEnabled,
  isPublic,
  isSubscribed,
  onSaved,
}: Props) {
  const [privacy, setPrivacy] = useState<ReportPrivacy>(
    normalizePrivacy(initialPrivacy)
  )
  const [contactEnabled, setContactEnabled] = useState<boolean>(initialContactEnabled)
  const [saving, startSaving] = useTransition()
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const activePreset = useMemo(() => matchPreset(privacy), [privacy])
  const publicCount = publicSectionCount(privacy)

  const save = (next: {
    privacy?: ReportPrivacy
    contactEnabled?: boolean
  }) => {
    setError(null)
    const nextPrivacy = next.privacy ?? privacy
    const nextContact = next.contactEnabled ?? contactEnabled
    // Optimistic — local state updates immediately so toggles feel instant.
    if (next.privacy) setPrivacy(next.privacy)
    if (typeof next.contactEnabled === 'boolean') setContactEnabled(next.contactEnabled)

    startSaving(async () => {
      try {
        const res = await fetch(`/api/scripts/${submissionId}/privacy`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            privacy: nextPrivacy,
            contact_enabled: nextContact,
          }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || 'Could not save.')
        }
        onSaved?.(nextPrivacy, nextContact)
        setJustSaved(true)
        setTimeout(() => setJustSaved(false), 1200)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save.')
      }
    })
  }

  const applyPreset = (key: PresetKey) => {
    save({
      privacy: {
        version: 1,
        sections: { ...PRESETS[key].sections },
      },
    })
  }

  const toggleSection = (key: SectionKey) => {
    const current = resolveVisibility(privacy, key)
    const next: Visibility = current === 'public' ? 'private' : 'public'
    save({
      privacy: {
        version: 1,
        sections: { ...privacy.sections, [key]: next },
      },
    })
  }

  return (
    <div className="rounded-xl border border-[var(--gem-gray-700)] bg-white">
      <div className="px-4 py-3.5 border-b border-[var(--gem-gray-700)]">
        <div className="flex items-center gap-2 mb-0.5">
          <Shield size={14} className="text-[var(--gem-accent)]" />
          <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-[var(--gem-gray-400)] m-0">
            Privacy
          </p>
          {justSaved && (
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-emerald-600">
              <Check size={12} /> saved
            </span>
          )}
          {saving && !justSaved && (
            <span className="ml-auto text-[11px] text-[var(--gem-gray-400)]">
              saving…
            </span>
          )}
        </div>
        <p className="text-[12px] text-[var(--gem-gray-500)] m-0 leading-snug">
          {isPublic
            ? `${publicCount} of ${SECTION_KEYS.length} sections visible to visitors.`
            : isSubscribed
              ? `Pick how you want to share this — it goes live when you publish.`
              : `This is what a visitor would see. Go Pro to publish and let producers find you.`}
        </p>
      </div>

      {/* Presets — the fast path. */}
      <div className="px-4 py-3 space-y-1.5">
        {(Object.values(PRESETS) as typeof PRESETS[PresetKey][]).map((p) => {
          const isActive = activePreset === p.key
          return (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              disabled={saving}
              className={`w-full flex items-start gap-2.5 text-left px-3 py-2.5 rounded-lg border transition-colors ${
                isActive
                  ? 'border-[var(--gem-accent)] bg-[rgba(124,58,237,0.04)]'
                  : 'border-[var(--gem-gray-700)] hover:border-[var(--gem-gray-500)]'
              } ${saving ? 'opacity-60 cursor-wait' : ''}`}
            >
              <div
                className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border-2 ${
                  isActive
                    ? 'border-[var(--gem-accent)] bg-[var(--gem-accent)]'
                    : 'border-[var(--gem-gray-500)]'
                }`}
              >
                {isActive && (
                  <div className="w-full h-full grid place-items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
                  {p.label}
                </p>
                <p className="text-[11.5px] text-[var(--gem-gray-500)] m-0 mt-0.5 leading-snug">
                  {p.blurb}
                </p>
              </div>
            </button>
          )
        })}
        {activePreset === null && (
          <div className="px-3 py-2 rounded-lg text-[11.5px] text-[var(--gem-accent)] bg-[rgba(124,58,237,0.06)] border border-[rgba(124,58,237,0.2)]">
            Custom settings — matches no preset.
          </div>
        )}
      </div>

      {/* Advanced — per-section toggles. Collapsed by default. */}
      <div className="border-t border-[var(--gem-gray-700)]">
        <button
          onClick={() => setShowAdvanced((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-200)]"
        >
          <span className="font-medium">Adjust sections</span>
          <ChevronDown
            size={14}
            className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          />
        </button>
        {showAdvanced && (
          <div className="px-4 pb-4 space-y-2">
            <SectionGroup
              label="Summary"
              keys={SECTION_KEYS.filter((k) => SECTION_META[k].group === 'summary')}
              privacy={privacy}
              onToggle={toggleSection}
              disabled={saving}
            />
            <SectionGroup
              label="Deep dive"
              keys={SECTION_KEYS.filter((k) => SECTION_META[k].group === 'deep')}
              privacy={privacy}
              onToggle={toggleSection}
              disabled={saving}
            />
          </div>
        )}
      </div>

      {/* Contact writer toggle. */}
      <div className="border-t border-[var(--gem-gray-700)] px-4 py-3.5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-[var(--gem-gray-50)] m-0">
            Let people request to contact you
          </p>
          <p className="text-[11px] text-[var(--gem-gray-500)] m-0 mt-0.5 leading-snug">
            Routes through Anuj — you approve any connection before details are shared.
          </p>
        </div>
        <Switch
          on={contactEnabled}
          onChange={(on) => save({ contactEnabled: on })}
          disabled={saving}
        />
      </div>

      {error && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-[11px] text-red-600 m-0">{error}</p>
        </div>
      )}
    </div>
  )
}

function SectionGroup({
  label,
  keys,
  privacy,
  onToggle,
  disabled,
}: {
  label: string
  keys: SectionKey[]
  privacy: ReportPrivacy
  onToggle: (k: SectionKey) => void
  disabled: boolean
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--gem-gray-500)] mb-1.5 m-0">
        {label}
      </p>
      <div className="space-y-1">
        {keys.map((k) => {
          const meta = SECTION_META[k]
          const vis = resolveVisibility(privacy, k)
          const isPublic = vis === 'public'
          return (
            <button
              key={k}
              onClick={() => onToggle(k)}
              disabled={disabled}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[var(--gem-gray-800)] text-left transition-colors"
            >
              <div
                className={`flex-shrink-0 w-7 h-7 rounded-full grid place-items-center ${
                  isPublic
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-[var(--gem-gray-800)] text-[var(--gem-gray-400)] border border-[var(--gem-gray-700)]'
                }`}
              >
                {isPublic ? <Eye size={12} /> : <Lock size={12} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-[var(--gem-gray-50)] m-0 leading-tight">
                  {meta.label}
                </p>
                <p className="text-[10.5px] text-[var(--gem-gray-500)] m-0 leading-snug">
                  {meta.hint}
                </p>
              </div>
              <span
                className={`flex-shrink-0 text-[10px] uppercase tracking-[0.1em] font-bold ${
                  isPublic ? 'text-emerald-700' : 'text-[var(--gem-gray-500)]'
                }`}
              >
                {isPublic ? 'Public' : 'Private'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Switch({
  on,
  onChange,
  disabled,
}: {
  on: boolean
  onChange: (on: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      disabled={disabled}
      aria-pressed={on}
      className={`flex-shrink-0 inline-flex items-center h-6 w-11 rounded-full transition-colors ${
        on ? 'bg-emerald-500' : 'bg-[var(--gem-gray-700)]'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <span
        className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
