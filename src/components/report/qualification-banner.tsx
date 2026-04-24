'use client'
// Qualification banner — the new primary signal at the top of the writer's
// report. Replaces the old score hero + "GEM Select" tier pills.
//
// Three states:
//   1. Qualifies (score ≥ 50) + NOT published → gold primary card, big
//      "Publish for Industry Visibility" CTA. The banner is non-dismissible
//      — it stays up until the writer actually publishes.
//   2. Does NOT qualify (score < 50) + NOT published → amber card nudging
//      them to read the development notes and submit a revision.
//   3. Published → compact success pill showing live state + active preset,
//      click to open the privacy modal (edit / unpublish).
//
// Why the threshold is 50: the vast majority of screenplays score ≥50 on the
// v5.2 rubric. Binary qualification removes the "I dropped 2 points and lost
// GEM Select" emotional moment that was generating angry emails.

import { useEffect, useState } from 'react'
import { Check, Eye, RefreshCw, ArrowRight } from 'lucide-react'
import { PublishPreviewModal } from '@/components/report/publish-preview-modal'
import { SubscribeGate } from '@/components/report/subscribe-gate'
import { matchPreset, PRESETS, type ReportPrivacy } from '@/lib/report-privacy'
import { trackScriptPublished } from '@/lib/posthog'

export { QUALIFICATION_THRESHOLD } from '@/lib/report-privacy'
import { QUALIFICATION_THRESHOLD as _THRESHOLD } from '@/lib/report-privacy'

interface Props {
  submissionId: string
  evaluationId: string
  title: string
  initialPublic: boolean
  initialPrivacy: ReportPrivacy | null
  initialContactEnabled: boolean
  /** Raw commercial score (0-100). Null/undefined means we couldn't compute
   *  — in that case we skip the banner entirely to avoid false verdicts. */
  commercialScore: number | null
  isSubscribed: boolean
  declaredFormat?: 'Feature film' | 'Series' | null
  /** When true, the publish/privacy modal opens automatically on mount.
   *  Set by the server page when ?privacy=1 is in the URL — used when a
   *  writer clicks the Private/On Discover pill from the dashboard to
   *  jump straight into the modal. */
  autoOpenModal?: boolean
}

export function QualificationBanner({
  submissionId,
  evaluationId,
  title,
  initialPublic,
  initialPrivacy,
  initialContactEnabled,
  commercialScore,
  isSubscribed,
  declaredFormat,
  autoOpenModal,
}: Props) {
  const [isPublic, setIsPublic] = useState(initialPublic)
  const [privacy, setPrivacy] = useState<ReportPrivacy | null>(initialPrivacy)
  const [showModal, setShowModal] = useState(!!autoOpenModal)
  const [justChanged, setJustChanged] = useState(false)

  // Section pills (elsewhere on the page) dispatch 'gem:open-publish-modal'
  // when a writer tries to toggle anything before publishing — the modal is
  // the single funnel for picking what's public + hitting the paywall.
  useEffect(() => {
    const handler = () => setShowModal(true)
    window.addEventListener('gem:open-publish-modal', handler)
    return () => window.removeEventListener('gem:open-publish-modal', handler)
  }, [])

  // Keep the banner in sync when ANY component on the page (modal, a pill,
  // etc.) dispatches a privacy/visibility change. Stops the "I published
  // and the banner still says I'm not on Discover" stale-state bug.
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ isPublic?: boolean; privacy?: ReportPrivacy }>
      const detail = ce.detail
      if (!detail) return
      if (typeof detail.isPublic === 'boolean') setIsPublic(detail.isPublic)
      if (detail.privacy) setPrivacy(detail.privacy)
    }
    window.addEventListener('gem:report-state-changed', handler)
    return () => window.removeEventListener('gem:report-state-changed', handler)
  }, [])

  // No score → don't gamble on a qualification verdict. Legacy evals or
  // incomplete scoring skip the banner.
  if (typeof commercialScore !== 'number' || Number.isNaN(commercialScore)) {
    return null
  }

  const qualifies = commercialScore >= _THRESHOLD

  const handleDone = (params: { isPublic: boolean; privacy: ReportPrivacy }) => {
    setShowModal(false)
    const goingPublic = params.isPublic && !isPublic
    setIsPublic(params.isPublic)
    setPrivacy(params.privacy)
    if (goingPublic) {
      try { trackScriptPublished({ title, submissionId }) } catch {}
    }
    setJustChanged(true)
    setTimeout(() => setJustChanged(false), 1500)
  }

  // ─── Published state: compact success pill ──────────────────────────
  if (isPublic) {
    const activePreset = matchPreset(privacy)
    const presetLabel = activePreset ? PRESETS[activePreset].label : 'Custom'
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`w-full flex items-center gap-3 text-left rounded-xl p-4 mb-6 transition-colors ${
            justChanged ? 'ring-2 ring-emerald-300' : ''
          }`}
          style={{
            background: 'rgba(5,150,105,0.06)',
            border: '1px solid rgba(5,150,105,0.28)',
          }}
        >
          <div
            className="flex-shrink-0 w-9 h-9 rounded-full grid place-items-center text-white"
            style={{ background: '#059669' }}
          >
            <Check size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[var(--gem-gray-50)] m-0">
              Visible to industry partners · {presetLabel}
            </p>
            <p className="text-[12px] text-[var(--gem-gray-500)] m-0 mt-0.5">
              Click to adjust what they see, or unpublish.
            </p>
          </div>
          <Eye size={14} className="flex-shrink-0 text-[var(--gem-gray-500)]" />
        </button>
        {showModal && (
          <PublishPreviewModal
            submissionId={submissionId}
            evaluationId={evaluationId}
            title={title}
            initialPrivacy={privacy}
            initialContactEnabled={initialContactEnabled}
            initialIsPublic={isPublic}
            isSubscribed={isSubscribed}
            onDone={handleDone}
            onCancel={() => setShowModal(false)}
          />
        )}
      </>
    )
  }

  // ─── Not qualified + unpublished: soft nudge to revise ─────────────
  if (!qualifies) {
    return (
      <div
        className="rounded-xl p-5 mb-6 flex items-start gap-4"
        style={{
          background: 'rgba(217,119,6,0.06)',
          border: '1px solid rgba(217,119,6,0.28)',
        }}
      >
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full grid place-items-center text-white"
          style={{ background: '#d97706' }}
        >
          <RefreshCw size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] sm:text-[16px] font-semibold text-[var(--gem-gray-50)] m-0 mb-1">
            Not ready for the Discover Portal yet
          </p>
          <p className="text-[13.5px] sm:text-[14px] text-[var(--gem-gray-200)] m-0 mb-3 leading-[1.55] max-w-[62ch]">
            The development notes below show what we&apos;d push on before industry partners see this. Take a pass, submit a revision, and we&apos;ll re-evaluate.
          </p>
          <ReviseButton
            isSubscribed={isSubscribed}
            declaredFormat={declaredFormat ?? null}
          />
        </div>
      </div>
    )
  }

  // ─── Qualified + unpublished: primary publish CTA ──────────────────
  // Two flavors via isSubscribed:
  //   FREE  → emerald banner pushing Pro upgrade ($20/mo, unlimited submissions),
  //           PLUS a sticky bottom bar that reappears once the top banner
  //           scrolls out of view. Two upgrade surfaces, same destination.
  //   PAID  → simpler emerald banner with just "Publish for Industry Visibility"
  //           (no Pro mention, no sticky bar — they don't need to upgrade).
  return (
    <>
      <QualifiedBanner
        isSubscribed={isSubscribed}
        onPublishClick={() => setShowModal(true)}
      />
      {!isSubscribed && (
        <StickyUpgradeBar
          onClick={() => setShowModal(true)}
          hidden={showModal}
        />
      )}
      {showModal && (
        <PublishPreviewModal
          submissionId={submissionId}
          evaluationId={evaluationId}
          title={title}
          initialPrivacy={privacy}
          initialContactEnabled={initialContactEnabled}
          initialIsPublic={isPublic}
          isSubscribed={isSubscribed}
          onDone={handleDone}
          onCancel={() => setShowModal(false)}
        />
      )}
      <SubscribeGateSink />
    </>
  )
}

// ─── Qualified banner (the top hero card) ──────────────────────────
// Emerald palette to match the published-state pill — "you're on the
// right path" continuity. Free vs Pro copy differs only in the CTA + a
// single value-prop line under it.
function QualifiedBanner({
  isSubscribed,
  onPublishClick,
}: {
  isSubscribed: boolean
  onPublishClick: () => void
}) {
  return (
    <div
      id="qualification-banner-anchor"
      className="rounded-xl p-5 sm:p-6 mb-6 flex items-start gap-4"
      style={{
        background: 'linear-gradient(135deg, rgba(5,150,105,0.10), rgba(5,150,105,0.02) 70%)',
        border: '1px solid rgba(5,150,105,0.35)',
      }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full grid place-items-center text-white"
        style={{ background: '#059669' }}
      >
        <Check size={16} strokeWidth={3} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[11px] uppercase tracking-[0.18em] font-bold m-0 mb-1.5"
          style={{ color: '#047857' }}
        >
          Qualifies for industry matching
        </p>
        <p className="text-[18px] sm:text-[20px] font-semibold text-[var(--gem-gray-50)] m-0 mb-2 leading-[1.3]">
          {isSubscribed
            ? 'Ready to put this in front of producers, agents, and dev execs.'
            : 'Get this in front of producers, agents, and dev execs.'}
        </p>
        <p className="text-[13.5px] sm:text-[14px] text-[var(--gem-gray-300)] m-0 mb-4 leading-[1.55] max-w-[60ch]">
          {isSubscribed
            ? 'You choose exactly what industry partners see.'
            : 'Pro unlocks publishing, the full report, and unlimited submissions.'}
        </p>
        <button
          onClick={onPublishClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.985]"
          style={{
            background: isSubscribed ? '#059669' : 'var(--gem-accent)',
            boxShadow: isSubscribed
              ? '0 6px 16px rgba(5,150,105,0.25)'
              : '0 6px 16px rgba(124,58,237,0.25)',
          }}
        >
          {isSubscribed ? 'Publish for Industry Visibility' : 'Go Pro · Publish · $20/mo'}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Sticky bottom upgrade bar ─────────────────────────────────────
// Shown only for free + qualified + unpublished writers, only AFTER they've
// scrolled the top banner out of view. Auto-hides when the publish modal is
// open or when the banner is back in viewport. Slim, dismissible-looking but
// not actually dismissible — staying-power matters for conversion.
function StickyUpgradeBar({ onClick, hidden }: { onClick: () => void; hidden: boolean }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const anchor = document.getElementById('qualification-banner-anchor')
    if (!anchor) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // Show sticky once the top banner has scrolled out of view.
          setShow(!e.isIntersecting)
        }
      },
      { threshold: 0, rootMargin: '0px 0px 0px 0px' }
    )
    obs.observe(anchor)
    return () => obs.disconnect()
  }, [])
  if (hidden || !show) return null
  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40"
      style={{
        background: 'rgba(15, 17, 23, 0.96)',
        borderTop: '1px solid rgba(5,150,105,0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <div
          className="hidden sm:grid flex-shrink-0 w-9 h-9 rounded-full place-items-center text-white"
          style={{ background: '#059669' }}
        >
          <Check size={15} strokeWidth={3} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] sm:text-[14px] font-semibold text-white m-0 leading-tight">
            Publish to industry + unlock the full report
          </p>
          <p className="text-[11.5px] sm:text-[12px] text-white/60 m-0 mt-0.5 leading-tight">
            $20/mo · unlimited submissions
          </p>
        </div>
        <button
          onClick={onClick}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.985]"
          style={{
            background: 'var(--gem-accent)',
            boxShadow: '0 6px 16px rgba(124,58,237,0.35)',
          }}
        >
          Go Pro
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

// The qualified banner's Publish button eventually routes a free writer to
// Stripe (via the modal's commit path). Include SubscribeGate so anything
// dispatched to gem:open-upgrade-modal still has a listener.
function SubscribeGateSink() { return null }
// Intentionally a no-op; SubscribeGate is mounted at the page level.
void SubscribeGate

// ─── Revise button — uses SubmitRevisionButton logic inline ─────────
function ReviseButton({
  isSubscribed,
  declaredFormat,
}: {
  isSubscribed: boolean
  declaredFormat: 'Feature film' | 'Series' | null
}) {
  const href = declaredFormat
    ? `/submit?format=${encodeURIComponent(declaredFormat)}`
    : '/submit'
  const handle = (e: React.MouseEvent) => {
    // Free writers hit the paywall through the submit flow's existing gating.
    // No special short-circuit here — they can start the flow, it's the eval
    // run itself that's Pro-gated.
    void isSubscribed
    void e
  }
  return (
    <a
      href={href}
      onClick={handle}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
      style={{ background: '#d97706' }}
    >
      <RefreshCw size={13} />
      Submit a revision
    </a>
  )
}
