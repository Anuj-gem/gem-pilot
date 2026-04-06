import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

type Params = { id: string }

async function getReportMeta(id: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('script_evaluations')
      .select('weighted_score, tier, script_submissions(title)')
      .eq('id', id)
      .single()

    if (!data) return null
    const sub = Array.isArray((data as any).script_submissions)
      ? (data as any).script_submissions[0]
      : (data as any).script_submissions
    return {
      title: (sub?.title as string) ?? 'Screenplay',
      score:
        typeof (data as any).weighted_score === 'number'
          ? Math.round((data as any).weighted_score)
          : null,
      tier: ((data as any).tier as string) ?? null,
    }
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { id } = await params
  const meta = await getReportMeta(id)

  const fallbackTitle = 'Script Evaluation'
  const fallbackDescription =
    'See how this screenplay scored on GEM — AI-powered screenplay evaluation.'

  if (!meta) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: `${fallbackTitle} — GEM`,
        description: fallbackDescription,
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${fallbackTitle} — GEM`,
        description: fallbackDescription,
      },
    }
  }

  const scoreStr = meta.score !== null ? `${meta.score}/100` : ''
  const tierStr = meta.tier ?? ''
  const headline = scoreStr
    ? `${meta.title} — ${scoreStr}${tierStr ? ` (${tierStr})` : ''}`
    : meta.title

  const description = scoreStr
    ? `${meta.title} scored ${scoreStr}${tierStr ? ` — ${tierStr}` : ''} on GEM's AI screenplay evaluation. See how your script compares.`
    : `${meta.title} on GEM — AI-powered screenplay evaluation. See how your script compares.`

  return {
    title: headline,
    description,
    openGraph: {
      title: headline,
      description,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: headline,
      description,
    },
  }
}

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
