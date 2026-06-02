'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface MediaItem {
  type: 'image' | 'youtube' | 'pdf'
  url: string
  thumbnail?: string
  label?: string
}

interface HeroMediaCarouselProps {
  submissionId: string
  posterUrl: string | null
  initialMedia: MediaItem[]
  isOwner: boolean
}

export default function HeroMediaCarousel({
  submissionId,
  posterUrl,
  initialMedia,
  isOwner,
}: HeroMediaCarouselProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [media, setMedia] = useState<MediaItem[]>(() => {
    // Unify: poster becomes the first media item
    const items: MediaItem[] = []
    if (posterUrl) items.push({ type: 'image', url: posterUrl, label: 'Main Photo' })
    for (const m of initialMedia) {
      if (m.type !== 'pdf') items.push(m)
    }
    return items
  })
  const [uploading, setUploading] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Build display slides from unified media list
  const slides = media.map((item, i) => {
    if (item.type === 'youtube') {
      const videoId = extractYoutubeId(item.url)
      return {
        type: 'youtube' as const,
        url: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : item.url,
        embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : item.url,
        label: item.label || `Video ${i + 1}`,
      }
    }
    return {
      type: 'image' as const,
      url: item.url,
      embedUrl: undefined,
      label: item.label || (i === 0 ? 'Main Photo' : `Photo ${i + 1}`),
    }
  })

  // Clamp index
  useEffect(() => {
    if (currentIndex >= slides.length && slides.length > 0) {
      setCurrentIndex(slides.length - 1)
    }
  }, [slides.length, currentIndex])

  const goTo = useCallback((idx: number) => setCurrentIndex(Math.max(0, Math.min(idx, slides.length - 1))), [slides.length])
  const goPrev = useCallback(() => setCurrentIndex(i => i > 0 ? i - 1 : i), [])
  const goNext = useCallback(() => setCurrentIndex(i => i < slides.length - 1 ? i + 1 : i), [slides.length])

  // Upload — all media goes through the same /api/scripts/[id]/media endpoint
  const uploadFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/scripts/${submissionId}/media`, { method: 'POST', body: formData })
      if (!res.ok) { const err = await res.json(); alert(err.error || 'Upload failed'); return }
      const data = await res.json()
      rebuildMedia(data.media_urls)
      setShowAddMenu(false)
    } catch { alert('Upload failed') } finally { setUploading(false) }
  }, [submissionId])

  const addYoutube = useCallback(async () => {
    if (!youtubeUrl.trim()) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('youtube_url', youtubeUrl.trim())
      const res = await fetch(`/api/scripts/${submissionId}/media`, { method: 'POST', body: formData })
      if (!res.ok) { const err = await res.json(); alert(err.error || 'Failed'); return }
      const data = await res.json()
      rebuildMedia(data.media_urls)
      setYoutubeUrl(''); setShowYoutubeInput(false); setShowAddMenu(false)
    } catch { alert('Failed') } finally { setUploading(false) }
  }, [submissionId, youtubeUrl])

  // Delete any media item (including the first/poster)
  const deleteSlide = useCallback(async (idx: number) => {
    const item = media[idx]
    if (!item) return

    const isPosterItem = item.url === posterUrl

    if (isPosterItem) {
      // Clear poster_url in DB
      try {
        await fetch(`/api/scripts/${submissionId}/poster`, { method: 'DELETE' })
      } catch { /* silent */ }
      // Remove from local state
      setMedia(prev => prev.filter((_, i) => i !== idx))
      router.refresh()
    } else {
      // Remove from media_urls via API
      try {
        const res = await fetch(`/api/scripts/${submissionId}/media`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.url }),
        })
        if (res.ok) {
          const data = await res.json()
          // Rebuild: keep poster if it still exists, then API media
          const items: MediaItem[] = []
          if (posterUrl) {
            const stillHasPoster = media.some(m => m.url === posterUrl)
            if (stillHasPoster) items.push({ type: 'image', url: posterUrl, label: 'Main Photo' })
          }
          for (const m of (data.media_urls as MediaItem[])) {
            if (m.type !== 'pdf') items.push(m)
          }
          setMedia(items)
        }
      } catch { /* silent */ }
    }
  }, [media, posterUrl, submissionId, router])

  // Rebuild the unified media list from API response + poster
  function rebuildMedia(apiMedia: MediaItem[]) {
    const items: MediaItem[] = []
    // Keep poster as first if it still exists and isn't in apiMedia
    if (posterUrl) {
      const posterInMedia = apiMedia.some(m => m.url === posterUrl)
      if (!posterInMedia) items.push({ type: 'image', url: posterUrl, label: 'Main Photo' })
    }
    for (const m of apiMedia) {
      if (m.type !== 'pdf') items.push(m)
    }
    setMedia(items)
    // Navigate to newest
    setCurrentIndex(Math.max(0, items.length - 1))
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }, [uploadFile])

  // Empty state for owner
  if (slides.length === 0 && isOwner) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: '#151222' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-3 cursor-pointer border-0 bg-transparent"
        >
          {uploading ? (
            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Add a photo or video</span>
            </>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
      </div>
    )
  }

  if (slides.length === 0 && !isOwner) return null

  return (
    <div className="w-full h-full">
      <div className="relative w-full h-full overflow-hidden" style={{ background: '#151222' }}>
        {/* Slides */}
        <div
          className="flex h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)`, transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          {slides.map((slide, i) => (
            <div key={slide.url + i} className="w-full h-full flex-shrink-0 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slide.url} alt={slide.label} className="w-full h-full object-cover" />
              {slide.type === 'youtube' && (
                <button
                  onClick={() => setLightboxUrl(slide.embedUrl || slide.url)}
                  className="absolute inset-0 flex items-center justify-center z-[5] border-0 bg-transparent cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="8,5 20,12 8,19" /></svg>
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.5)] z-20">
            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Owner: Delete button — top-right, always visible */}
        {isOwner && slides.length > 0 && (
          <button
            onClick={() => deleteSlide(currentIndex)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10 border-0 cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            title="Remove"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* Owner: Add media button — top-left, always visible */}
        {isOwner && !showAddMenu && !showYoutubeInput && (
          <button
            onClick={() => setShowAddMenu(true)}
            className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium z-10 border-0 cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add media
          </button>
        )}

        {/* Owner: Add menu */}
        {isOwner && showAddMenu && !showYoutubeInput && (
          <div className="absolute top-4 left-4 flex items-center gap-2 z-10 rounded-lg p-1.5" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors border-0 cursor-pointer bg-transparent">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              Photo
            </button>
            <button onClick={() => setShowYoutubeInput(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors border-0 cursor-pointer bg-transparent">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>
              YouTube
            </button>
            <button onClick={() => setShowAddMenu(false)} className="text-[rgba(255,255,255,0.4)] hover:text-white ml-1 transition-colors border-0 cursor-pointer bg-transparent">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        )}

        {/* Owner: YouTube input */}
        {isOwner && showYoutubeInput && (
          <div className="absolute top-4 left-4 flex items-center gap-2 z-10 rounded-lg p-1.5" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <input type="text" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="Paste YouTube URL"
              className="w-[200px] text-[12px] px-2.5 py-1.5 rounded-md bg-[rgba(255,255,255,0.06)] text-white placeholder-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.12)] outline-none focus:border-purple-500"
              onKeyDown={e => { if (e.key === 'Enter') addYoutube(); if (e.key === 'Escape') { setShowYoutubeInput(false); setYoutubeUrl(''); setShowAddMenu(false) } }}
              autoFocus
            />
            <button onClick={addYoutube} disabled={uploading || !youtubeUrl.trim()} className="text-[12px] px-3 py-1.5 rounded-md bg-purple-600 text-white disabled:opacity-40 border-0 cursor-pointer">Add</button>
            <button onClick={() => { setShowYoutubeInput(false); setYoutubeUrl(''); setShowAddMenu(false) }} className="text-[rgba(255,255,255,0.4)] hover:text-white border-0 cursor-pointer bg-transparent">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        )}

        {/* Navigation — bottom-right, persistent when multiple slides */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
            {/* Dot indicators */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
              {slides.map((_, i) => (
                <button key={i} onClick={() => goTo(i)} className="w-2 h-2 rounded-full transition-all border-0 p-0 cursor-pointer"
                  style={{ background: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.35)', transform: i === currentIndex ? 'scale(1.3)' : 'scale(1)' }}
                />
              ))}
            </div>
            {/* Prev/Next */}
            <button onClick={goPrev} disabled={currentIndex === 0}
              className="w-8 h-8 rounded-full flex items-center justify-center border-0 cursor-pointer disabled:opacity-30 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button onClick={goNext} disabled={currentIndex === slides.length - 1}
              className="w-8 h-8 rounded-full flex items-center justify-center border-0 cursor-pointer disabled:opacity-30 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {/* Video lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center border-0 cursor-pointer z-10" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <div className="w-full max-w-4xl" style={{ aspectRatio: '16/9' }} onClick={e => e.stopPropagation()}>
            <iframe src={lightboxUrl + (lightboxUrl.includes('?') ? '&' : '?') + 'autoplay=1'} className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video player" />
          </div>
        </div>
      )}
    </div>
  )
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/embed\/)([^?&/]+)/,
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?&/]+)/,
    /(?:youtube\.com\/v\/)([^?&/]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}
