'use client'
// PrivacyModal (exported as PublishPreviewModal for import back-compat) —
// the single surface writers use to control what a visitor sees on their
// report. Works identically whether the report is published or not:
//
//   - Unpublished → bottom CTA reads "Publish to Leaderboard". Clicking it
//     saves the privacy settings + flips is_public in one round trip.
//   - Published → bottom CTA reads "Save changes", with an Unpublish
//     secondary action. Changes propagate to Discover live.
//
// Presets are the fast path: Teaser (default), Balanced, Open book.
// Custom expands per-section toggles for power users.
//
// Free writers: modal opens + lets them pick a preset to preview what they'd
// share — but hitting "Publish to Leaderboard" fires the upgrade modal instead
// of saving. Conversion hook is: they see the picker, mentally commit to a
// sharing posture, hit paywall on the final commit.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Eye, Lock, X, Shield } from 'lucide-react'
import { trackUpgradePromptShown } from '@/lib/posthog'
import {
  PRESETS,
  SECTION_KEYS,
  SECTION_META,
  allPrivate,
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
  /** Evaluation id — used to route writers back to their report after a
   *  successful Stripe subscribe (the Pro gate). */
  evaluationId?: string
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
  evaluationId,
  title,
  initialPrivacy,
  initialContactEnabled,
  initialIsPublic,
  isSubscribed,
  onDone,
  onCancel,
}: Props) {
  const router = useRouter()
  const initial = normalizePrivacy(initialPrivacy)
  // Default seed: if the writer hasn't picked anything yet AND the report is
  // unpublished, pre-select Pitch Only. Most writers want to publish exactly
  // the pitch sections; landing them on Custom (everything-private) was a
  // dead-end that produced near-empty public reports (Anuj 2026-04-23).
  // If they've already published or have explicit settings, we respect them.
  const seeded: ReportPrivacy =
    Object.keys(initial.sections).length === 0 && !initialIsPublic
      ? { version: 1, sections: { ...PRESETS.pitch_only.sections } }
      : initial
  // Privacy is the single source of truth. `mode` is derived: if the
  // current privacy exactly matches one of the three presets, that's the
  // selected radio; otherwise 'custom' lights up.
  const [privacy, setPrivacy] = useState<ReportPrivacy>(seeded)
  const [contactEnabled, setContactEnabled] = useState(initialContactEnabled)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mode: PresetKey | 'custom' = useMemo(() => matchPreset(privacy) ?? 'custom', [privacy])
  const selectedPrivacy = privacy
  const publicCount = SECTION_KEYS.filter((k) => sectionIsPublic(selectedPrivacy, k)).length
  const isAlreadyPublished = initialIsPublic

  const pickPreset = (key: PresetKey) => {
    setPrivacy({ version: 1, sections: { ...PRESETS[key].sections } })
  }

  const pickCustom = () => {
    // Custom defaults to nothing public — writer opts in section-by-section
    // via the visitor-preview grid chips below. No "all public" surprises.
    setPrivacy({ version: 1, sections: { ...allPrivate() } })
  }

  const toggleSection = (key: SectionKey) => {
    const current = resolveVisibility(privacy, key)
    const next: Visibility = current === 'public' ? 'private' : 'public'
    // Fill in the full section record so matchPreset can compare cleanly.
    const base: Record<SectionKey, Visibility> = {
      ...allPrivate(),
      ...privacy.sections,
    }
    setPrivacy({
      version: 1,
      sections: { ...base, [key]: next },
    })
  }

  // Direct-to-Stripe upgrade — skips the intermediate SubscribeGate modal.
  // Per Anuj's call: hitting "Go Pro" should go straight to checkout,
  // not pop another modal that the writer has to click through.
  const openUpgrade = async () => {
    try { trackUpgradePromptShown('privacy_modal') } catch {}
    setSubmitting(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Return them to this report after a successful subscribe.
        body: JSON.stringify({ redirect_report: evaluationId ?? null }),
      })
      const j = await res.json()
      if (j.url) {
        window.location.href = j.url
      } else {
        // Fall back to the modal if something's off with checkout so we
        // don't leave the writer with a dead button.
        window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
        setSubmitting(false)
      }
    } catch {
      window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
      setSubmitting(false)
    }
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
      // Broadcast the new state so every SectionGate pill + banner on the
      // page flips instantly. Then refresh the server-rendered data so the
      // rest of the page (tied to props) catches up on the next render.
      window.dispatchEvent(new CustomEvent('gem:report-state-changed', {
        detail: { isPublic: true, privacy: selectedPrivacy },
      }))
      router.refresh()
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
      // Same broadcast pattern — pills + banner + anything else on the
      // page sync without a navigation.
      window.dispatchEvent(new CustomEvent('gem:report-state-changed', {
        detail: { isPublic: false, privacy: selectedPrivacy },
      }))
      router.refresh()
      onDone({ isPublic: false, privacy: selectedPrivacy })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unpublish.')
    } finally {
      setSubmitting(false)
    }
  }

  const ctaLabel = !isSubscribed
    ? 'Go Pro — $20/mo'
    : isAlreadyPublished
      ? 'Save changes'
      : 'Make visible to industry partners'

  const headerEyebrow = isAlreadyPublished
    ? 'Industry visibility'
    : 'Make visible to industry partners'

  const headerTitle = isAlreadyPublished
    ? `Control what industry partners see on ${title || 'your report'}`
    : `Choose what industry partners see on ${title || 'your report'}`

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      {/* Modal shell: height capped at the viewport, flex column so the
          header + footer stay pinned and only the middle body scrolls.
          Prevents the header from scrolling offscreen on tall dialogs. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[calc(100vh-2rem)] shadow-2xl flex flex-col"
      >
        <div className="flex-shrink-0 flex items-start justify-between gap-4 px-6 py-5 border-b border-[var(--gem-gray-700)]">
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

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <p className="text-[14px] text-[var(--gem-gray-300)] leading-[1.6] m-0 mb-5 max-w-[62ch]">
            You choose what industry partners see. They&apos;ll find your script on
            the{' '}
            <a
              href="/community"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: 'var(--gem-accent)' }}
            >
              Discover Portal
            </a>
            {' '}— where producers, agents, and dev execs browse for scripts to option.
            Private sections are hidden completely, not blurred.
            {isAlreadyPublished && ' Changes save live.'}
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

            {/* Custom — simple radio. Starts with everything private; user
                opts in section-by-section via the interactive preview grid
                below. No pre-populated state carried over from other presets. */}
            <button
              onClick={pickCustom}
              className={`w-full flex items-start gap-3 text-left px-4 py-3 rounded-xl border transition-colors ${
                mode === 'custom'
                  ? 'border-[var(--gem-accent)] bg-[rgba(124,58,237,0.04)]'
                  : 'border-[var(--gem-gray-700)] hover:border-[var(--gem-gray-500)]'
              }`}
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
                  Nothing public by default — tap sections below to turn them on.
                </p>
              </div>
            </button>
          </div>

          {/* Section grid — interactive. Grouped by Pitch and Development
              Details (matches the app's mental model). Click a chip to
              toggle that section public/private. The preset radio above
              updates automatically to reflect whichever preset matches
              (or Custom if no preset matches). */}
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-[var(--gem-gray-500)] mb-2 m-0">
              What visitors see — tap to toggle
            </p>
            <div className="rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)] p-3 space-y-3">
              <SectionGroup
                label="Pitch"
                keys={SECTION_KEYS.filter((k) => SECTION_META[k].group === 'pitch')}
                privacy={selectedPrivacy}
                onToggle={toggleSection}
              />
              <SectionGroup
                label="Development details"
                keys={SECTION_KEYS.filter((k) => SECTION_META[k].group === 'development')}
                privacy={selectedPrivacy}
                onToggle={toggleSection}
              />
            </div>
            <p className="text-[11px] text-[var(--gem-gray-500)] m-0 mt-2">
              Visitors see only the public sections — private ones are hidden entirely.
            </p>
          </div>

          {/* Score visibility toggle — separate from sections because score
              isn't a section, it's a top-card element. Default is on (score
              shown). Owners always see their own score regardless. */}
          <div className="rounded-xl border border-[var(--gem-gray-700)] px-4 py-3 flex items-center gap-3 mb-3">
            <Eye size={16} className="flex-shrink-0 text-[var(--gem-gray-500)]" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[var(--gem-gray-50)] m-0">
                Show your score to industry partners
              </p>
              <p className="text-[11.5px] text-[var(--gem-gray-500)] m-0 mt-0.5 leading-snug">
                Hide if you&apos;d rather they read the report on its own merit.
              </p>
            </div>
            <Switch
              on={privacy.show_score !== false}
              onChange={(on) =>
                setPrivacy((p) => ({ ...p, show_score: on }))
              }
              disabled={submitting}
            />
          </div>

          {/* Contact toggle — lives inside the modal now instead of a
              separate panel. */}
          <div className="rounded-xl border border-[var(--gem-gray-700)] px-4 py-3 flex items-center gap-3 mb-4">
            <Shield size={16} className="flex-shrink-0 text-[var(--gem-gray-500)]" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[var(--gem-gray-50)] m-0">
                Let industry partners contact you directly
              </p>
              <p className="text-[11.5px] text-[var(--gem-gray-500)] m-0 mt-0.5 leading-snug">
                Messages land in your email inbox.
              </p>
            </div>
            <Switch
              on={contactEnabled}
              onChange={(on) => setContactEnabled(on)}
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
                Industry visibility is a Pro feature. Go Pro to let industry partners find this script on the Discover Portal.
              </p>
            </div>
          )}

          {error && (
            <p className="text-[13px] text-red-600 m-0 mb-3">{error}</p>
          )}
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-[var(--gem-gray-700)] flex items-center justify-between gap-2 bg-[var(--gem-gray-900)] rounded-b-2xl">
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

function SectionGroup({
  label,
  keys,
  privacy,
  onToggle,
}: {
  label: string
  keys: SectionKey[]
  privacy: ReportPrivacy
  onToggle: (key: SectionKey) => void
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--gem-gray-500)] mb-1.5 m-0">
        {label}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {keys.map((k) => {
          const meta = SECTION_META[k]
          const isPublic = sectionIsPublic(privacy, k)
          return (
            <button
              key={k}
              onClick={() => onToggle(k)}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] transition-colors ${
                isPublic
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-[var(--gem-gray-800)] text-[var(--gem-gray-500)] border border-[var(--gem-gray-700)] hover:border-[var(--gem-gray-500)]'
              }`}
            >
              {isPublic ? <Eye size={11} /> : <Lock size={11} />}
              <span className="font-medium flex-1 text-left">{meta.label}</span>
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
