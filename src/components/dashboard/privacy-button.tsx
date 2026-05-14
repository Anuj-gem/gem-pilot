'use client'

// Dashboard privacy button — small companion control on each script card
// so the writer can adjust per-section visibility (and hide their score)
// without leaving the dashboard.
//
// Tap "Privacy" → opens a bottom sheet (mobile) / centered card (desktop)
// listing each section + the score with a one-tap pill. Tapping any pill
// fires the same PrivacyConfirmSheet the report page uses so the flow is
// consistent across surfaces.

import { useEffect, useState } from 'react'
import { Eye, Lock, Shield, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  isScoreVisible,
  resolveVisibility,
  SECTION_KEYS,
  SECTION_META,
  normalizePrivacy,
  type ReportPrivacy,
  type SectionKey,
  type Visibility,
} from '@/lib/report-privacy'
import { PrivacyConfirmSheet } from '@/components/report/privacy-confirm-sheet'

interface Props {
  submissionId: string
  initialPrivacy: ReportPrivacy | null
  /** Whether the post is currently visible to industry (script_submissions.is_public).
   *  Master toggle at the top of the panel flips this. */
  initialIsPublic: boolean
  /** Optional custom trigger label — defaults to "Privacy". The report
   *  page uses something like "Privacy settings" instead. */
  triggerLabel?: string
  /** Render the trigger inline as a text link rather than a bordered pill.
   *  - 'pill' (default): bordered "Privacy" pill with shield icon.
   *  - 'link': plain text link, used inside the report-page status line.
   *  - 'status-pill': renders an existing visibility status pill (e.g.
   *    "Visible to industry" / "Unpublished") AS the trigger — used by the
   *    dashboard card so the writer can publish/unpublish from one click.
   *    Pass `statusPillStyle` to set the pill colors. */
  triggerVariant?: 'pill' | 'link' | 'status-pill'
  /** Required when triggerVariant === 'status-pill'. Provides the pill
   *  colors so the trigger matches the surrounding card's status palette. */
  statusPillStyle?: {
    color: string
    bg: string
    border: string
  }
  /** Anuj 2026-04-28: privacy is a Pro-only feature. Free writers can
   *  open the panel (so they can see what they'd get) but tapping any
   *  toggle fires the global upgrade modal instead of saving. */
  isProSubscriber?: boolean
}

export function DashboardPrivacyButton({
  submissionId,
  initialPrivacy,
  initialIsPublic,
  triggerLabel = 'Privacy',
  triggerVariant = 'pill',
  statusPillStyle,
  isProSubscriber = true,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [privacy, setPrivacy] = useState<ReportPrivacy>(() =>
    normalizePrivacy(initialPrivacy)
  )
  const [isPublic, setIsPublic] = useState<boolean>(initialIsPublic)
  const [pendingConfirm, setPendingConfirm] = useState<
    | { kind: 'section'; key: SectionKey; nextVis: Visibility }
    | { kind: 'score'; nextShown: boolean }
    | { kind: 'visibility'; nextPublic: boolean }
    | null
  >(null)
  const [busy, setBusy] = useState(false)

  // Inline "upgrade prompt" sheet — a small contextual modal shown when a
  // free writer taps any Pro-gated pill in this panel. Replaces the
  // heavier global PaywallModal so the user gets a focused message in
  // context. Anuj 2026-04-28.
  const [proPromptOpen, setProPromptOpen] = useState(false)

  // Privacy gating (Anuj 2026-04-28, revised v3): publishing to industry
  // partners and per-section privacy are Pro-only — every toggle in
  // this panel goes through gateOrAct. Free writers see Pro pills in
  // place of the Visible/Hidden controls; tapping any pill opens the
  // small in-panel upgrade prompt.
  function gateOrAct(action: () => void) {
    if (!isProSubscriber) {
      setProPromptOpen(true)
      return
    }
    action()
  }

  // Lock body scroll when the sheet's open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Escape closes.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function persist(payload: {
    privacy?: ReportPrivacy
    show_score?: boolean
    is_public?: boolean
  }) {
    setBusy(true)
    try {
      const res = await fetch(
        `/api/scripts/${encodeURIComponent(submissionId)}/privacy`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(payload.privacy
              ? { privacy: { sections: payload.privacy.sections } }
              : {}),
            ...(payload.show_score !== undefined
              ? { show_score: payload.show_score }
              : {}),
            ...(payload.is_public !== undefined
              ? { is_public: payload.is_public }
              : {}),
          }),
        }
      )
      if (res.ok) {
        const json = await res.json().catch(() => ({}))
        if (json?.report_privacy) {
          setPrivacy(normalizePrivacy(json.report_privacy))
        }
        if (typeof json?.is_public === 'boolean') {
          setIsPublic(json.is_public)
        }
        router.refresh()
      }
    } catch {
      /* swallow */
    } finally {
      setBusy(false)
      setPendingConfirm(null)
    }
  }

  function handleConfirm() {
    if (!pendingConfirm) return
    if (pendingConfirm.kind === 'section') {
      const next: ReportPrivacy = {
        version: 1,
        sections: {
          ...privacy.sections,
          [pendingConfirm.key]: pendingConfirm.nextVis,
        },
        ...(privacy.show_score !== undefined
          ? { show_score: privacy.show_score }
          : {}),
      }
      persist({ privacy: next })
    } else if (pendingConfirm.kind === 'score') {
      persist({ show_score: pendingConfirm.nextShown })
    } else {
      // Master visibility flip — server also rewrites all section pills to
      // match (all-private on unpublish, all-public on publish), so we
      // just send the is_public field and let the response tell us the
      // new shape.
      persist({ is_public: pendingConfirm.nextPublic })
    }
  }

  return (
    <>
      {triggerVariant === 'link' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[12.5px] font-medium text-[var(--gem-gray-300)] hover:text-[var(--gem-gold)] transition-colors underline-offset-2 hover:underline"
          aria-label="Privacy settings"
        >
          {triggerLabel}
        </button>
      ) : triggerVariant === 'status-pill' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold transition-opacity hover:opacity-80 cursor-pointer"
          style={{
            border: `1px solid ${statusPillStyle?.border ?? 'var(--gem-gray-700)'}`,
            background: statusPillStyle?.bg ?? 'transparent',
            color: statusPillStyle?.color ?? 'var(--gem-gray-500)',
          }}
          aria-label="Open privacy settings"
          title="Tap to open privacy controls"
        >
          {triggerLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--gem-gray-400)] hover:text-[var(--gem-gold)] transition-colors px-2.5 py-1 rounded-md border border-[var(--gem-gray-700)]"
          aria-label="Privacy settings"
          title="Adjust what industry partners see"
        >
          <Shield size={12} />
          {triggerLabel}
        </button>
      )}

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-privacy-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md sm:w-[min(92vw,460px)] sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]"
            style={{
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            }}
          >
            <div
              aria-hidden
              className="sm:hidden w-10 h-1 rounded-full mx-auto mt-2.5 mb-1"
              style={{ background: 'var(--gem-gray-700)' }}
            />
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5">
              <div>
                <h2
                  id="dashboard-privacy-title"
                  className="text-[16px] sm:text-[17px] font-bold text-[var(--gem-gray-50)] tracking-tight m-0 leading-tight"
                >
                  Privacy
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0 -mr-1 -mt-1 w-8 h-8 rounded-full grid place-items-center hover:bg-[var(--gem-gray-800)] text-[var(--gem-gray-500)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4">
              {/* Free-writer upsell — sits above everything so the upgrade
                  pitch isn't buried in tiny gray hint text. The
                  per-section + score-eye rows below render with a "Pro"
                  pill in place of the Visible/Hidden toggle, and tapping
                  any of them re-opens this same upgrade modal. Anuj
                  2026-04-28. */}
              {!isProSubscriber && (
                <button
                  type="button"
                  onClick={() => setProPromptOpen(true)}
                  className="w-full text-left rounded-xl px-4 py-3 mb-3 flex items-center justify-between gap-3 transition-colors hover:opacity-95"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(124,58,237,0.10), rgba(124,58,237,0.04))',
                    border: '1px solid rgba(124,58,237,0.35)',
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-bold text-[var(--gem-gray-50)] m-0 leading-tight">
                      Privacy controls are a Pro feature
                    </p>
                    <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-0.5 leading-snug">
                      Hide specific sections and publish to industry partners.
                    </p>
                  </div>
                  <span
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11.5px] font-semibold text-white"
                    style={{ background: 'var(--gem-accent)' }}
                  >
                    Upgrade — $20/mo
                  </span>
                </button>
              )}

              {/* Master toggle — "Visible to industry partners". Pro-only;
                  for free writers we render a Pro pill in place of the
                  Published/Unpublished pill, and tap fires the upgrade
                  modal via gateOrAct. */}
              <div
                className="rounded-xl p-3.5 mb-3"
                style={{
                  background: isPublic
                    ? 'rgba(5,150,105,0.06)'
                    : 'var(--gem-gray-900)',
                  border: isPublic
                    ? '1px solid rgba(5,150,105,0.30)'
                    : '1px solid var(--gem-gray-700)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-[var(--gem-gray-50)] m-0 leading-tight">
                      Visible to industry partners
                    </p>
                    <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-1 leading-snug">
                      {isPublic
                        ? 'Industry partners can see your report. Section pills below let you narrow what\u2019s shown.'
                        : 'Your post is hidden from industry partners. Only you can see this report.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      gateOrAct(() =>
                        setPendingConfirm({
                          kind: 'visibility',
                          nextPublic: !isPublic,
                        })
                      )
                    }
                    title={
                      !isProSubscriber
                        ? 'Pro feature — tap to upgrade'
                        : undefined
                    }
                    className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] uppercase tracking-[0.12em] font-bold transition-colors ${
                      isPublic
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                        : 'text-[var(--gem-gray-500)] bg-white border border-[var(--gem-gray-700)] hover:text-[var(--gem-gray-300)]'
                    } ${!isProSubscriber ? 'opacity-60' : ''}`}
                  >
                    {isPublic ? <Eye size={11} /> : <Lock size={11} />}
                    {isPublic ? 'Published' : 'Unpublished'}
                  </button>
                </div>
              </div>

              {/* Score toggle — disabled when unpublished (the master
                  toggle controls everything in that state). Pro-only;
                  for free writers we render a Pro pill in place of the
                  Visible/Hidden toggle and tap fires the upgrade modal. */}
              <PrivacyRow
                label="GEM Score"
                hint="Whether the score badge shows on your report cover."
                visible={isScoreVisible(privacy) && isPublic}
                disabled={!isPublic}
                isPro={isProSubscriber}
                onTap={() =>
                  gateOrAct(() =>
                    setPendingConfirm({
                      kind: 'score',
                      nextShown: !isScoreVisible(privacy),
                    })
                  )
                }
              />
              <div className="my-3 border-t border-[var(--gem-gray-800)]" />
              {/* Section toggles — same disabled treatment when unpublished. */}
              {SECTION_KEYS.map((k) => {
                const meta = SECTION_META[k]
                const vis = resolveVisibility(privacy, k)
                return (
                  <PrivacyRow
                    key={k}
                    label={meta.label}
                    hint={meta.hint}
                    visible={vis === 'public' && isPublic}
                    disabled={!isPublic}
                    isPro={isProSubscriber}
                    onTap={() =>
                      gateOrAct(() =>
                        setPendingConfirm({
                          kind: 'section',
                          key: k,
                          nextVis: vis === 'public' ? 'private' : 'public',
                        })
                      )
                    }
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}

      <PrivacyConfirmSheet
        open={pendingConfirm !== null}
        title={(() => {
          if (!pendingConfirm) return ''
          if (pendingConfirm.kind === 'visibility') {
            return pendingConfirm.nextPublic
              ? 'Publish to industry partners?'
              : 'Unpublish from industry partners?'
          }
          if (pendingConfirm.kind === 'score') {
            return pendingConfirm.nextShown
              ? 'Show your score to industry partners?'
              : 'Hide your score from industry partners?'
          }
          const label = SECTION_META[pendingConfirm.key]?.label ?? 'this section'
          return pendingConfirm.nextVis === 'private'
            ? `Hide "${label}"?`
            : `Show "${label}"?`
        })()}
        body={(() => {
          if (!pendingConfirm) return ''
          if (pendingConfirm.kind === 'visibility') {
            return pendingConfirm.nextPublic
              ? 'Your post will appear in industry partner feeds again, with all sections visible by default. You can narrow individual sections after.'
              : 'Your post will be hidden from every industry partner. You\u2019ll still see your full report. Republish anytime.'
          }
          if (pendingConfirm.kind === 'score') {
            return pendingConfirm.nextShown
              ? 'Industry partners will see your score on the report cover.'
              : 'Industry partners won\u2019t see your score. You\u2019ll still see it.'
          }
          return pendingConfirm.nextVis === 'private'
            ? 'Industry partners won\u2019t see this section. You can flip it back anytime.'
            : 'Industry partners will see this section. You can flip it back anytime.'
        })()}
        confirmLabel={(() => {
          if (!pendingConfirm) return 'Yes'
          if (pendingConfirm.kind === 'visibility') {
            return pendingConfirm.nextPublic ? 'Publish' : 'Unpublish'
          }
          if (pendingConfirm.kind === 'score') {
            return pendingConfirm.nextShown ? 'Show score' : 'Hide score'
          }
          return pendingConfirm.nextVis === 'private'
            ? 'Hide section'
            : 'Show section'
        })()}
        tone={(() => {
          if (!pendingConfirm) return 'primary'
          if (pendingConfirm.kind === 'visibility') {
            return pendingConfirm.nextPublic ? 'success' : 'primary'
          }
          if (pendingConfirm.kind === 'score') {
            return pendingConfirm.nextShown ? 'success' : 'primary'
          }
          return pendingConfirm.nextVis === 'private' ? 'primary' : 'success'
        })()}
        busy={busy}
        onConfirm={handleConfirm}
        onClose={() => setPendingConfirm(null)}
      />

      <UpgradePromptSheet
        open={proPromptOpen}
        onClose={() => setProPromptOpen(false)}
      />
    </>
  )
}

// Small contextual modal shown when a free writer taps a Pro-gated pill
// inside the privacy panel. One message, one button — kicks off the
// Stripe checkout the same way the full PaywallModal does. Anuj
// 2026-04-28.
function UpgradePromptSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubscribe() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout')
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  if (!open) return null
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-sm rounded-2xl shadow-xl p-5 sm:p-6"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <span
            className="inline-block px-1.5 py-[2px] rounded text-[9.5px] font-bold uppercase tracking-wider text-white"
            style={{ background: 'var(--gem-accent)' }}
          >
            Pro
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 w-7 h-7 rounded-full grid place-items-center hover:bg-[var(--gem-gray-800)] text-[var(--gem-gray-500)]"
          >
            <X size={14} />
          </button>
        </div>
        <h3 className="text-[16px] font-bold text-[var(--gem-gray-50)] m-0 leading-tight">
          Become a Member
        </h3>
        <p className="text-[13.5px] text-[var(--gem-gray-300)] m-0 mt-1.5 leading-snug">
          Hide specific sections and publish to industry partners — Pro only.
        </p>
        {error && (
          <p className="text-[12px] text-red-600 m-0 mt-3">{error}</p>
        )}
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={busy}
          className="w-full mt-4 py-2.5 rounded-lg font-semibold text-white text-[14px] disabled:opacity-60 transition-opacity hover:opacity-95"
          style={{ background: 'var(--gem-accent)' }}
        >
          {busy ? 'Redirecting…' : 'Upgrade — $20/mo'}
        </button>
      </div>
    </div>
  )
}

function PrivacyRow({
  label,
  hint,
  visible,
  disabled = false,
  isPro = true,
  onTap,
}: {
  label: string
  hint: string
  visible: boolean
  disabled?: boolean
  /** When false, the toggle is rendered greyed-out and tapping the row
   *  fires the upgrade modal via the parent's gateOrAct handler. We
   *  keep showing the actual Visible/Hidden control (rather than a
   *  separate Pro badge) so the writer can see exactly what they'd be
   *  unlocking. Anuj 2026-04-28. */
  isPro?: boolean
  onTap: () => void
}) {
  // For free writers we don't dim the row when the script is unpublished
  // (everyone's script is unpublished by default and the row would just
  // look broken). The Pro upsell card at the top of the panel carries
  // the gating message instead.
  const rowOpacity = !isPro ? 0.6 : disabled ? 0.5 : 1
  return (
    <div
      className="flex items-start gap-3 py-2.5"
      style={{ opacity: rowOpacity }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
          {label}
        </p>
        <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-0.5 leading-snug">
          {hint}
        </p>
      </div>
      <button
        type="button"
        onClick={onTap}
        disabled={isPro && disabled}
        title={
          !isPro
            ? 'Pro feature — tap to upgrade'
            : disabled
              ? 'Publish to industry partners first to control this'
              : undefined
        }
        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] uppercase tracking-[0.12em] font-bold transition-colors disabled:cursor-not-allowed ${
          visible
            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
            : 'text-[var(--gem-gray-500)] bg-white border border-[var(--gem-gray-700)] hover:text-[var(--gem-gray-300)]'
        }`}
      >
        {visible ? <Eye size={11} /> : <Lock size={11} />}
        {visible ? 'Visible' : 'Hidden'}
      </button>
    </div>
  )
}
