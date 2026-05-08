'use client'

// useNewUploads — listens for `gem:script-uploaded` window events and
// returns optimistic processing ScriptRowData entries. These appear
// instantly after upload (before router.refresh() round-trips), then
// get cleared once the server data includes them.

import { useState, useEffect, useCallback } from 'react'
import type { ScriptRowData } from '@/components/cards/script-row-card'

interface UploadEvent {
  id: string
  title: string
  format: string | null
}

export function useNewUploads(serverScriptIds: string[]) {
  const [pending, setPending] = useState<UploadEvent[]>([])

  useEffect(() => {
    function onUpload(e: Event) {
      const detail = (e as CustomEvent<UploadEvent>).detail
      if (!detail?.id) return
      setPending(prev => {
        // Don't add duplicates
        if (prev.some(p => p.id === detail.id)) return prev
        return [detail, ...prev]
      })
    }
    window.addEventListener('gem:script-uploaded', onUpload)
    return () => window.removeEventListener('gem:script-uploaded', onUpload)
  }, [])

  // Clear optimistic entries that now appear in server data
  useEffect(() => {
    if (pending.length === 0) return
    const serverSet = new Set(serverScriptIds)
    setPending(prev => prev.filter(p => !serverSet.has(p.id)))
  }, [serverScriptIds, pending.length])

  // Convert to ScriptRowData for rendering
  const optimisticCards: ScriptRowData[] = pending.map(p => ({
    id: p.id,
    title: p.title,
    format: p.format,
    genre: null,
    score: null,
    evaluationId: null,
    createdAt: new Date().toISOString(),
    isProcessing: true,
  }))

  return optimisticCards
}
