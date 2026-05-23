'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface MediaItem {
  type: 'image' | 'youtube' | 'pdf'
  url: string
  thumbnail?: string
  label?: string
}

interface MediaGalleryProps {
  submissionId: string
  initialMedia: MediaItem[]
  isOwner: boolean
}

export default function MediaGallery({ submissionId, initialMedia, isOwner }: MediaGalleryProps) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia)
  const [uploading, setUploading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [newItemUrl, setNewItemUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clear the "new item" highlight after animation
  useEffect(() => {
    if (newItemUrl) {
      const t = setTimeout(() => setNewItemUrl(null), 800)
      return () => clearTimeout(t)
    }
  }, [newItemUrl])

  const uploadFile = useCallback(async (file: File) => {
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
      setNewItemUrl(data.item?.url)
      setMenuOpen(false)
      setShowYoutubeInput(false)
    } catch {
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }, [submissionId])

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
      setNewItemUrl(data.item?.url)
      setYoutubeUrl('')
      setShowYoutubeInput(false)
      setMenuOpen(false)
    } catch {
      alert('Failed to add video')
    } finally {
      setUploading(false)
    }
  }, [submissionId, youtubeUrl])

  const removeItem = useCallback(async (url: string) => {
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
      // silently fail
    }
  }, [submissionId])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }, [uploadFile])

  // Non-owner with no media — hide entirely
  if (!isOwner && media.length === 0) return null

  return (
    <div className="mt-6">
      {/* Inline CSS for animations */}
      <style>{`
        @keyframes mediaSlideIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes menuSlideRight {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .media-item-enter { animation: mediaSlideIn 0.3s ease-out; }
        .media-menu-enter { animation: menuSlideRight 0.2s ease-out; }
      `}</style>

      {/* Header row: title + inline add controls */}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0">
          Additional Media
        </p>

        {isOwner && (
          <>
            {/* Plus button — toggles the inline menu */}
            <button
              onClick={() => { setMenuOpen(!menuOpen); setShowYoutubeInput(false); setYoutubeUrl('') }}
              className="w-5 h-5 rounded-full flex items-center justify-center transition-all hover:bg-[rgba(255,255,255,0.12)]"
              style={{
                background: menuOpen ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)',
                border: menuOpen ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.12)',
                transform: menuOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                transition: 'all 0.2s ease',
              }}
              title={menuOpen ? 'Close' : 'Add media'}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={menuOpen ? 'rgba(139,92,246,0.8)' : 'rgba(255,255,255,0.5)'} strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Inline menu — slides out to the right */}
            {menuOpen && !showYoutubeInput && (
              <div className="flex items-center gap-1.5 media-menu-enter">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] transition-all hover:bg-[rgba(255,255,255,0.08)]"
                  style={{ color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {uploading ? (
                    <div className="w-3.5 h-3.5 border-[1.5px] border-purple-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )}
                  Photo / PDF
                </button>

                <button
                  onClick={() => setShowYoutubeInput(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] transition-all hover:bg-[rgba(255,255,255,0.08)]"
                  style={{ color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                  </svg>
                  YouTube
                </button>
              </div>
            )}

            {/* YouTube URL input — replaces the two buttons inline */}
            {menuOpen && showYoutubeInput && (
              <div className="flex items-center gap-2 flex-1 media-menu-enter">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="Paste YouTube URL"
                  className="flex-1 max-w-[280px] text-[12px] px-2.5 py-1.5 rounded-md bg-[rgba(0,0,0,0.3)] text-white placeholder-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.1)] outline-none focus:border-purple-500 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addYoutube()
                    if (e.key === 'Escape') { setShowYoutubeInput(false); setYoutubeUrl('') }
                  }}
                  autoFocus
                />
                <button
                  onClick={addYoutube}
                  disabled={uploading || !youtubeUrl.trim()}
                  className="text-[12px] px-2.5 py-1.5 rounded-md bg-purple-600 text-white disabled:opacity-40 transition-opacity"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowYoutubeInput(false); setYoutubeUrl('') }}
                  className="text-[11px] text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Media items carousel */}
      {media.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-2 px-2 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
          {media.map((item, i) => (
            <div
              key={item.url}
              className={`flex-shrink-0 snap-start rounded-xl overflow-hidden relative group ${item.url === newItemUrl ? 'media-item-enter' : ''}`}
              style={{
                width: 320,
                height: 180,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {item.type === 'youtube' ? (
                <iframe
                  src={item.url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={item.label || `Media ${i + 1}`}
                />
              ) : item.type === 'pdf' ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span className="text-[12px] text-[rgba(255,255,255,0.5)] text-center truncate max-w-full">
                    {item.label || 'PDF Document'}
                  </span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-purple-400 hover:text-purple-300 underline"
                  >
                    Open PDF
                  </a>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.label || `Media ${i + 1}`} className="w-full h-full object-cover" />
              )}

              {/* Delete button for owners */}
              {isOwner && (
                <button
                  onClick={() => removeItem(item.url)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.6)' }}
                  title="Remove"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
