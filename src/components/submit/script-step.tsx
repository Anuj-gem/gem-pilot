// Step 2 of the guided submit flow.
//
// Drag-and-drop OR file picker, with a quiet "save my draft" escape hatch
// underneath. Validates type + size client-side so the user gets immediate
// feedback (server still revalidates).
'use client'

import { useRef, useState } from 'react'
import { Upload, AlertCircle } from 'lucide-react'

const MAX_BYTES = 10 * 1024 * 1024

export function ScriptStep({
  onFileChosen,
  onSkip,
  initialFileName,
}: {
  onFileChosen: (file: File) => void
  onSkip: () => void
  initialFileName?: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(initialFileName ?? null)

  function validateAndAccept(file: File) {
    setError(null)
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF — Final Draft, Highland, WriterSolo all export to PDF.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('That file is over 10MB. Try re-exporting from your screenwriting app.')
      return
    }
    setFileName(file.name)
    onFileChosen(file)
  }

  return (
    <div className="max-w-[520px] mx-auto pb-12">
      <h2 className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-[1.15] text-[var(--gem-gray-50)] m-0 mb-2">
        Drop in your script.
      </h2>
      <p className="text-[14px] sm:text-[15px] text-[var(--gem-gray-300)] leading-[1.5] m-0 mb-5">
        We&apos;ll pull the title, genre, and tone straight from the page.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const dropped = e.dataTransfer.files?.[0]
          if (dropped) validateAndAccept(dropped)
        }}
        className="block rounded-2xl px-6 py-10 sm:py-14 text-center cursor-pointer transition-all duration-150 hover:border-[var(--gem-accent)] hover:bg-[rgba(124,58,237,0.03)] active:scale-[0.995]"
        style={{
          border: dragOver
            ? '2px dashed var(--gem-accent)'
            : '2px dashed var(--gem-gray-600)',
          background: dragOver ? 'rgba(124,58,237,0.04)' : 'var(--gem-gray-900)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) validateAndAccept(f)
          }}
        />
        <div
          className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-3.5"
          style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--gem-accent)' }}
        >
          <Upload size={22} />
        </div>
        {fileName ? (
          <>
            <p className="text-[15px] sm:text-[16px] font-semibold text-[var(--gem-gray-50)] m-0">
              {fileName}
            </p>
            <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-1.5">
              Tap to choose a different file
            </p>
          </>
        ) : (
          <>
            <p className="text-[15px] sm:text-[16px] font-semibold text-[var(--gem-gray-50)] m-0">
              Drag your PDF here, or{' '}
              <span style={{ color: 'var(--gem-accent)' }}>choose a file</span>
            </p>
            <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-1.5">
              Final Draft, WriterSolo, Highland — any digital export · 10MB max
            </p>
          </>
        )}
      </label>

      {error && (
        <div
          className="mt-3 rounded-lg px-3 py-2 flex items-start gap-2 text-[13px]"
          style={{
            background: 'rgba(220,38,38,0.06)',
            border: '1px solid rgba(220,38,38,0.25)',
            color: '#b91c1c',
          }}
        >
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="text-center text-[12px] text-[var(--gem-gray-500)] my-5">— or —</div>
      <div className="text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-[14px] text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] underline underline-offset-4 decoration-[var(--gem-gray-600)] hover:decoration-[var(--gem-gray-400)] transition-all duration-150 active:scale-[0.985]"
        >
          I don&apos;t have it on me — save my draft
        </button>
      </div>
      <p className="text-center text-[12px] text-[var(--gem-gray-500)] mt-2 m-0">
        We&apos;ll hold your spot. Upload anytime to score.
      </p>
    </div>
  )
}
