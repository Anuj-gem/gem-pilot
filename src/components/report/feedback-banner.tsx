// FeedbackBanner — top-of-report summary for writers who received feedback.
// Shows the closing comment ("What they're looking for next") and annotation count.

interface FeedbackBannerProps {
  opportunityTitle: string
  closingComment: string
  annotationCount: number
}

export function FeedbackBanner({ opportunityTitle, closingComment, annotationCount }: FeedbackBannerProps) {
  return (
    <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-2">
        <span
          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: '#534AB7' }}
        />
        <p className="text-[13px] font-semibold text-purple-900 m-0">
          Feedback from {opportunityTitle}
        </p>
        {annotationCount > 0 && (
          <span className="text-[12px] text-purple-400">
            &middot; {annotationCount} annotation{annotationCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="px-5 py-3 border-t border-purple-200 bg-white">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.06em] m-0 mb-1.5">
          What they&apos;re looking for next
        </p>
        <p className="text-[14px] text-gray-800 leading-[1.55] m-0">
          {closingComment}
        </p>
      </div>
    </div>
  )
}
