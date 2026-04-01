import type { GEMEvaluation } from '@/types'

/**
 * Sample Game of Thrones pilot evaluation used on the landing page.
 * This is a realistic demo report — not pulled from the database.
 */
export const SAMPLE_GOT_REPORT: {
  title: string
  author: string
  evaluation: GEMEvaluation
} = {
  title: 'Game of Thrones',
  author: 'David Benioff & D.B. Weiss',
  evaluation: {
    format_detection: {
      format: 'TV Pilot (Hour)',
      genre_primary: 'Fantasy Drama',
      genre_tags: ['Political Thriller', 'Epic Adventure'],
      tone: 'Dark, gritty, operatic with sudden violence',
      comparables: [
        {
          title: 'The Sopranos',
          why: 'Ensemble-driven drama where power struggles between morally gray characters drive narrative tension',
        },
        {
          title: 'Succession',
          why: 'Ruthless family dynamics, sharp dialogue, shocking plot turns that redefine the game',
        },
        {
          title: 'Breaking Bad',
          why: 'Meticulous pacing, character arcs that promise transformation, and world-building that makes fantasy feel inevitable',
        },
      ],
    },
    scores: {
      audience_appeal_marketability: {
        score: 8,
        reasoning:
          'The opening sequence—a wildling raid across the Wall—establishes immediate stakes and spectacle. The central mystery combined with clear power struggles across seven kingdoms taps into multi-generational appeal. The \'winter is coming\' theme resonates as apocalyptic urgency that drives premium viewership.',
      },
      conceptual_hook_clarity: {
        score: 8,
        reasoning:
          'Hook lands in Scene 1. The logline clarifies instantly—political intrigue, magic, family legacy, and existential threat collide. By the end of the pilot, three storylines are clear: Stark inheritance, Targaryen exile, and White Walker threat.',
      },
      character_appeal_and_long_term_potential: {
        score: 9,
        reasoning:
          'Ned Stark is contradictory—honorable man in dishonorable world. Daenerys is exiled princess becoming queen, with agency locked in chains. Jon Snow occupies liminal space, generating endless story potential. Relationships generate engines: family loyalty vs. crown obligation, love vs. duty.',
      },
      creative_originality_and_boldness: {
        score: 8,
        reasoning:
          'High fantasy treated as political drama—not spectacle—is bold. Killing Bran near end of pilot breaks expectation and raises stakes. The magic system is sparse and mysterious, not explained, which creates dread.',
      },
      narrative_momentum_engagement: {
        score: 7,
        reasoning:
          'First act establishes Stark legitimacy and family bonds. Midpoint: Bran falls, story pivots. Pacing drags slightly in Essos scenes, but the Hand\'s summoning and Bran\'s fall create urgency. Ending opens clear story doors.',
      },
    },
    weighted_score: 82,
    tier: 'Exceptional',
    development_assessment: {
      working: [
        {
          point: 'The Stark family scenes establish ensemble acting and emotional core',
          evidence:
            'The dinner scene in Winterfell where Ned addresses his household, followed by the moment Catelyn receives news of Bran\'s fall—both grounded in family loyalty and loss.',
          why_it_works:
            'Audiences don\'t care about maps and politics. They care about people. By centering the pilot on Stark family bonds, the show gives viewers emotional stakes before plot stakes.',
        },
        {
          point: 'Magic and threat are suggested, never explained',
          evidence:
            'Opening scene: wildlings, something in the snow, White Walkers glimpsed but not named. Dany\'s prophecies and dragon eggs treated as mystery.',
          why_it_works:
            'Unexplained stakes create dread and curiosity. Viewers will return to understand the magic system rather than dismiss it as solved.',
        },
        {
          point: 'Pilot respects audience intelligence',
          evidence:
            'Relationships between houses, the Targaryen backstory, Baratheon\'s debt crisis—delivered through dialogue and context, not exposition dumps.',
          why_it_works:
            'Treating viewers as smart keeps them engaged. Complex material becomes a puzzle to solve rather than a lecture to endure.',
        },
      ],
      hurting: [
        {
          point: 'Dany\'s narrative moves at half-speed',
          evidence:
            'The Essos scenes involve exposition about marriages, debts, and dreams. There\'s no active conflict until the final scene.',
          suggestion:
            'Consider advancing her journey faster—could we see her agency earlier, even small acts of rebellion? Or compress this material into Episode 2.',
        },
        {
          point: 'Tyrion\'s introduction feels like an afterthought',
          evidence:
            'He appears late in the pilot at the Wall with Jon Snow. His character is clever but his arrival has no setup.',
          suggestion:
            'Give him a scene in King\'s Landing first so his presence feels earned. Or move his full introduction to Episode 2.',
        },
      ],
      overall_take:
        'This is the rare pilot that feels like the beginning of something genuinely large. The scope could have been incomprehensible, but instead feels inevitable and urgent. Ned Stark and Daenerys\'s parallel stories create a thematic engine that will sustain a series. The bones are exceptional. This script reads like prestige television that happens to involve dragons.',
    },
    production_reality: {
      cast: {
        speaking_roles: 28,
        leads: 6,
        requires_name_talent: true,
        notes:
          'Requires A-list caliber for Ned Stark, Robert Baratheon, Cersei. Daenerys and Jon Snow can be breakout unknowns.',
      },
      locations: {
        distinct_count: 14,
        interior_exterior_mix: '60% exterior, 40% interior',
        expensive_flags: [
          'Period design (Medieval setting)',
          'The Wall (major set build)',
          'Outdoor staging across multiple kingdoms',
          'Dothraki encampment',
        ],
        notes:
          'Feasible for premium cable or streaming. Real-world locations (Northern Ireland, Croatia) can absorb settings without heavy set builds.',
      },
      technical: {
        vfx_requirements:
          'Minimal CGI: White Walker glimpse, dragon egg close-ups, opening title sequence.',
        stunts:
          'Moderate: Wildling raid, Bran\'s fall, sword training. No major action set pieces in pilot.',
        other_flags: [
          'Fire magic (practical effects or CGI)',
          'Blood work and violence',
          'Period horse work',
        ],
      },
      period_or_contemporary:
        'High fantasy pseudo-medieval',
      rights_flags: [],
      platform_fit: {
        recommended_lane: 'Premium cable (HBO) or prestige streaming',
        content_level: 'TV-MA',
        series_engine_or_release_model:
          'Serialized, long-form storytelling. 10-episode seasons. 7-8 season potential.',
      },
    },
  },
}

/**
 * Dimension highlights used in the animated landing page showcase.
 * Pulled from the GoT report for visual rotation.
 */
export const SHOWCASE_DIMENSIONS = [
  { label: 'Characters', score: 9, color: '#34d399' },
  { label: 'Market Appeal', score: 8, color: '#34d399' },
  { label: 'Hook', score: 8, color: '#34d399' },
  { label: 'Originality', score: 8, color: '#34d399' },
  { label: 'Momentum', score: 7, color: '#fbbf24' },
] as const
