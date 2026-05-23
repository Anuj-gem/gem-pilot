'use client'

// PosterImage — renders the poster image on the report top card.
// Shows a placeholder with upload prompt for owners when no poster exists.
// Owners can click to upload a new poster image at any time.

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Loader2 } from 'lucide-react'

interface Props {
  submissionId: string
  posterUrl: string | null
  isOwner: boolean
}

export function PosterImage({ submissionId, posterUrl, isOwner }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localUrl, setLocalUrl] = useState<string | null>(posterUrl)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/scripts/${submissionId}/poster`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error ?? `Upload failed (${res.status})`)
      }

      const { url } = await res.json()
      setLocalUrl(url)
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const hasPoster = !!localUrl

  return (
    <div className="flex-shrink-0">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
          e.target.value = ''
        }}
      />

      <div
        className={`
          w-full sm:w-[200px] md:w-[240px] aspect-[2/3] rounded-lg overflow-hidden bg-black/40
          ${hasPoster ? 'shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5),0_4px_48px_0_rgba(124,77,237,0.10)]' : 'border border-white/10'}
          ${isOwner ? 'cursor-pointer group' : ''}
          relative
        `}
        onClick={isOwner ? () => fileRef.current?.click() : undefined}
        title={isOwner ? (hasPoster ? 'Click to change poster' : 'Click to add a poster image') : undefined}
      >
        {hasPoster ? (
          <>
            <img
              src={localUrl!}
              alt="Script poster"
              className="w-full h-full object-cover"
            />
            {/* Hover overlay for owner */}
            {isOwner && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white text-center">
                  <ImagePlus className="w-6 h-6 mx-auto mb-1" />
                  <span className="text-[12px] font-medium">Change</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center"
            style={{ background: 'linear-gradient(180deg, rgba(34,28,56,1) 0%, rgba(18,16,34,1) 100%)' }}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-white/40" />
            ) : (
              <>
                <ImagePlus className="w-8 h-8 mb-2 text-white/30" />
                {isOwner && (
                  <span className="text-[12px] text-white/40 font-medium">
                    Add poster
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* Upload spinner overlay */}
        {uploading && hasPoster && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white/60" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-[12px] text-red-500 mt-1.5 text-center">{error}</p>
      )}
    </div>
  )
}
