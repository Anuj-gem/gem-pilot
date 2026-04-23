'use client'
// Shown the first time a writer toggles "Publish to Discover" — walks through
// the privacy defaults, lets them pick a preset (or keep Balanced), and shows
// a condensed preview of what visitors will see.
//
// Trigger: VisibilityToggle dispatches on first publish. Writer confirms →
// PATCH /api/scripts/:id/visibility sets is_public=true AND privacy is saved
// to whatever they picked.

import { useMemo, useState } from 'react'
import { Eye, Lock, X, Check } from 'lucide-react'
import {
  PRESETS,
  SECTION_KEYS,
  SECTION_META,
  defaultPrivacy,
  sectionIsPublic,
  type PresetKey,
  type ReportPrivacy,
} from '@/lib/report-privacy'

interface Props {
  submissionId: string
  title: string
  onDone: (params: { publishedAs: ReportPrivacy }) => void
  onCancel: () => void
}

export function PublishPreviewModal({
  submissionId,
  title,
  onDone,
  onCancel,
}: Props) {
  const [preset, setPreset] = useState<PresetKey>('balanced')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPrivacy = useMemo<ReportPrivacy>(() => {
    return { version: 1, sections: { ...PRESETS[preset].sections } }
  }, [preset])

  const publish = async () => {
    setSubmitting(true)
    setError(null)
    try {
      // Save the privacy choice first — so if visibility toggle fires without
      // the modal next time, we already have the writer's picked defaults.
      await fetch(`/api/scripts/${submissionId}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy: selectedPrivacy }),
      })
      // Then flip is_public.
      const res = await fetch(`/api/scripts/${submissionId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: true }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not publish.')
      }
      onDone({ publishedAs: selectedPrivacy })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish.')
    } finally {
      setSubmitting(false)
    }
  }

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
              Before you publish
            </p>
            <h2 className="text-[20px] sm:text-[22px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
              Choose what visitors see on {title || 'your report'}
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
            You&apos;re in the driver seat. Pick a starting point — you can always
            fine-tune individual sections after publishing. Private sections
            stay completely hidden from visitors (not blurred).
          </p>

          <div className="space-y-2 mb-6">
            {(Object.values(PRESETS) as typeof PRESETS[PresetKey][]).map((p) => {
              const isActive = preset === p.key
              const publicCount = SECTION_KEYS.filter((k) =>
                sectionIsPublic({ version: 1, sections: p.sections }, k)
              ).length
              return (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
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
                        {publicCount} of {SECTION_KEYS.length} sections public
                      </span>
                    </div>
                    <p className="text-[13px] text-[var(--gem-gray-400)] m-0 leading-snug">
                      {p.blurb}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Preview of what visitors will see */}
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

          {error && (
            <p className="text-[13px] text-red-600 m-0 mb-3">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--gem-gray-700)] flex items-center justify-end gap-2 bg-[var(--gem-gray-900)] rounded-b-2xl">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--gem-gray-400)]"
          >
            Cancel
          </button>
          <button
            onClick={publish}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--gem-accent)' }}
          >
            <Check size={14} />
            {submitting ? 'Publishing…' : 'Publish to Discover'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function defaultPublishPrivacy(): ReportPrivacy {
  return defaultPrivacy()
}
