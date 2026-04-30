// Soft genre-based color palette for poster-style script cards.
// Anuj 2026-04-30 v0.6 Discover redesign.
//
// Each tint is light enough to live on a light page (no dark mode flips),
// distinct enough to differentiate at a glance, and "Criterion-sleeve"
// editorial — not Saturday-morning crayola.

export interface GenreTint {
  bg: string        // page-side card background
  border: string    // card border (very subtle — keeps it from disappearing on tinted page bg)
  ink: string       // small caps / chrome ink color
}

const TINT_DEFAULT: GenreTint = { bg: '#F8F5EE', border: '#EDE6D7', ink: '#7d6f4f' }

const TINTS: Record<string, GenreTint> = {
  // Drama family — warm cream
  drama:        { bg: '#FBF6E9', border: '#EFE6CB', ink: '#876f3a' },
  biography:    { bg: '#FBF6E9', border: '#EFE6CB', ink: '#876f3a' },
  history:      { bg: '#F4ECDB', border: '#E5D9BC', ink: '#7e6634' },

  // Thriller / Crime / Mystery — cool slate
  thriller:     { bg: '#EEF1F6', border: '#DCE2EC', ink: '#445971' },
  crime:        { bg: '#EAEEF4', border: '#D6DDEA', ink: '#3e5573' },
  mystery:      { bg: '#EFEAF3', border: '#DDD2E5', ink: '#5d4475' },
  noir:         { bg: '#E7EAEF', border: '#D2D7DF', ink: '#37485d' },

  // Comedy — pale peach
  comedy:       { bg: '#FFF1E6', border: '#FADCC1', ink: '#a85f1f' },
  romcom:       { bg: '#FCE7EF', border: '#F4CADC', ink: '#a04266' },

  // Horror — dusky rose
  horror:       { bg: '#F4E2E2', border: '#E2C4C4', ink: '#9a3a3a' },

  // Sci-Fi — cool mint / glass
  scifi:        { bg: '#E8F0EE', border: '#CFDDDA', ink: '#2c5e54' },
  sciencefiction:{ bg: '#E8F0EE', border: '#CFDDDA', ink: '#2c5e54' },

  // Fantasy — soft lavender
  fantasy:      { bg: '#EFE7F4', border: '#D9CCE5', ink: '#5b3f7a' },

  // Romance — soft pink
  romance:      { bg: '#FCE7EF', border: '#F4CADC', ink: '#a04266' },

  // Action / Adventure — bold but soft orange
  action:       { bg: '#FFEDD5', border: '#F7D5A6', ink: '#9a5318' },
  adventure:    { bg: '#FFE9CC', border: '#F4CFA0', ink: '#8d4d18' },

  // Western — desert tan
  western:      { bg: '#F5EBDB', border: '#E5D2B0', ink: '#7d5a2a' },

  // Family / Animation — pale sky
  animation:    { bg: '#E7EFF5', border: '#CFDCEA', ink: '#3d5b7a' },
  family:       { bg: '#EFF3E7', border: '#D6DEC5', ink: '#516e35' },

  // Documentary / Other neutrals
  documentary:  { bg: '#EFEBE3', border: '#DCD4C4', ink: '#5d513c' },
  musical:      { bg: '#F6E9F1', border: '#E8CDDC', ink: '#7e3a64' },
  war:          { bg: '#EAE6DD', border: '#D5CDB8', ink: '#5d503a' },
  sport:        { bg: '#E5EFE9', border: '#C5DAD0', ink: '#2f6149' },
}

/** Normalize a free-form genre string to a TINTS key. */
function normalizeGenreKey(genre: string | null | undefined): string | null {
  if (!genre) return null
  const k = genre
    .toLowerCase()
    .replace(/[^a-z]/g, '') // strip spaces, dashes, punctuation
  if (!k) return null
  // Map common synonyms to the canonical key in TINTS
  if (k.includes('scifi') || k.includes('sciencefiction')) return 'scifi'
  if (k.includes('romcom') || k === 'romanticcomedy') return 'romcom'
  if (k.includes('crime')) return 'crime'
  if (k.includes('thrill')) return 'thriller'
  if (k.includes('myster')) return 'mystery'
  if (k.includes('horror')) return 'horror'
  if (k.includes('fantas')) return 'fantasy'
  if (k.includes('romance')) return 'romance'
  if (k.includes('action')) return 'action'
  if (k.includes('adventure')) return 'adventure'
  if (k.includes('western')) return 'western'
  if (k.includes('animat')) return 'animation'
  if (k.includes('family')) return 'family'
  if (k.includes('document')) return 'documentary'
  if (k.includes('musical')) return 'musical'
  if (k.includes('comedy')) return 'comedy'
  if (k.includes('drama')) return 'drama'
  if (k.includes('biograph')) return 'biography'
  if (k.includes('history') || k.includes('historic')) return 'history'
  if (k.includes('noir')) return 'noir'
  if (k.includes('war')) return 'war'
  if (k.includes('sport')) return 'sport'
  return null
}

export function tintForGenre(genre: string | null | undefined): GenreTint {
  const key = normalizeGenreKey(genre)
  if (!key) return TINT_DEFAULT
  return TINTS[key] || TINT_DEFAULT
}
