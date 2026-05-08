'use client'

// DashboardPendingScripts — client wrapper for the "Scripts pending review"
// section on the dashboard. Listens for new uploads and shows optimistic
// processing cards instantly, plus includes ProcessingPoller.

import { ScriptRowCard, type ScriptRowData } from '@/components/cards/script-row-card'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { useNewUploads } from '@/hooks/use-new-uploads'

export function DashboardPendingScripts({
  scripts,
  isProcessing,
}: {
  scripts: ScriptRowData[]
  isProcessing: boolean
}) {
  const optimistic = useNewUploads(scripts.map(s => s.id))
  const hasProcessing = isProcessing || optimistic.length > 0

  const allCards = [...optimistic, ...scripts]

  return (
    <>
      <ProcessingPoller active={hasProcessing} />

      {allCards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center">
          <p className="text-[13px] text-gray-500 m-0">
            No scripts pending review.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allCards.map((s) => (
            <ScriptRowCard key={s.id} script={s} />
          ))}
        </div>
      )}
    </>
  )
}
