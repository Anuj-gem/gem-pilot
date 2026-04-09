import type { GEMEvaluation } from '@/types'

/**
 * Sample Game of Thrones pilot evaluation used on the landing page.
 * This is a realistic demo report — not pulled from the database.
 * Updated to v3 shape (10 dimensions, no LLM-calculated score/tier).
 */
export const SAMPLE_GOT_REPORT: {
  title: string
  author: string
  weighted_score: number
  tier: string
  evaluation: GEMEvaluation
} = {
  title: 'Game of Thrones',
  author: 'David Benioff & D.B. Weiss',
  weighted_score: 85,
  tier: 'Greenlight Material',
  evaluation: {
    classification: {
      format: 'TV Pilot (Hour)',
      genre_primary: 'Fantasy Drama',
      genre_tags: ['Political Thriller', 'Epic Adventure'],
      tone: 'Dark, gritty, operatic with sudden violence',
    },
    scores: {
      audience_appeal_marketability: {
        score: 8,
        reasoning: 'The opening sequence establishes immediate stakes and spectacle. Multi-generational appeal through clear power struggles across seven kingdoms.',
      },
      conceptual_hook_clarity: {
        score: 8,
        reasoning: 'Hook lands in Scene 1. Political intrigue, magic, family legacy, and existential threat collide. By the end, three storylines are clear.',
      },
      character_appeal_and_long_term_potential: {
        score: 9,
        reasoning: 'Ned Stark is contradictory — honorable man in dishonorable world. Daenerys transforms from pawn to agent. Jon Snow occupies liminal space. Relationships generate engines.',
      },
      creative_originality_and_boldness: {
        score: 8,
        reasoning: 'High fantasy treated as political drama is bold. Killing Bran near end of pilot breaks expectation. The magic system is sparse and mysterious.',
      },
      narrative_momentum_engagement: {
        score: 7,
        reasoning: 'First act establishes Stark legitimacy. Midpoint: Bran falls, story pivots. Pacing drags slightly in Essos scenes, but ending opens clear story doors.',
      },
      resonant_originality: {
        score: 9,
        reasoning: 'Fantasy as political realism feels both fresh and inevitable. The "anyone can die" contract established in the pilot was genuinely new for TV.',
      },
      world_density_and_texture: {
        score: 10,
        reasoning: 'Westeros is one of the richest worlds ever put on screen. Multiple kingdoms, religions, armies, languages, and histories all implied in the pilot alone.',
      },
      tonal_specificity: {
        score: 9,
        reasoning: 'You could identify this show from a single scene. The blend of medieval brutality, political scheming, and mythic dread is unmistakable.',
      },
      latent_depth_slow_burn_potential: {
        score: 9,
        reasoning: 'The pilot barely scratches the surface. Every character has layers the pilot implies but does not reveal. The White Walker threat is a slow-burn masterclass.',
      },
      relationship_density_and_ensemble_engine: {
        score: 9,
        reasoning: 'Stark/Lannister, Ned/Robert, Ned/Catelyn, Jon/Ned, Dany/Viserys — every pairing generates its own story engine. The ensemble is inexhaustible.',
      },
    },
    whats_special: {
      strengths: [
        {
          dimension_or_area: 'World density (10/10)',
          what_it_means: 'The world is rich enough to sustain a decade of storytelling. Every kingdom, religion, and family line is a story engine. This is franchise-grade IP.',
          evidence: 'Seven kingdoms, multiple religions, three continents, and deep dynastic history all implied in the pilot.',
          source: 'script',
        },
        {
          dimension_or_area: 'Ensemble engine (9/10)',
          what_it_means: 'Any two characters in a room generate conflict. This means the show never runs out of story — you can always cut to a new pairing.',
          evidence: 'Stark/Lannister, Ned/Robert, Jon/Ned, Dany/Viserys all operate as independent story engines.',
          source: 'script',
        },
        {
          dimension_or_area: 'Tonal specificity (9/10)',
          what_it_means: 'The tone is immediately ownable and brandable — no other show feels like this. That distinctiveness is what built the cultural phenomenon.',
          evidence: 'Medieval brutality, political scheming, and mythic dread blended in a ratio unique to this show.',
          source: 'script',
        },
        {
          dimension_or_area: 'Platform fit',
          what_it_means: 'Naturally fits the premium cable/streaming lane with a clear audience and content level that matches HBO\'s brand.',
          evidence: 'TV-MA content, serialized structure, 10-episode seasons, clear 7-8 season potential.',
          source: 'production',
        },
      ],
      headline: 'A franchise-grade IP with inexhaustible world-building, an ensemble that generates story from any character pairing, and a tone so distinctive it spawned an entire subgenre. This is the kind of script that builds a network.',
    },
    whats_holding_it_back: {
      themes: [
        {
          theme: 'Budget exposure',
          risk: 'The script demands period production design, large ensemble casting with name talent, extensive exterior shoots, and VFX that only scales up from here.',
          evidence: '28 speaking roles, 14 distinct locations, medieval set builds, the Wall, Dothraki encampment, and period horse work.',
          source: 'production',
        },
        {
          theme: 'Pacing drag in Essos',
          risk: 'The Daenerys storyline moves at half-speed in the pilot, which risks losing audience attention before her agency emerges.',
          evidence: 'Essos scenes are exposition-heavy with no active conflict until the final scene.',
          source: 'script',
        },
      ],
      headline: 'The main development risk is scale and cost — this is an inherently expensive show that requires premium-tier investment from day one. The script quality justifies it, but the budget exposure is real and the production complexity only grows from here.',
    },
    production_reality: {
      cast: {
        speaking_roles: 28,
        leads: 6,
        series_regulars: 12,
        child_actors: true,
        requires_name_talent: true,
        name_talent_reason: 'Requires A-list for Ned Stark, Robert Baratheon, Cersei. Daenerys and Jon Snow can be breakout unknowns.',
        casting_challenges: ['Large ensemble with many period-specific roles', 'Child actors for Stark children'],
      },
      locations: {
        distinct_count: 14,
        interior_exterior_ratio: '40/60',
        period_or_contemporary: 'High fantasy pseudo-medieval',
        expensive_flags: [
          'Period design (Medieval setting)',
          'The Wall (major set build)',
          'Outdoor staging across multiple kingdoms',
          'Dothraki encampment',
        ],
      },
      technical: {
        vfx_level: 'moderate',
        vfx_details: 'White Walker glimpse, dragon egg close-ups, opening title sequence.',
        stunts_level: 'moderate',
        sfx_needs: 'Fire magic practical effects, blood work, period horse work.',
        night_shoots: 'significant',
        animals: true,
      },
      period_or_contemporary: 'High fantasy pseudo-medieval',
      rights_flags: [],
      platform_fit: {
        recommended_lane: 'Premium cable (HBO) or prestige streaming',
        content_level: 'TV-MA',
        series_engine_or_release_model: 'Serialized, long-form storytelling. 10-episode seasons. 7-8 season potential.',
      },
    },
  },
}

/**
 * Dimension highlights used in the animated landing page showcase.
 * Updated for v3 — shows top 5 of the 10 dimensions for visual rotation.
 */
export const SHOWCASE_DIMENSIONS = [
  { label: 'World', score: 10, color: '#34d399' },
  { label: 'Characters', score: 9, color: '#34d399' },
  { label: 'Tone', score: 9, color: '#34d399' },
  { label: 'Ensemble', score: 9, color: '#34d399' },
  { label: 'Resonance', score: 9, color: '#34d399' },
  { label: 'Depth', score: 9, color: '#34d399' },
  { label: 'Market Appeal', score: 8, color: '#34d399' },
  { label: 'Hook', score: 8, color: '#34d399' },
  { label: 'Originality', score: 8, color: '#34d399' },
  { label: 'Momentum', score: 7, color: '#fbbf24' },
] as const
