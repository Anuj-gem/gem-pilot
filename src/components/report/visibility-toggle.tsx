'use client'
// Single-button entry point to the privacy modal for the writer's report.
// Previously this was a direct publish/unpublish toggle; now it always
// opens the modal, whether the report is published or not. The modal
// handles preset picking, per-section toggles, contact toggle, publishing,
// updating, and unpublishing — one surface, no scattered controls.
//
// Button label + style reflects current state:
//   - Unpublished        → "Publish to Discover" (accent button)
//   - Published          → "Privacy · {preset}" (green pill)
//   - Free writer        → "Publish to Discover" — modal still opens, but
//                          Publish inside the modal fires the upgrade gate.

import { useState } from 'react'
import { Eye, EyeOff, Shield } from 'lucide-react'
import { trackScriptPublished } from '@/lib/posthog'
import { PublishPreviewModal } from '@/components/report/publish-preview-modal'
import { matchPreset, PRESETS, type ReportPrivacy } from '@/lib/report-privacy'

interface VisibilityToggleProps {
  submissionId: string
  evaluationId?: string
  initialPublic: boolean
  initialPrivacy: ReportPrivacy | null
  initialContactEnabled: boolean
  title?: string
  score?: number
  isSubscribed?: boolean
}

export function VisibilityToggle({
  submissionId,
  evaluationId,
  initialPublic,
  initialPrivacy,
  initialContactEnabled,
  title = '',
  score,
  isSubscribed = false,
}: VisibilityToggleProps) {
  const [isPublic, setIsPublic] = useState(initialPublic)
  const [privacy, setPrivacy] = useState<ReportPrivacy | null>(initialPrivacy)
  const [justChanged, setJustChanged] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const activePreset = matchPreset(privacy) ?? 'teaser'
  const presetLabel = PRESETS[activePreset].label

  const handleDone = (params: { isPublic: boolean; privacy: ReportPrivacy }) => {
    setShowModal(false)
    const goingPublic = params.isPublic && !isPublic
    setIsPublic(params.isPublic)
    setPrivacy(params.privacy)
    if (goingPublic) {
      trackScriptPublished({ title, score, submissionId })
    }
    setJustChanged(true)
    setTimeout(() => setJustChanged(false), 1500)
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
          isPublic
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'border-[var(--gem-accent)] bg-[rgba(124,58,237,0.08)] text-[var(--gem-accent)] hover:bg-[rgba(124,58,237,0.14)]'
        } ${justChanged ? 'animate-pulse ring-2 ring-emerald-300' : ''}`}
      >
        {isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
        {isPublic
          ? `Live · ${presetLabel}`
          : isSubscribed
            ? 'Publish for Industry Visibility'
            : 'Publish for Industry Visibility — Pro'}
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
