'use client'

// Inline editor for the elevator pitch (whats_special.headline) and
// detailed plot summary. In view mode, renders the pitch as bold text
// and the plot inside a collapsible. In edit mode, both become textareas.

import { useEditContextOptional } from './edit-context'
import { Collapsible } from './v5-components'

interface Props {
  fallbackPitch: string
  fallbackPlot: string
}

export function InlineElevatorPitch({ fallbackPitch, fallbackPlot }: Props) {
  const editCtx = useEditContextOptional()
  const isEditing = editCtx?.isEditing ?? false

  const displayPitch = isEditing
    ? editCtx!.elevatorPitch
    : editCtx?.elevatorPitch ?? fallbackPitch
  const displayPlot = isEditing
    ? editCtx!.plotSummary
    : editCtx?.plotSummary ?? fallbackPlot

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[12px] font-medium text-[var(--gem-gray-400)] mb-1.5 uppercase tracking-wider">
            Elevator Pitch
          </label>
          <textarea
            value={displayPitch}
            onChange={(e) => editCtx!.setElevatorPitch(e.target.value)}
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-[16px] sm:text-[18px] font-semibold text-white leading-[1.5] resize-y"
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderColor: 'rgba(255,255,255,0.15)',
            }}
            placeholder="A one-paragraph pitch for this script..."
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-[var(--gem-gray-400)] mb-1.5 uppercase tracking-wider">
            Detailed Plot Summary
          </label>
          <textarea
            value={displayPlot}
            onChange={(e) => editCtx!.setPlotSummary(e.target.value)}
            rows={6}
            className="w-full rounded-lg border px-3 py-2 text-[15px] sm:text-[16px] text-[var(--gem-gray-200)] leading-[1.6] resize-y"
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderColor: 'rgba(255,255,255,0.15)',
            }}
            placeholder="Full plot summary..."
          />
        </div>
      </div>
    )
  }

  // View mode — same rendering as before
  return (
    <>
      {displayPitch && (
        <p className="text-[18px] sm:text-[21px] text-[var(--gem-gray-50)] leading-[1.5] m-0 font-semibold">
          {displayPitch}
        </p>
      )}
      {displayPlot && (
        <div className="mt-6">
          <Collapsible title="Detailed Plot Summary" defaultOpen={false}>
            <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0">
              {displayPlot}
            </p>
          </Collapsible>
        </div>
      )}
    </>
  )
}
