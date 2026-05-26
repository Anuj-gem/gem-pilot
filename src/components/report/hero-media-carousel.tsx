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
  const [poster, setPoster] = useState<string | null>(posterUrl)
  const [media, setMedia] = useState<MediaItem[]>(initialMedia)
  const [uploading, setUploading] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [hovered, setHovered] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const posterInputRef = useRef<HTMLInputElement>(null)

  // Build slides array: poster first (if exists), then filtered media
  const slides = buildSlides(poster, media)

  // Clamp index when slides change
  useEffect(() => {
    if (currentIndex >= slides.length && slides.length > 0) {
      setCurrentIndex(slides.length - 1)
    }
  }, [slides.length, currentIndex])

  // --- Handlers ---

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, slides.length - 1)))
  }, [slides.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : i))
  }, [])

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i < slides.length - 1 ? i + 1 : i))
  }, [slides.length])

  const uploadPoster = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5MB')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/scripts/${submissionId}/poster`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Poster upload failed')
        return
      }
      const data = await res.json()
      setPoster(data.url)
      setCurrentIndex(0)
      router.refresh()
    } catch {
      alert('Poster upload failed')
    } finally {
      setUploading(false)
    }
  }, [submissionId, router])

  const uploadMedia = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5MB')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/scripts/${submissionId}/media`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Upload failed')
        return
      }
      const data = await res.json()
      setMedia(data.media_urls)
      // Navigate to the new slide
      const newSlides = buildSlides(poster, data.media_urls)
      setCurrentIndex(newSlides.length - 1)
      setShowAddMenu(false)
    } catch {
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }, [submissionId, poster])

  const addYoutube = useCallback(async () => {
    if (!youtubeUrl.trim()) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('youtube_url', youtubeUrl.trim())
      const res = await fetch(`/api/scripts/${submissionId}/media`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to add video')
        return
      }
      const data = await res.json()
      setMedia(data.media_urls)
      const newSlides = buildSlides(poster, data.media_urls)
      setCurrentIndex(newSlides.length - 1)
      setYoutubeUrl('')
      setShowYoutubeInput(false)
      setShowAddMenu(false)
    } catch {
      alert('Failed to add video')
    } finally {
      setUploading(false)
    }
  }, [submissionId, youtubeUrl, poster])

  const deleteMedia = useCallback(async (url: string) => {
    try {
      const res = await fetch(`/api/scripts/${submissionId}/media`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) return
      const data = await res.json()
      setMedia(data.media_urls)
    } catch {
      // silent
    }
  }, [submissionId])

  const handleDelete = useCallback((slideIndex: number) => {
    const slide = slides[slideIndex]
    if (!slide) return

    if (slide.isPoster) {
      // For poster deletion, we'd need a separate endpoint — for now just prompt to replace
      posterInputRef.current?.click()
    } else {
      deleteMedia(slide.url)
    }
  }, [slides, deleteMedia])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadMedia(file)
    e.target.value = ''
  }, [uploadMedia])

  const handlePosterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadPoster(file)
    e.target.value = ''
  }, [uploadPoster])

  // Non-owner with nothing to show
  if (!isOwner && slides.length === 0) return null

  // Owner empty state
  if (isOwner && slides.length === 0) {
    return (
      <div className="w-full">
        <button
          onClick={() => posterInputRef.current?.click()}
          className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:bg-[rgba(255,255,255,0.04)] cursor-pointer"
          style={{
            aspectRatio: '16/9',
            background: 'rgba(255,255,255,0.02)',
            border: '2px dashed rgba(255,255,255,0.12)',
          }}
        >
          {uploading ? (
            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-sm text-[rgba(255,255,255,0.35)]">Add a photo</span>
            </>
          )}
        </button>
        <input
          ref={posterInputRef}
          type="file"
          accept="image/*"
          onChange={handlePosterChange}
          className="hidden"
        />
      </div>
    )
  }

  return (
    <div
      className="w-full relative rounded-2xl overflow-hidden"
      style={{ aspectRatio: '16/9', background: '#1d1932' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Slides container */}
      <div
        className="flex h-full"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: 'transform 0.3s ease',
        }}
      >
        {slides.map((slide, i) => (
          <div key={slide.url + i} className="w-full h-full flex-shrink-0 relative">
            {slide.type === 'youtube' ? (
              <iframe
                src={slide.url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={slide.label || `Slide ${i + 1}`}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.url}
                alt={slide.label || (slide.isPoster ? 'Main Photo' : `Slide ${i + 1}`)}
                className="w-full h-full object-cover"
              />
            )}

            {/* Slide label */}
            <div className="absolute bottom-10 left-4 pointer-events-none">
              <span className="text-[11px] uppercase tracking-wider font-medium px-2 py-0.5 rounded bg-[rgba(0,0,0,0.5)] text-[rgba(255,255,255,0.7)]">
                {slide.isPoster ? 'Main Photo' : `${i + 1} / ${slides.length}`}
              </span>
            </div>

            {/* Delete button (owner, on hover) */}
            {isOwner && hovered && (
              <button
                onClick={() => handleDelete(i)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-opacity bg-[rgba(0,0,0,0.6)] hover:bg-[rgba(0,0,0,0.8)]"
                title={slide.isPoster ? 'Replace poster' : 'Remove'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Left arrow */}
      {slides.length > 1 && currentIndex > 0 && hovered && (
        <button
          onClick={goPrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity bg-[rgba(0,0,0,0.5)] hover:bg-[rgba(0,0,0,0.7)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Right arrow */}
      {slides.length > 1 && currentIndex < slides.length - 1 && hovered && (
        <button
          onClick={goNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity bg-[rgba(0,0,0,0.5)] hover:bg-[rgba(0,0,0,0.7)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i === currentIndex ? 'rgba(139,92,246,1)' : 'rgba(255,255,255,0.4)',
                transform: i === currentIndex ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      )}

      {/* Owner: Add button (bottom-right) */}
      {isOwner && hovered && (
        <div className="absolute bottom-3 right-3">
          {!showAddMenu && !showYoutubeInput && (
            <button
              onClick={() => setShowAddMenu(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-purple-600 hover:bg-purple-500 transition-colors shadow-lg"
              title="Add media"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}

          {showAddMenu && !showYoutubeInput && (
            <div className="flex items-center gap-2 bg-[rgba(0,0,0,0.8)] rounded-lg p-2 shadow-lg">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Photo
              </button>
              <button
                onClick={() => setShowYoutubeInput(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                </svg>
                YouTube
              </button>
              <button
                onClick={() => setShowAddMenu(false)}
                className="text-[rgba(255,255,255,0.5)] hover:text-white ml-1 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {showYoutubeInput && (
            <div className="flex items-center gap-2 bg-[rgba(0,0,0,0.8)] rounded-lg p-2 shadow-lg">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste YouTube URL"
                className="w-[220px] text-[12px] px-2.5 py-1.5 rounded-md bg-[rgba(255,255,255,0.1)] text-white placeholder-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.15)] outline-none focus:border-purple-500 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addYoutube()
                  if (e.key === 'Escape') { setShowYoutubeInput(false); setYoutubeUrl(''); setShowAddMenu(false) }
                }}
                autoFocus
              />
              <button
                onClick={addYoutube}
                disabled={uploading || !youtubeUrl.trim()}
                className="text-[12px] px-3 py-1.5 rounded-md bg-purple-600 text-white disabled:opacity-40 transition-opacity"
              >
                Add
              </button>
              <button
                onClick={() => { setShowYoutubeInput(false); setYoutubeUrl(''); setShowAddMenu(false) }}
                className="text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={posterInputRef}
        type="file"
        accept="image/*"
        onChange={handlePosterChange}
        className="hidden"
      />
    </div>
  )
}

// --- Helpers ---

interface Slide {
  type: 'image' | 'youtube'
  url: string
  label?: string
  isPoster: boolean
}

function buildSlides(poster: string | null, media: MediaItem[]): Slide[] {
  const slides: Slide[] = []

  if (poster) {
    slides.push({ type: 'image', url: poster, label: 'Main Photo', isPoster: true })
  }

  for (const item of media) {
    // Skip PDFs — carousel is images + youtube only
    if (item.type === 'pdf') continue
    slides.push({ type: item.type, url: item.url, label: item.label, isPoster: false })
  }

  return slides
}
