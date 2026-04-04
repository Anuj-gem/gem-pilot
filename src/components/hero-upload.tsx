'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, ArrowRight, LogIn } from 'lucide-react'
import { setPendingFile } from '@/lib/pending-file'
import { trackHeroUpload } from '@/lib/posthog'
import { createClient } from '@/lib/supabase-browser'

export function HeroUpload() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })
  }, [])

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') return
    setFile(f)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) handleFile(dropped)
  }

  const handleGo = () => {
    if (!file) return
    trackHeroUpload()
    setPendingFile(file)
    router.push('/submit?from=hero')
  }

  // Not yet checked auth
  if (isLoggedIn === null) {
    return (
      <div className="mt-8 sm:mt-10 max-w-lg">
        <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl border-2 border-dashed border-[var(--gem-gray-600)] opacity-50">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center shrink-0">
            <Upload size={16} className="text-[var(--gem-gray-400)] sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--gem-white)]">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Not logged in — prompt to sign up
  if (!isLoggedIn) {
    return (
      <div className="mt-8 sm:mt-10 max-w-lg">
        <button
          onClick={() => router.push('/signup')}
          className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl border-2 border-dashed border-[var(--gem-gray-600)] hover:border-[var(--gem-accent)] cursor-pointer transition-colors group active:border-[var(--gem-accent)] active:bg-[var(--gem-accent)]/5 w-full text-left"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center shrink-0 group-hover:border-[var(--gem-accent)]/40 transition-colors">
            <LogIn size={16} className="text-[var(--gem-gray-400)] group-hover:text-[var(--gem-accent)] transition-colors sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--gem-white)]">Create a free account to upload</p>
            <p className="text-xs text-[var(--gem-gray-500)]">Score + tier are free. Full report requires subscription.</p>
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="mt-8 sm:mt-10 max-w-lg">
      {!file ? (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl border-2 border-dashed border-[var(--gem-gray-600)] hover:border-[var(--gem-accent)] cursor-pointer transition-colors group active:border-[var(--gem-accent)] active:bg-[var(--gem-accent)]/5"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center shrink-0 group-hover:border-[var(--gem-accent)]/40 transition-colors">
            <Upload size={16} className="text-[var(--gem-gray-400)] group-hover:text-[var(--gem-accent)] transition-colors sm:w-[18px] sm:h-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--gem-white)]">Drop your screenplay here</p>
            <p className="text-xs text-[var(--gem-gray-500)]">PDF, up to 10MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-3 flex-1 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-[var(--gem-accent)] bg-[var(--gem-accent)]/5">
            <FileText size={16} className="text-[var(--gem-accent)] shrink-0 sm:w-[18px] sm:h-[18px]" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--gem-white)] truncate">{file.name}</p>
              <p className="text-xs text-[var(--gem-gray-400)]">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          </div>
          <button
            onClick={handleGo}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] active:bg-[var(--gem-accent-hover)] transition-colors shrink-0"
          >
            Evaluate
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
