/**
 * GEM Production Company Matching Engine
 *
 * Takes a project profile (extracted from script analysis) and matches
 * it against the structured company dataset. Returns ranked matches
 * with reasoning.
 */

import companiesData from "@/data/companies.json";

// ─── Types ──────────────────────────────────────────────────────────

export interface ProjectProfile {
  title: string;
  logline: string;
  genre_primary: string;
  genre_secondary: string[];
  tone: string[];
  medium: string; // feature_film, limited_series, series
  estimated_budget_m: number;
  budget_tier: string; // micro, low, mid, high, tentpole
  themes: string[];
}

export interface CompanyMatch {
  company_id: string;
  company_name: string;
  score: number;
  reasons: string[];
  warnings: string[];
  submission_path: string;
  key_contact: string;
  website: string;
  genres: string[];
  tone_profile: string[];
  budget_range: { min_m: number; max_m: number };
}

interface Company {
  id: string;
  name: string;
  type: string;
  parent_deal?: string;
  medium: string[];
  genres: string[];
  tone_profile: string[];
  budget_range: { min_m: number; max_m: number };
  recent_credits: Array<{
    title: string;
    year: number;
    genre: string;
    medium: string;
    budget_tier: string;
  }>;
  current_development_slate: Array<string | {
    title: string;
    logline: string;
    genre: string;
    status: string;
  }>;
  open_to_unsolicited: boolean;
  submission_notes: string;
  key_people: Array<{ name: string; title: string; focus?: string }>;
  hq_location: string;
  website: string;
  status: string;
  diversity_focus: boolean;
  notes: string;
  last_updated: string;
}

// ─── Genre/Tone Keyword Maps ────────────────────────────────────────

const GENRE_KEYWORDS: Record<string, string[]> = {
  horror: ["horror", "scary", "haunted", "demon", "possessed", "slasher", "supernatural", "ghost", "undead", "zombie", "monster", "creature", "paranormal"],
  thriller: ["thriller", "suspense", "tense", "stalker", "kidnap", "hostage", "conspiracy", "chase", "escape", "trapped"],
  drama: ["drama", "family", "relationship", "struggle", "emotional", "personal", "intimate", "human"],
  comedy: ["comedy", "funny", "humor", "hilarious", "comedic", "satirical", "satire", "farce", "rom-com"],
  "sci-fi": ["sci-fi", "science fiction", "space", "alien", "future", "dystopia", "robot", "ai", "time travel", "technology"],
  action: ["action", "explosion", "fight", "battle", "war", "military", "combat", "mercenary", "heist"],
  romance: ["romance", "love", "relationship", "couple", "wedding", "heartbreak", "affair"],
  crime: ["crime", "detective", "murder", "investigation", "police", "cop", "heist", "mob", "cartel", "gang", "prison"],
  documentary: ["documentary", "true story", "real events", "based on", "nonfiction"],
  animation: ["animated", "animation", "cartoon"],
  biopic: ["biopic", "biography", "life story", "true story of", "based on the life"],
  "coming-of-age": ["coming of age", "coming-of-age", "teenager", "adolescent", "growing up", "high school", "college", "youth"],
  "social-issue": ["social", "racial", "justice", "inequality", "discrimination", "activism", "political", "immigration", "climate"],
  "faith-based": ["faith", "christian", "religious", "spiritual", "god", "church"],
  family: ["family", "children", "kids", "animated", "wholesome"],
  lgbtq: ["lgbtq", "queer", "gay", "lesbian", "transgender", "nonbinary"],
  western: ["western", "cowboy", "frontier", "wild west"],
  period: ["period", "historical", "century", "era", "medieval", "victorian"],
};

const TONE_KEYWORDS: Record<string, string[]> = {
  prestige: ["prestige", "award", "oscar", "critically acclaimed", "literary", "nuanced", "complex", "auteur"],
  elevated_genre: ["elevated", "smart", "subversive", "reimagined", "fresh take", "twist on"],
  commercial: ["commercial", "blockbuster", "mainstream", "wide release", "franchise"],
  indie_arthouse: ["indie", "arthouse", "art house", "independent", "festival", "sundance", "cannes", "a24"],
  crowd_pleaser: ["crowd pleaser", "feel good", "uplifting", "heartwarming", "inspirational", "fun"],
  edgy: ["edgy", "provocative", "controversial", "dark", "gritty", "raw", "unflinching", "disturbing"],
  family_friendly: ["family", "pg", "children", "wholesome", "all ages"],
  grounded: ["grounded", "realistic", "naturalistic", "slice of life", "authentic"],
  high_concept: ["high concept", "what if", "imagine a world", "one day", "suddenly"],
};

const BUDGET_TIERS: Record<string, { keywords: string[]; range: [number, number] }> = {
  micro: { keywords: ["no budget", "micro", "diy", "guerrilla", "found footage", "single location"], range: [0, 1] },
  low: { keywords: ["low budget", "indie", "contained", "small", "intimate"], range: [1, 5] },
  mid: { keywords: ["mid budget", "moderate", "independent"], range: [5, 20] },
  high: { keywords: ["big budget", "epic", "large scale", "spectacle", "vfx heavy", "period piece"], range: [20, 80] },
  tentpole: { keywords: ["blockbuster", "franchise", "superhero", "massive", "tentpole"], range: [80, 250] },
};

// ─── Project Analysis ───────────────────────────────────────────────

export function analyzeProject(
  logline: string,
  opts: {
    title?: string;
    medium?: string;
    genre_hint?: string;
    budget_hint?: string;
    notes?: string;
  } = {},
): ProjectProfile {
  const text = `${logline} ${opts.notes || ""} ${opts.genre_hint || ""}`.toLowerCase();

  // Genre detection
  const genreScores: Record<string, number> = {};
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > 0) genreScores[genre] = score;
  }
  if (opts.genre_hint) {
    for (const genre of Object.keys(GENRE_KEYWORDS)) {
      if (opts.genre_hint.toLowerCase().includes(genre)) {
        genreScores[genre] = (genreScores[genre] || 0) + 10;
      }
    }
  }
  const sortedGenres = Object.entries(genreScores).sort((a, b) => b[1] - a[1]);
  const genre_primary = sortedGenres[0]?.[0] || "drama";
  const genre_secondary = sortedGenres.slice(1, 4).map(([g]) => g);

  // Tone detection
  const toneScores: Record<string, number> = {};
  for (const [tone, keywords] of Object.entries(TONE_KEYWORDS)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > 0) toneScores[tone] = score;
  }
  const tones = Object.entries(toneScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  // Budget
  let budget_tier = "mid";
  let estimated_budget_m = 12;
  if (opts.budget_hint) {
    for (const [tier, info] of Object.entries(BUDGET_TIERS)) {
      if (opts.budget_hint.toLowerCase().includes(tier) || info.keywords.some((kw) => opts.budget_hint!.toLowerCase().includes(kw))) {
        budget_tier = tier;
        estimated_budget_m = (info.range[0] + info.range[1]) / 2;
        break;
      }
    }
    const numMatch = opts.budget_hint.match(/(\d+)\s*[mM]/);
    if (numMatch) {
      estimated_budget_m = parseFloat(numMatch[1]);
      for (const [tier, info] of Object.entries(BUDGET_TIERS)) {
        if (estimated_budget_m >= info.range[0] && estimated_budget_m <= info.range[1]) {
          budget_tier = tier;
          break;
        }
      }
    }
  }

  // Themes
  const themeGenres = ["social-issue", "coming-of-age", "lgbtq", "faith-based", "biopic"];
  const themes = themeGenres.filter((g) => g in genreScores);

  return {
    title: opts.title || "",
    logline,
    genre_primary,
    genre_secondary,
    tone: tones.length ? tones : ["commercial"],
    medium: opts.medium || "feature_film",
    estimated_budget_m,
    budget_tier,
    themes,
  };
}

// ─── Scoring ────────────────────────────────────────────────────────

function scoreCompany(project: ProjectProfile, company: Company): CompanyMatch {
  let score = 0;
  const reasons: string[] = [];
  const warnings: string[] = [];

  // 1. Genre fit (0-30)
  const companyGenres = company.genres.map((g) => g.toLowerCase());
  if (project.genre_primary && companyGenres.includes(project.genre_primary.toLowerCase())) {
    score += 20;
    reasons.push(`Primary genre match: ${project.genre_primary}`);
  }
  const secMatches = project.genre_secondary.filter((g) => companyGenres.includes(g.toLowerCase()));
  score += secMatches.length * 5;
  if (secMatches.length) reasons.push(`Genre overlap: ${secMatches.join(", ")}`);

  const themeMatches = project.themes.filter((t) => companyGenres.includes(t.toLowerCase()));
  score += themeMatches.length * 3;
  if (themeMatches.length) reasons.push(`Thematic alignment: ${themeMatches.join(", ")}`);

  // 2. Tone fit (0-21)
  const companyTones = company.tone_profile.map((t) => t.toLowerCase());
  const toneMatches = project.tone.filter((t) => companyTones.includes(t.toLowerCase()));
  score += toneMatches.length * 7;
  if (toneMatches.length) reasons.push(`Tone match: ${toneMatches.join(", ")}`);

  // 3. Medium fit
  const companyMediums = company.medium.map((m) => m.toLowerCase());
  if (!companyMediums.includes(project.medium.toLowerCase())) {
    score -= 50;
    warnings.push(`Medium mismatch: you want ${project.medium.replace(/_/g, " ")}, they focus on ${company.medium.map((m) => m.replace(/_/g, " ")).join(", ")}`);
  } else {
    score += 10;
    reasons.push(`Produces ${project.medium.replace(/_/g, " ")}s`);
  }

  // 4. Budget fit (0-15)
  const minB = company.budget_range?.min_m ?? 0;
  const maxB = company.budget_range?.max_m ?? 999;
  if (project.estimated_budget_m >= minB && project.estimated_budget_m <= maxB) {
    score += 15;
    reasons.push(`Budget fits their range ($${minB}M–$${maxB}M)`);
  } else if (project.estimated_budget_m < minB) {
    score -= Math.min((minB - project.estimated_budget_m) * 2, 20);
    warnings.push(`Your est. budget ($${project.estimated_budget_m}M) is below their typical range ($${minB}M–$${maxB}M)`);
  } else {
    score -= Math.min(project.estimated_budget_m - maxB, 20);
    warnings.push(`Your est. budget ($${project.estimated_budget_m}M) exceeds their range ($${minB}M–$${maxB}M)`);
  }

  // 5. Slate conflict check
  for (const proj of company.current_development_slate || []) {
    const slateLogline = typeof proj === "string" ? proj.toLowerCase() : (proj.logline || "").toLowerCase();
    const projectWords = new Set(project.logline.toLowerCase().split(/\s+/));
    const slateWords = new Set(slateLogline.split(/\s+/));
    const stopWords = new Set(["a", "the", "in", "of", "and", "to", "is", "who", "that", "with", "for", "on", "at"]);
    const overlap = Array.from(projectWords).filter((w) => slateWords.has(w) && !stopWords.has(w));
    if (overlap.length >= 4) {
      score -= 30;
      const conflictTitle = typeof proj === "string" ? proj.slice(0, 50) : proj.title;
      warnings.push(`Potential slate conflict: "${conflictTitle}" — similar concept in development`);
    }
  }

  // 6. Diversity alignment
  if (company.diversity_focus && project.themes.some((t) => ["social-issue", "lgbtq"].includes(t))) {
    score += 5;
    reasons.push("Diversity-focused company aligns with project themes");
  }

  // 7. Recent credits relevance
  for (const credit of company.recent_credits || []) {
    if (project.genre_primary && (credit.genre || "").toLowerCase().includes(project.genre_primary.toLowerCase())) {
      score += 3;
      reasons.push(`Recently produced: ${credit.title} (${credit.year})`);
      break;
    }
  }

  // 8. Open submissions bonus
  if (company.open_to_unsolicited) {
    score += 5;
    reasons.push("Accepts unsolicited submissions");
  }

  const keyPerson = company.key_people?.[0];

  return {
    company_id: company.id,
    company_name: company.name,
    score: Math.max(score, 0),
    reasons,
    warnings,
    submission_path: company.submission_notes || "Query through representation",
    key_contact: keyPerson ? `${keyPerson.name} (${keyPerson.title})` : "",
    website: company.website || "",
    genres: company.genres,
    tone_profile: company.tone_profile,
    budget_range: company.budget_range,
  };
}

// ─── Public API ─────────────────────────────────────────────────────

export function getCompanyMatches(project: ProjectProfile, topN = 5): CompanyMatch[] {
  const companies = (companiesData as Company[]).filter((c) => c.status === "active");
  const matches = companies.map((c) => scoreCompany(project, c));
  matches.sort((a, b) => b.score - a.score);
  return matches.filter((m) => m.score > 0).slice(0, topN);
}

/**
 * High-level convenience: pass logline + opts, get matches back.
 */
export function matchScript(
  logline: string,
  opts: {
    title?: string;
    medium?: string;
    genre_hint?: string;
    budget_hint?: string;
    notes?: string;
    top_n?: number;
  } = {},
): { profile: ProjectProfile; matches: CompanyMatch[] } {
  const profile = analyzeProject(logline, opts);
  const matches = getCompanyMatches(profile, opts.top_n ?? 5);
  return { profile, matches };
}
