import { ImageResponse } from 'next/og'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'edge'
export const alt = 'GEM — Opportunity'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CREAM = '#FAF7F0'
const PURPLE = '#7C3AED'
const GOLD = '#C9A55A'
const DARK = '#1A1A1A'

const FORMAT_LABELS: Record<string, string> = {
  feature: 'Feature Film',
  pilot: 'TV Pilot',
  series: 'Series',
  short: 'Short Film',
  limited: 'Limited Series',
}

const GENRE_LABELS: Record<string, string> = {
  thriller: 'Thriller', crime: 'Crime', horror: 'Horror', drama: 'Drama',
  comedy: 'Comedy', 'sci-fi': 'Sci-Fi', fantasy: 'Fantasy', romance: 'Romance',
  action: 'Action', family: 'Family', western: 'Western', musical: 'Musical',
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )

  const { data: opp } = await supabase
    .from('opportunities')
    .select('title, description, format, genres')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  // Fallback if not found
  const title = opp?.title || 'Opportunity'
  const description = opp?.description?.slice(0, 120) || ''
  const format = opp?.format ? FORMAT_LABELS[opp.format] || opp.format : null
  const genres: string[] = opp?.genres || []
  const genreStr = genres
    .slice(0, 3)
    .map((g: string) => GENRE_LABELS[g] || g)
    .join(' · ')
  const subtitle = [format, genreStr].filter(Boolean).join(' — ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: CREAM,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: DARK,
          padding: '60px 80px',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 4,
            color: PURPLE,
            marginBottom: 20,
          }}
        >
          GEM
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2.5,
            color: GOLD,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Opportunity
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Georgia, serif',
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1,
            marginBottom: 16,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              fontWeight: 600,
              color: PURPLE,
              marginBottom: 16,
            }}
          >
            {subtitle}
          </div>
        )}
        {description && (
          <div
            style={{
              display: 'flex',
              fontSize: 20,
              lineHeight: 1.5,
              color: '#555',
              maxWidth: 900,
            }}
          >
            {description}{description.length >= 120 ? '…' : ''}
          </div>
        )}
      </div>
    ),
    { ...size }
  )
}
