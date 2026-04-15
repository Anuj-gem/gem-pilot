// v4 report — positioning-first. No scores or tiers in the Pitch view.
// Pitch tab (public): hook, what makes this special, lead characters.
// Details tab (private to the writer, paid unlock for viewers):
//   production reality, considerations for development, dimension analysis (with X/10).
//
// Gate model — unchanged from v3: blur is driven by the SUBMISSION OWNER's subscription.
//   ownerIsSubscribed  → report is fully unlocked for everyone
//   !ownerIsSubscribed → free tease: pitch hook + headline + 2 strengths; everything else
//                        is blurred behind SectionLock CTAs (pro for logged-in, signup for
//                        anonymous). Owner always sees their own report fully.
//
// Dimension scores are shown as "X/10" in Details. For free viewers they blur to "?/10"
// which is the tease the writer said entices upgrade.
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import Nav from '@/components/nav'
import { VisibilityToggle } from '@/components/report/visibility-toggle'
import { LikeButton } from '@/components/report/like-button'
import { SubscribeGate } from '@/components/report/subscribe-gate'
import { ExpiryCountdown } from '@/components/report/expiry-countdown'
import { InlineSignup } from '@/components/report/inline-signup'
import { SectionLock } from '@/components/report/section-lock'
import { ReportAnalytics } from '@/components/report/report-analytics'
import { PrivateDemoBanner } from '@/components/report/private-demo-banner'
import { ReportTabs } from '@/components/report/report-tabs'
import { ContactWriter } from '@/components/report/contact-writer'
import { DIMENSION_META, normalizeEvaluation, type DimensionId } from '@/types'
import type { ScriptEvaluation, ScriptSubmission, GEMEvaluation } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ for?: string }>
}

// v4-specific fields that aren't in the shared GEMEvaluation type yet.
interface V4Extras {
  positioning_hook?: string
  lead_characters?: {
    name: string
    role_type: string
    demographics: string
    hook: string
    why_actor_wants_this: string
  }[]
  considerations?: { area: string; detail: string; source?: string }[]
}

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { for: forWriter } = await searchParams
  const supabase = await createClient()
  const serviceClient = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: evaluation, error } = await serviceClient
    .from('script_evaluations')
    .select(`
      *,
      script_submissions (
        id, user_id, title, filename, file_size, status, is_public, created_at, expires_at,
        profiles ( full_name, avatar_url )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !evaluation) notFound()

  const eval_ = evaluation as ScriptEvaluation & {
    script_submissions: ScriptSubmission & {
      profiles: { full_name: string; avatar_url: string | null } | null
    }
  }

  const report = eval_.evaluation as GEMEvaluation & V4Extras
  const submission = eval_.script_submissions
  const isOwner = user?.id === submission.user_id
  const isAnonymousSubmission = !submission.user_id
  const hasExpiry = isAnonymousSubmission && !!submission.expires_at
  const isExpired = hasExpiry && new Date(submission.expires_at!) < new Date()
  const writerName = submission.profiles?.full_name ?? 'the writer'

  const { classification, whatsSpecial } = normalizeEvaluation(report)

  // Gate logic (viewer-centric):
  //   - Owner always sees their own report fully.
  //   - Everyone else must be a subscriber to see the full report.
  // Login is required to create a report, so there is no anonymous-submission unlock.
  // Owner subscription and public-post status still affect discoverability / submission
  // lifecycle elsewhere, but do NOT unlock the report for a free viewer.
  let ownerIsSubscribed = false
  if (submission.user_id) {
    const { data: ownerProfile } = await serviceClient
      .from('profiles')
      .select('subscription_status')
      .eq('id', submission.user_id)
      .single()
    ownerIsSubscribed = ownerProfile?.subscription_status === 'active'
  }

  let viewerIsSubscribed = false
  if (user) {
    const { data: viewerProfile } = await serviceClient
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()
    viewerIsSubscribed = viewerProfile?.subscription_status === 'active'
  }

  const unlocked = isOwner || viewerIsSubscribed
  const showBlurred = !unlocked
  // Login is required to reach this page, so any locked viewer is a free member.
  const lockVariant: 'signup' | 'pro' | null = showBlurred ? 'pro' : null

  const { count: likeCount } = await supabase
    .from('script_likes')
    .select('*', { count: 'exact', head: true })
    .eq('evaluation_id', id)

  let userLiked = false
  if (user) {
    const { data: existingLike } = await supabase
      .from('script_likes')
      .select('id')
      .eq('evaluation_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    userLiked = !!existingLike
  }

  // Free tease: first 2 strengths fully visible, remainder locked.
  const allStrengths = whatsSpecial.strengths ?? []
  const visibleStrengths = unlocked ? allStrengths : allStrengths.slice(0, 2)
  const lockedStrengthCount = unlocked ? 0 : Math.max(0, allStrengths.length - 2)

  const positioningHook = report.positioning_hook ?? ''
  const leadCharacters = report.lead_characters ?? []
  const considerations = report.considerations ?? []
  const production = report.production_reality
  const scores = report.scores ?? {}

  // Show Contact Writer for any non-owner viewing a non-anonymous submission.
  // When !unlocked, it renders as an upsell (greyed out + "Upgrade to contact").
  const showContactWriter =
    !isOwner && !isAnonymousSubmission && !!submission.user_id

  return (
    <>
      <Nav />
      {hasExpiry && !isExpired && (
        <ExpiryCountdown expiresAt={submission.expires_at!} evaluationId={id} />
      )}
      <ReportAnalytics evaluationId={id} isBlurred={showBlurred} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-24 space-y-8">
        {forWriter && <PrivateDemoBanner writerName={decodeURIComponent(forWriter)} />}

        {isAnonymousSubmission && (
          <div id="inline-signup" className="rounded-xl transition-shadow duration-500">
            <InlineSignup submissionId={submission.id} evaluationId={id} />
          </div>
        )}

        {!isAnonymousSubmission && (
          <div className="flex items-center gap-3 flex-wrap">
            {isOwner && (
              <VisibilityToggle
                submissionId={submission.id}
                initialPublic={submission.is_public ?? false}
                title={submission.title}
                score={eval_?.weighted_score ?? undefined}
                isSubscribed={ownerIsSubscribed}
              />
            )}
            <LikeButton
              evaluationId={id}
              initialLiked={userLiked}
              initialCount={likeCount ?? 0}
              loggedIn={!!user}
            />
          </div>
        )}

        {/* Title + meta */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--gem-white)] tracking-tight leading-tight mb-3">
            {submission.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--gem-gray-400)]">
            {classification.format && <span>{classification.format}</span>}
            {classification.genre_primary && (
              <>
                <span className="text-[var(--gem-gray-500)]">·</span>
                <span>{classification.genre_primary}</span>
              </>
            )}
            {classification.genre_tags?.map((t, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-full text-xs text-[var(--gem-gray-400)] border border-[var(--gem-gray-700)]"
              >
                {t}
              </span>
            ))}
            {classification.tone && (
              <>
                <span className="text-[var(--gem-gray-500)]">·</span>
                <span className="italic text-[var(--gem-gray-500)]">{classification.tone}</span>
              </>
            )}
          </div>
        </div>

        {/* Positioning hook — always visible */}
        {positioningHook && (
          <div
            className="relative border border-[var(--gem-gray-700)] rounded-2xl p-7 sm:p-8"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), transparent 60%)' }}
          >
            <div
              aria-hidden
              className="absolute left-0 top-5 bottom-5 rounded-r"
              style={{ width: 3, background: 'var(--gem-gold)' }}
            />
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gold)] mb-3">
              The Pitch
            </div>
            <p className="text-xl sm:text-[22px] text-[var(--gem-white)] leading-snug font-medium">
              {positioningHook}
            </p>
          </div>
        )}

        {/* Contact writer — live when unlocked, upsell when locked */}
        {showContactWriter && (
          <ContactWriter
            evaluationId={id}
            writerName={writerName}
            isLoggedIn={!!user}
            locked={!unlocked}
          />
        )}

        <ReportTabs
          detailsLocked={!unlocked}
          pitch={
            <>
              {/* What Makes This Special */}
              <section className="mb-12">
                <SectionHeader label="What Makes This Special" />
                {whatsSpecial.headline && (
                  <p className="text-base sm:text-lg text-[var(--gem-gray-200)] leading-relaxed mb-6">
                    {whatsSpecial.headline}
                  </p>
                )}
                <div className="space-y-3">
                  {visibleStrengths.map((s, i) => (
                    <div
                      key={i}
                      className="border border-[var(--gem-gray-700)] rounded-xl p-5 bg-white"
                    >
                      <p className="text-[15px] font-semibold text-[var(--gem-white)] mb-2">
                        {s.dimension_or_area}
                      </p>
                      <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed mb-2">
                        {s.what_it_means}
                      </p>
                      {s.evidence && (
                        <p className="text-[13px] text-[var(--gem-gray-500)] italic leading-relaxed">
                          {s.evidence}
                        </p>
                      )}
                    </div>
                  ))}
                  {lockedStrengthCount > 0 && (
                    <div className="relative">
                      <div className="border border-[var(--gem-gray-700)] rounded-xl p-5 bg-white blur-md select-none pointer-events-none space-y-3">
                        <p className="text-[15px] font-semibold text-[var(--gem-white)]">
                          +{lockedStrengthCount} more {lockedStrengthCount === 1 ? 'strength' : 'strengths'} this script has going for it
                        </p>
                        <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed">
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Specific script strength
                          description with script evidence and commercial framing that real producers care about.
                        </p>
                        <p className="text-[13px] text-[var(--gem-gray-500)] italic">
                          Evidence from the script supporting this strength.
                        </p>
                      </div>
                      {lockVariant && (
                        <SectionLock variant={lockVariant} evaluationId={id} position="center" />
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Lead Characters */}
              <section className="mb-12">
                <SectionHeader label="Lead Characters" />
                <p className="text-sm text-[var(--gem-gray-500)] -mt-3 mb-5">
                  The parts inside this script and why an actor would chase them.
                </p>
                {unlocked ? (
                  leadCharacters.length > 0 ? (
                    <div className="space-y-3">
                      {leadCharacters.map((c, i) => (
                        <LeadCharacterCard key={i} c={c} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--gem-gray-500)] italic">
                      No lead character breakdown available for this report.
                    </p>
                  )
                ) : (
                  <div className="relative">
                    <div className="space-y-3 blur-md select-none pointer-events-none">
                      {[0, 1].map((i) => (
                        <div
                          key={i}
                          className="border border-[var(--gem-gray-700)] rounded-xl p-6 bg-white"
                        >
                          <p className="text-xl font-semibold text-[var(--gem-white)] mb-2">
                            Character Name
                          </p>
                          <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed mb-4">
                            A dense paragraph describing who this character is — their contradictions,
                            voice, and emotional engine that makes them specific and castable.
                          </p>
                          <div
                            className="rounded-lg p-4"
                            style={{
                              background: 'rgba(5,150,105,0.06)',
                              border: '1px solid rgba(5,150,105,0.18)',
                            }}
                          >
                            <p
                              className="text-[10px] uppercase tracking-[0.15em] font-bold mb-1.5"
                              style={{ color: '#059669' }}
                            >
                              Why an actor would want this part
                            </p>
                            <p className="text-[13px] text-[var(--gem-gray-200)] leading-relaxed m-0">
                              The showcase inside this role — what it lets an actor do and the comp
                              performances that anchor the kind of part it is.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {lockVariant && (
                      <SectionLock variant={lockVariant} evaluationId={id} position="center" />
                    )}
                  </div>
                )}
              </section>
            </>
          }
          details={
            unlocked ? (
              <DetailsView
                scores={scores}
                production={production}
                considerations={considerations}
                showScores
              />
            ) : (
              <div className="relative">
                <div className="blur-md select-none pointer-events-none">
                  <DetailsView
                    scores={scores}
                    production={production}
                    considerations={considerations}
                    showScores={false}
                  />
                </div>
                {lockVariant && (
                  <SectionLock variant={lockVariant} evaluationId={id} position="center" />
                )}
              </div>
            )
          }
        />
      </div>

      {showBlurred && user && <SubscribeGate evaluationId={id} isLoggedIn={true} />}
    </>
  )
}

function DetailsView({
  scores,
  production,
  considerations,
  showScores,
}: {
  scores: Record<string, { score: number; reasoning: string }>
  production: GEMEvaluation['production_reality']
  considerations: { area: string; detail: string; source?: string }[]
  showScores: boolean
}) {
  return (
    <>
      {/* Privacy banner */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl mb-8"
        style={{
          background: 'rgba(124, 58, 237, 0.06)',
          border: '1px solid rgba(124, 58, 237, 0.22)',
        }}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full grid place-items-center text-white text-sm"
          style={{ background: 'var(--gem-accent)' }}
        >
          🔒
        </div>
        <p className="text-[13px] text-[var(--gem-gray-200)] leading-relaxed m-0">
          <strong className="text-[var(--gem-white)] font-semibold">Private to you.</strong>{' '}
          This section isn&apos;t shared when your report is circulated — it&apos;s yours for
          reference. Use it to sharpen your pitch, navigate budget conversations, and understand
          where the script lives in the market.
        </p>
      </div>

      {/* Production Reality */}
      {production && (
        <section className="mb-12">
          <SectionHeader label="Production Reality" />
          <p className="text-sm text-[var(--gem-gray-500)] -mt-3 mb-5">
            Everything the script tells us about how it would actually get made.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <FactCard label="Cast">
              <Fact k="Speaking roles" v={production.cast?.speaking_roles} />
              <Fact k="Leads" v={production.cast?.leads} />
              {(production.cast?.series_regulars ?? 0) > 0 && (
                <Fact k="Series regulars" v={production.cast?.series_regulars} />
              )}
              {production.cast?.child_actors && <Fact k="Child actors" v="Yes" />}
              {production.cast?.casting_challenges?.length ? (
                <Fact k="Casting" v={production.cast.casting_challenges.join(', ')} />
              ) : null}
            </FactCard>
            <FactCard label="Locations & Scale">
              <Fact k="Distinct" v={production.locations?.distinct_count} />
              <Fact
                k="Int/Ext"
                v={production.locations?.interior_exterior_ratio ?? production.locations?.interior_exterior_mix}
              />
              <Fact k="Era" v={production.locations?.period_or_contemporary} />
              {production.locations?.expensive_flags?.length ? (
                <Fact k="Notable" v={production.locations.expensive_flags.join(', ')} />
              ) : null}
            </FactCard>
            <FactCard label="Technical">
              <Fact
                k="VFX"
                v={
                  (production.technical?.vfx_level ?? '') +
                  (production.technical?.vfx_details ? ` — ${production.technical.vfx_details}` : '')
                }
              />
              <Fact k="Stunts" v={production.technical?.stunts_level ?? production.technical?.stunts} />
              {production.technical?.sfx_needs && <Fact k="SFX" v={production.technical.sfx_needs} />}
              {production.technical?.night_shoots && (
                <Fact k="Night shoots" v={production.technical.night_shoots} />
              )}
              {production.technical?.animals && <Fact k="Animals" v="Yes" />}
            </FactCard>
            <FactCard label="Platform & Content">
              <Fact k="Lane" v={production.platform_fit?.recommended_lane} />
              <Fact k="Content" v={production.platform_fit?.content_level} />
              {production.platform_fit?.series_engine_or_release_model && (
                <Fact k="Model" v={production.platform_fit.series_engine_or_release_model} />
              )}
            </FactCard>
          </div>
          {production.rights_flags?.length ? (
            <div className="border border-[var(--gem-gray-700)] rounded-lg p-3 mt-3 text-xs text-[var(--gem-gray-400)] bg-white">
              <span className="uppercase tracking-[0.15em] text-[10px] text-[var(--gem-gray-500)] font-semibold mr-2">
                Rights & Clearance
              </span>
              {production.rights_flags.map((r, i) => {
                const text = typeof r === 'string' ? r : `${r.type}: ${r.detail}`
                return (
                  <span key={i} className="mr-3">
                    • {text}
                  </span>
                )
              })}
            </div>
          ) : null}
        </section>
      )}

      {/* Considerations */}
      {considerations.length > 0 && (
        <section className="mb-12">
          <SectionHeader label="Considerations for Development" />
          <p className="text-sm text-[var(--gem-gray-500)] -mt-3 mb-5">
            Details worth knowing as you position this.
          </p>
          <div className="space-y-2">
            {considerations.map((c, i) => (
              <div
                key={i}
                className="border border-[var(--gem-gray-700)] rounded-lg p-4 bg-white"
              >
                <p className="text-[13px] font-semibold text-[var(--gem-white)] mb-1">
                  {c.area}
                </p>
                <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed m-0">
                  {c.detail}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dimension Analysis */}
      <section className="mb-8">
        <SectionHeader label="Dimension Analysis" />
        <p className="text-sm text-[var(--gem-gray-500)] -mt-3 mb-5">
          Ten lenses on what the script is doing. Tap to expand.
        </p>
        <div className="space-y-2">
          {(Object.keys(DIMENSION_META) as DimensionId[]).map((dimId) => {
            const s = scores?.[dimId]
            if (!s?.reasoning) return null
            const meta = DIMENSION_META[dimId]
            return (
              <details
                key={dimId}
                className="border border-[var(--gem-gray-700)] rounded-lg bg-white group"
              >
                <summary className="p-4 cursor-pointer text-sm font-medium text-[var(--gem-white)] list-none flex justify-between items-center gap-3">
                  <span>{meta.label}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[var(--gem-accent)] tabular-nums">
                      {showScores ? `${s.score}/10` : '?/10'}
                    </span>
                    <span className="text-xs text-[var(--gem-gray-500)] group-open:rotate-180 transition-transform">
                      ▾
                    </span>
                  </span>
                </summary>
                <div className="px-4 pb-4 text-sm text-[var(--gem-gray-400)] leading-relaxed">
                  {s.reasoning}
                </div>
              </details>
            )
          })}
        </div>
      </section>
    </>
  )
}

function LeadCharacterCard({
  c,
}: {
  c: { name: string; role_type: string; demographics: string; hook: string; why_actor_wants_this: string }
}) {
  return (
    <div className="border border-[var(--gem-gray-700)] rounded-xl p-6 bg-white">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <p className="text-xl font-semibold text-[var(--gem-white)] tracking-tight m-0">
          {c.name}
        </p>
        <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--gem-gray-500)]">
          {c.role_type} · {c.demographics}
        </span>
      </div>
      <p className="text-sm text-[var(--gem-gray-300)] leading-relaxed mb-4">{c.hook}</p>
      <div
        className="rounded-lg p-4"
        style={{ background: 'rgba(5, 150, 105, 0.06)', border: '1px solid rgba(5, 150, 105, 0.18)' }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.15em] font-bold mb-1.5"
          style={{ color: '#059669' }}
        >
          Why an actor would want this part
        </p>
        <p className="text-[13px] text-[var(--gem-gray-200)] leading-relaxed m-0">
          {c.why_actor_wants_this}
        </p>
      </div>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <>
      <h2 className="text-xs uppercase tracking-[0.18em] font-bold text-[var(--gem-white)] mb-1.5">
        {label}
      </h2>
      <div className="w-10 h-0.5 mb-5 rounded" style={{ background: 'var(--gem-gold)' }} />
    </>
  )
}

function FactCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--gem-gray-700)] rounded-xl p-4 bg-white">
      <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--gem-gray-500)] mb-2.5 m-0">
        {label}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Fact({ k, v }: { k: string; v: string | number | null | undefined }) {
  if (v === null || v === undefined || v === '') return null
  return (
    <div className="flex justify-between gap-3 text-[13px] py-0.5">
      <span className="text-[var(--gem-gray-500)]">{k}</span>
      <span className="text-[var(--gem-white)] text-right font-medium">{String(v)}</span>
    </div>
  )
}
