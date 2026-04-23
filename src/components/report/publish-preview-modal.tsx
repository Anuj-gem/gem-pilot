'use client'
// PrivacyModal (exported as PublishPreviewModal for import back-compat) —
// the single surface writers use to control what a visitor sees on their
// report. Works identically whether the report is published or not:
//
//   - Unpublished → bottom CTA reads "Publish to Discover". Clicking it
//     saves the privacy settings + flips is_public in one round trip.
//   - Published → bottom CTA reads "Save changes", with an Unpublish
//     secondary action. Changes propagate to Discover live.
//
// Presets are the fast path: Teaser (default), Balanced, Open book.
// Custom expands per-section toggles for power users.
//
// Free writers: modal opens + lets them pick a preset to preview what they'd
// share — but hitting "Publish to Discover" fires the upgrade modal instead
// of saving. Conversion hook is: they see the picker, mentally commit to a
// sharing posture, hit paywall on the final commit.

import { useMemo, useState } from 'react'
import { Check, ChevronDown, Eye, Lock, X, Shield } from 'lucide-react'
import { trackUpgradePromptShown } from '@/lib/posthog'
import {
  PRESETS,
  SECTION_KEYS,
  SECTION_META,
  matchPreset,
  normalizePrivacy,
  resolveVisibility,
  sectionIsPublic,
  type PresetKey,
  type ReportPrivacy,
  type SectionKey,
  type Visibility,
} from '@/lib/report-privacy'

interface Props {
  submissionId: string
  title: string
  initialPrivacy: ReportPrivacy | null
  initialContactEnabled: boolean
  initialIsPublic: boolean
  isSubscribed: boolean
  onDone: (params: { isPublic: boolean; privacy: ReportPrivacy }) => void
  onCancel: () => void
}

export function PublishPreviewModal({
  submissionId,
  title,
  initialPrivacy,
  initialContactEnabled,
  initialIsPublic,
  isSubscribed,
  onDone,
  onCancel,
}: Props) {
  const initial = normalizePrivacy(initialPrivacy)
  const startingPreset = matchPreset(initial) ?? 'teaser'
  const [mode, setMode] = useState<PresetKey | 'custom'>(startingPreset)
  const [privacy, setPrivacy] = useState<ReportPrivacy>(initial)
  const [contactEnabled, setContactEnabled] = useState(initialContactEnabled)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCustom, setShowCustom] = useState(startingPreset === 'teaser' ? false : false)

  // Derived selected privacy — presets resolve to the preset's sections,
  // 'custom' uses the in-progress `privacy` state.
  const selectedPrivacy = useMemo<ReportPrivacy>(() => {
    if (mode === 'custom') return privacy
    return { version: 1, sections: { ...PRESETS[mode].sections } }
  }, [mode, privacy])

  const publicCount = SECTION_KEYS.filter((k) => sectionIsPublic(selectedPrivacy, k)).length
  const isAlreadyPublished = initialIsPublic

  const pickPreset = (key: PresetKey) => {
    setMode(key)
    setPrivacy({ version: 1, sections: { ...PRESETS[key].sections } })
  }

  const enterCustom = () => {
    setMode('custom')
    setShowCustom(true)
  }

  const toggleSection = (key: SectionKey) => {
    const current = resolveVisibility(privacy, key)
    const next: Visibility = current === 'public' ? 'private' : 'public'
    setPrivacy({
      version: 1,
      sections: { ...privacy.sections, [key]: next },
    })
    setMode('custom')
  }

  const openUpgrade = () => {
    try { trackUpgradePromptShown('privacy_modal') } catch {}
    window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
  }

  const commit = async () => {
    // Free writer hitting Publish → upgrade gate. They've already picked a
    // preset so their post-upgrade path is just "go Pro → auto-publish".
    if (!isSubscribed) {
      openUpgrade()
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // Save privacy + contact first.
      await fetch(`/api/scripts/${submissionId}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privacy: selectedPrivacy,
          contact_enabled: contactEnabled,
        }),
      })
      // If unpublished, flip to public. If already published, we're just
      // updating settings — skip the visibility call.
      if (!isAlreadyPublished) {
        const res = await fetch(`/api/scripts/${submissionId}/visibility`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_public: true }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || 'Could not publish.')
        }
      }
      onDone({ isPublic: true, privacy: selectedPrivacy })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSubmitting(false)
    }
  }

  const unpublish = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/scripts/${submissionId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: false }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not unpublish.')
      }
      onDone({ isPublic: false, privacy: selectedPrivacy })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unpublish.')
    } finally {
      setSubmitting(false)
    }
  }

  const ctaLabel = !isSubscribed
    ? 'Go Pro to publish'
    : isAlreadyPublished
      ? 'Save changes'
      : 'Publish to Discover'

  const headerEyebrow = isAlreadyPublished
    ? 'Privacy settings'
    : 'Before you publish'

  const headerTitle = isAlreadyPublished
    ? `Control what visitors see on ${title || 'your report'}`
    : `Choose what visitors see on ${title || 'your report'}`

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl my-8"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[var(--gem-gray-700)]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--gem-accent)] m-0 mb-1">
              {headerEyebrow}
            </p>
            <h2 className="text-[20px] sm:text-[22px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
              {headerTitle}
            </h2>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="flex-shrink-0 w-8 h-8 rounded-full grid place-items-center hover:bg-[var(--gem-gray-800)] text-[var(--gem-gray-500)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-[14px] text-[var(--gem-gray-300)] leading-[1.6] m-0 mb-5 max-w-[60ch]">
            {isAlreadyPublished
              ? `Changes save live — visitors on Discover see the update immediately. Private sections stay completely hidden (not blurred).`
              : `You're in the driver seat. Pick a starting point, then fine-tune if you want. Private sections stay completely hidden from visitors (not blurred).`}
          </p>

          {/* Preset radio options */}
          <div className="space-y-2 mb-4">
            {(Object.values(PRESETS) as typeof PRESETS[PresetKey][]).map((p) => {
              const isActive = mode === p.key
              const presetPublicCount = SECTION_KEYS.filter((k) =>
                sectionIsPublic({ version: 1, sections: p.sections }, k)
              ).length
              return (
                <button
                  key={p.key}
                  onClick={() => pickPreset(p.key)}
                  className={`w-full flex items-start gap-3 text-left px-4 py-3 rounded-xl border transition-colors ${
                    isActive
                      ? 'border-[var(--gem-accent)] bg-[rgba(124,58,237,0.04)]'
                      : 'border-[var(--gem-gray-700)] hover:border-[var(--gem-gray-500)]'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 mt-1 w-4 h-4 rounded-full border-2 ${
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
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <p className="text-[15px] font-semibold text-[var(--gem-gray-50)] m-0">
                        {p.label}
                      </p>
                      <span className="text-[11px] text-[var(--gem-gray-500)]">
                        {presetPublicCount} of {SECTION_KEYS.length} sections public
                      </span>
                    </div>
                    <p className="text-[13px] text-[var(--gem-gray-400)] m-0 leading-snug">
                      {p.blurb}
                    </p>
                  </div>
                </button>
              )
            })}

            {/* Custom — expand for per-section toggles */}
            <div
              className={`rounded-xl border transition-colors ${
                mode === 'custom'
                  ? 'border-[var(--gem-accent)] bg-[rgba(124,58,237,0.04)]'
                  : 'border-[var(--gem-gray-700)]'
              }`}
            >
              <button
                onClick={() => {
                  enterCustom()
                  setShowCustom((s) => !s)
                }}
                className="w-full flex items-start gap-3 text-left px-4 py-3"
              >
                <div
                  className={`flex-shrink-0 mt-1 w-4 h-4 rounded-full border-2 ${
                    mode === 'custom'
                      ? 'border-[var(--gem-accent)] bg-[var(--gem-accent)]'
                      : 'border-[var(--gem-gray-500)]'
                  }`}
                >
                  {mode === 'custom' && (
                    <div className="w-full h-full grid place-items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <p className="text-[15px] font-semibold text-[var(--gem-gray-50)] m-0">
                      Custom
                    </p>
                    {mode === 'custom' && (
                      <span className="text-[11px] text-[var(--gem-gray-500)]">
                        {publicCount} of {SECTION_KEYS.length} sections public
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-[var(--gem-gray-400)] m-0 leading-snug">
                    Pick section-by-section.
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={`mt-1 text-[var(--gem-gray-500)] transition-transform ${showCustom ? 'rotate-180' : ''}`}
                />
              </button>
              {showCustom && (
                <div className="px-4 pb-4 border-t border-[var(--gem-gray-700)] pt-3">
                  <div className="space-y-1">
                    {SECTION_KEYS.map((k) => {
                      const meta = SECTION_META[k]
                      const isPublic = sectionIsPublic(selectedPrivacy, k)
                      return (
                        <button
                          key={k}
                          onClick={() => toggleSection(k)}
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
              )}
            </div>
          </div>

          {/* Visitor preview grid — always visible so writer sees impact
              of whatever preset/custom state they've picked. */}
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-[var(--gem-gray-500)] mb-2 m-0">
              Visitor preview
            </p>
            <div className="rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)] p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {SECTION_KEYS.map((k) => {
                  const meta = SECTION_META[k]
                  const isPublic = sectionIsPublic(selectedPrivacy, k)
                  return (
                    <div
                      key={k}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] ${
                        isPublic
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-[var(--gem-gray-800)] text-[var(--gem-gray-500)] border border-[var(--gem-gray-700)]'
                      }`}
                    >
                      {isPublic ? <Eye size={11} /> : <Lock size={11} />}
                      <span className="font-medium">{meta.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <p className="text-[11px] text-[var(--gem-gray-500)] m-0 mt-2">
              Visitors see only the public sections — private sections are hidden entirely.
              They can request to contact you through Anuj.
            </p>
          </div>

          {/* Contact toggle — lives inside the modal now instead of a
              separate panel. */}
          <div className="rounded-xl border border-[var(--gem-gray-700)] px-4 py-3 flex items-center gap-3 mb-4">
            <Shield size={16} className="flex-shrink-0 text-[var(--gem-gray-500)]" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[var(--gem-gray-50)] m-0">
                Let producers request to contact you
              </p>
              <p className="text-[11.5px] text-[var(--gem-gray-500)] m-0 mt-0.5 leading-snug">
                Routes through Anuj — you approve every connection before details are shared.
              </p>
            </div>
            <Switch
              on={contactEnabled}
              onChange={(on) => {
                if (!isSubscribed) { openUpgrade(); return }
                setContactEnabled(on)
              }}
              disabled={submitting}
            />
          </div>

          {!isSubscribed && (
            <div
              className="rounded-xl p-4 mb-3 flex items-start gap-3"
              style={{
                background: 'rgba(124,58,237,0.06)',
                border: '1px solid rgba(124,58,237,0.25)',
              }}
            >
              <Lock size={14} className="flex-shrink-0 mt-0.5 text-[var(--gem-accent)]" />
              <p className="text-[12.5px] text-[var(--gem-gray-200)] leading-[1.55] m-0">
                <strong className="font-semibold">Publishing to Discover is a Pro feature.</strong>{' '}
                Go Pro to publish this snapshot and let producers find your work.
              </p>
            </div>
          )}

          {error && (
            <p className="text-[13px] text-red-600 m-0 mb-3">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--gem-gray-700)] flex items-center justify-between gap-2 bg-[var(--gem-gray-900)] rounded-b-2xl">
          {/* Left side — Unpublish (only when published). */}
          <div>
            {isAlreadyPublished && isSubscribed && (
              <button
                onClick={unpublish}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--gem-gray-400)] hover:text-red-600 disabled:opacity-50"
              >
                Unpublish
              </button>
            )}
          </div>
          {/* Right side — Cancel + primary CTA. */}
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--gem-gray-400)]"
            >
              Cancel
            </button>
            <button
              onClick={commit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--gem-accent)' }}
            >
              <Check size={14} />
              {submitting ? 'Saving…' : ctaLabel}
            </button>
          </div>
        </div>
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
