import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

type Params = { id: string }

type ReportMeta = {
  title: string
  score: number | null
  tier: string | null
  rank: number | null
  totalPublic: number | null
  unlocked: boolean
}

async function getReportMeta(id: string): Promise<ReportMeta | null> {
  try {
    // Service-role key bypasses RLS — safe server-side only.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: evalRow } = await supabase
      .from('script_evaluations')
      .select('weighted_score, tier, submission_id')
      .eq('id', id)
      .single()

    if (!evalRow) return null

    const submissionId = (evalRow as any).submission_id as string
    const score =
      (evalRow as any).weighted_score !== null
        ? Number((evalRow as any).weighted_score)
        : null
    const tier = ((evalRow as any).tier as string) ?? null

    const { data: subRow } = await supabase
      .from('script_submissions')
      .select('title, is_public, user_id')
      .eq('id', submissionId)
      .single()

    const title = ((subRow as any)?.title as string) ?? 'Screenplay'
    const isPublic = Boolean((subRow as any)?.is_public)
    const ownerUserId = ((subRow as any)?.user_id as string | null) ?? null

    // Gate: unlocked only if owner is an active subscriber OR post is public
    // (public toggle already requires subscription). Mirrors report page gate.
    let ownerIsSubscribed = false
    if (ownerUserId) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', ownerUserId)
        .single()
      ownerIsSubscribed =
        ((ownerProfile as any)?.subscription_status as string | null) === 'active'
    }
    const unlocked = ownerIsSubscribed || isPublic

    let rank: number | null = null
    let totalPublic: number | null = null
    if (isPublic && score !== null) {
      const { data: publicScores } = await supabase
        .from('script_evaluations')
        .select('weighted_score, script_submissions!inner(is_public)')
        .eq('script_submissions.is_public', true)
        .not('weighted_score', 'is', null)

      if (Array.isArray(publicScores)) {
        const scores = publicScores
          .map((r: any) => Number(r.weighted_score))
          .filter((n) => !Number.isNaN(n))
        totalPublic = scores.length
        rank = scores.filter((s) => s > score).length + 1
      }
    }

    return { title, score, tier, rank, totalPublic, unlocked }
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
    'See how this screenplay scored on GEM — producer-grade screenplay evaluation.'

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

  // Display-friendly tier label (keeps DB values stable while updating UI copy)
  const tierLabelFor = (t: string | null): string => {
    if (t === 'Optionable') return 'Option Ready'
    if (t === 'Needs Development') return 'Shows Promise'
    return t ?? ''
  }

  // Clean metadata title — score/tier live on the OG card image, not in the text.
  const headline = `${meta.title} — GEM Script Evaluation`

  // LOCKED: never leak score or tier in description. This is load-bearing —
  // score in og:description would defeat the paywall via link previews.
  let description: string
  if (!meta.unlocked) {
    description = `${meta.title} on GEM — a producer-grade read of your screenplay. Get yours read in 60 seconds.`
  } else {
    const scoreStr = meta.score !== null ? `${Math.round(meta.score)}/100` : ''
    const tierStr = tierLabelFor(meta.tier)
    const rankStr =
      meta.rank !== null && meta.totalPublic !== null && meta.totalPublic > 1
        ? ` Ranked #${meta.rank} of ${meta.totalPublic} on the GEM leaderboard.`
        : ''
    description = scoreStr
      ? `${meta.title} scored ${scoreStr}${tierStr ? ` — ${tierStr}` : ''} on GEM — a producer-grade read of your screenplay.${rankStr} Get yours read in 60 seconds.`
      : `${meta.title} on GEM — a producer-grade read of your screenplay. Get yours read in 60 seconds.`
  }

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
