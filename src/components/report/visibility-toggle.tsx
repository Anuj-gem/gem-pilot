'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { trackScriptPublished, trackUpgradePromptShown } from '@/lib/posthog'
import { PublishPreviewModal } from '@/components/report/publish-preview-modal'
import type { ReportPrivacy } from '@/lib/report-privacy'

interface VisibilityToggleProps {
  submissionId: string
  initialPublic: boolean
  title?: string
  score?: number
  isSubscribed?: boolean
}

export function VisibilityToggle({
  submissionId,
  initialPublic,
  title = '',
  score,
  isSubscribed = false,
}: VisibilityToggleProps) {
  const [isPublic, setIsPublic] = useState(initialPublic)
  const [loading, setLoading] = useState(false)
  const [justPublished, setJustPublished] = useState(false)
  // First-publish walkthrough — visitor preview + preset picker. Always shown
  // when going private → public, so the writer explicitly owns the choice
  // rather than default-publishing blind.
  const [showPreview, setShowPreview] = useState(false)

  const openUpgradeModal = () => {
    trackUpgradePromptShown('visibility_toggle')
    window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
  }

  const onToggleClick = async () => {
    if (isPublic) {
      // Unpublish — fast path, no modal.
      setLoading(true)
      try {
        const res = await fetch(`/api/scripts/${submissionId}/visibility`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_public: false }),
        })
        if (res.ok) setIsPublic(false)
      } finally {
        setLoading(false)
      }
      return
    }
    // Publishing — Pro gate first, then the preview modal owns the save.
    if (!isSubscribed) {
      openUpgradeModal()
      return
    }
    setShowPreview(true)
  }

  const handlePublished = (_params: { publishedAs: ReportPrivacy }) => {
    setShowPreview(false)
    setIsPublic(true)
    trackScriptPublished({ title, score, submissionId })
    setJustPublished(true)
    setTimeout(() => setJustPublished(false), 1500)
  }

  return (
    <>
      <button
        onClick={onToggleClick}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
          isPublic
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'border-[var(--gem-gray-600)] bg-[var(--gem-gray-800)] text-[var(--gem-gray-400)] hover:bg-[var(--gem-gray-700)]'
        } ${justPublished ? 'animate-pulse ring-2 ring-emerald-300' : ''} ${
          loading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
        {isPublic ? 'On Discover' : !isSubscribed ? 'Publish to Discover — Pro' : 'Publish to Discover'}
      </button>
      {showPreview && (
        <PublishPreviewModal
          submissionId={submissionId}
          title={title}
          onDone={handlePublished}
          onCancel={() => setShowPreview(false)}
        />
      )}
    </>
  )
}
