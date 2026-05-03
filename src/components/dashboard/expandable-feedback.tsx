'use client'

import { useState } from 'react'
import Link from 'next/link'

const NEXT_STEPS_LABELS: Record<string, string> = {
  revise_resubmit: 'Revise & resubmit',
  new_concept: 'Send a different concept',
  in_touch: "We'll be in touch",
}

interface Props {
  opportunityTitle: string
  opportunitySlug: string
  scriptTitle: string
  evaluationId: string | null
  feedback: string | null
  nextSteps: string | null
  submittedAt: string
}

export function ExpandablePastFeedback(props: Props) {
  const [open, setOpen] = useState(false)
  const daysAgo = Math.floor((Date.now() - new Date(props.submittedAt).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="text-[13px] font-medium text-gray-500 truncate">{props.scriptTitle}</span>
          <span className="text-[10.5px] text-gray-300">&middot;</span>
          <span className="text-[11px] text-gray-400 truncate">{props.opportunityTitle}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {props.nextSteps && (
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {NEXT_STEPS_LABELS[props.nextSteps] ?? props.nextSteps}
            </span>
          )}
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            className={`text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {open && (
        <div className="mt-2.5 pt-2.5 border-t border-gray-100">
          {props.feedback && (
            <p className="text-[12.5px] text-gray-500 leading-[1.6] m-0 whitespace-pre-line">{props.feedback}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {props.evaluationId && (
              <Link
                href={`/report/${props.evaluationId}`}
                className="text-[11px] font-medium text-gray-400 hover:text-purple-600 transition-colors"
              >
                View report &rarr;
              </Link>
            )}
            <span className="text-[10.5px] text-gray-300">
              {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
