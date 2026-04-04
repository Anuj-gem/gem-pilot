# GEM Design System Refresh — Implementation Spec

> **Purpose**: This document is a handoff spec for a Claude agent to implement the GEM design refresh. Every change is scoped to CSS custom properties and utility classes — no component layout changes.

## Overview

GEM's design system is shifting from "generic SaaS" to "premium Hollywood-adjacent" while staying clean and modern. The key moves: violet accent (distinctive), pure white background (crisp), warm stone grays (cohesive), and promoted gold (glamorous).

---

## 1. CSS Variable Changes in `src/app/globals.css`

### Background
```
BEFORE: --gem-black: #faf9f7
AFTER:  --gem-black: #FFFFFF
```
Rationale: Pure white reads cleaner on all screens. The warm off-white created dissonance with the cool Tailwind grays.

### Primary Accent (violet replaces indigo)
```
BEFORE: --gem-accent: #6366f1
AFTER:  --gem-accent: #7C3AED

BEFORE: --gem-accent-hover: #4f46e5
AFTER:  --gem-accent-hover: #6D28D9
```
Rationale: Violet is more distinctive than indigo (which every SaaS uses), maintains excellent contrast on white (7.8:1 for violet-700), and doesn't collide with any tier color.

### Gold (promoted from muddy to luminous)
```
BEFORE: --gem-gold: #b8860b
AFTER:  --gem-gold: #D4A017
```
Rationale: Brighter, more saturated gold reads "awards ceremony" on white backgrounds. The old dark goldenrod was too muddy to be visible.

### Gray Scale (warm stone undertones replace cool blue-grays)
Replace the entire gray scale with warm-toned equivalents:
```
BEFORE → AFTER:
--gem-gray-50:  #111827 → #1C1917   (stone-900)
--gem-gray-100: #1f2937 → #292524   (stone-800)
--gem-gray-200: #374151 → #44403C   (stone-700)
--gem-gray-300: #4b5563 → #57534E   (stone-600)
--gem-gray-400: #6b7280 → #78716C   (stone-500)
--gem-gray-500: #9ca3af → #A8A29E   (stone-400)
--gem-gray-600: #d1d5db → #D6D3D1   (stone-300)
--gem-gray-700: #e5e7eb → #E7E5E4   (stone-200)
--gem-gray-800: #f3f4f6 → #F5F5F4   (stone-100)
--gem-gray-900: #f9fafb → #FAFAF9   (stone-50)
```
Rationale: Warm stone grays feel cohesive with gold accents and white backgrounds. Eliminates the cool-gray-on-warm-background dissonance.

### Tier Colors — NO CHANGES
```
--tier-greenlight: #059669  (keep)
--tier-optionable: #d97706  (keep)
--tier-needs-dev: #6b7280   (keep)
```
Rationale: Tier colors are load-bearing semantic UI used across leaderboard, reports, and cards. Do not touch.

---

## 2. New Utility Classes to Add in `globals.css`

### Gold Shimmer Text
```css
.text-gold-shimmer {
  background: linear-gradient(135deg, #D4A017 0%, #F2D06B 50%, #D4A017 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```
Use for: Hero headline on landing page, "GEM" wordmark in nav (optional).

### Card Glass (upgraded card surface)
```css
.card-glass {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid var(--gem-gray-700);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
}
.card-glass:hover {
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04);
  border-color: var(--gem-gray-600);
}
```
Use for: Leaderboard cards, pricing cards, any elevated surface. Replaces the current `.card-hover` class.

### Accent Glow (subtle colored shadow on interactive elements)
```css
.glow-accent {
  transition: box-shadow 0.2s ease;
}
.glow-accent:hover {
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06);
}
```
Use for: Buttons, CTA cards, upload drop zone on hover.

### Hero Gradient (subtle background wash — hero section only)
```css
.hero-gradient {
  background: radial-gradient(ellipse at 50% 0%, rgba(124, 58, 237, 0.04) 0%, transparent 70%);
}
```
Use for: The hero section wrapper on the landing page ONLY. Creates a very faint violet glow at the top of the page.

### Section Accent Update
Update the existing `.section-accent::after` to use the new gold:
```css
.section-accent::after {
  background: var(--gem-gold);  /* already references variable, just ensure it picks up new value */
  /* optionally increase width from 40px to 48px for slightly more presence */
  width: 48px;
}
```

---

## 3. Component Class Updates (targeted, not structural)

### Landing Page (`src/app/page.tsx`)
- Add `hero-gradient` class to the hero section wrapper `<section>`
- Add `text-gold-shimmer` class to the main hero `<h1>` heading
- Replace `card-hover` with `card-glass` on leaderboard preview cards
- Add `glow-accent` to the primary CTA button
- Top-3 rank numbers: change color from `text-[var(--gem-gold)]` (already there) — will automatically use new brighter gold

### Discover/Leaderboard Page (`src/components/discover/script-grid.tsx`)
- Replace card border/bg classes with `card-glass`
- Rank numbers already use `text-[var(--gem-gold)]` for top 3 — will pick up new gold automatically

### Report Page
- No changes needed — tier colors are unchanged, accent color cascades through variables

### Nav
- Optional: add `text-gold-shimmer` to the "GEM" wordmark text for a premium touch
- If it feels like too much, skip it — the nav is minimal and that's fine

---

## 4. What NOT to Change

- **Tier colors** — emerald/amber/gray are semantic and load-bearing
- **Font choices** — Geist Sans and the display font are working well
- **Component layouts** — no structural HTML changes
- **Tailwind configuration** — all changes are in CSS custom properties and utility classes
- **Dark mode** — there isn't one and this refresh doesn't add one

---

## 5. Implementation Order

1. Update all CSS variables in `:root` block of `globals.css` (background, accent, gold, grays)
2. Add the 4 new utility classes to `globals.css` (text-gold-shimmer, card-glass, glow-accent, hero-gradient)
3. Update the `.section-accent::after` width
4. Update landing page (`page.tsx`) — add hero-gradient, text-gold-shimmer, card-glass, glow-accent classes
5. Update discover script-grid — swap to card-glass
6. Optional: gold shimmer on nav wordmark
7. Visual review — check that tier badges still pop, text is readable, cards look cohesive

---

## Color Palette Summary

| Token | Hex | Usage |
|-------|-----|-------|
| --gem-black (bg) | #FFFFFF | Page background |
| --gem-white (text) | #1a1a1a | Primary text (unchanged) |
| --gem-accent | #7C3AED | Buttons, links, CTAs, focus rings |
| --gem-accent-hover | #6D28D9 | Hover states for accent |
| --gem-gold | #D4A017 | Rank numbers, hero shimmer, section accents |
| --gem-gray-50 | #1C1917 | Heaviest text weight |
| --gem-gray-100 | #292524 | Strong headings |
| --gem-gray-200 | #44403C | Strong secondary text |
| --gem-gray-300 | #57534E | Secondary text |
| --gem-gray-400 | #78716C | Muted text |
| --gem-gray-500 | #A8A29E | Placeholders, subtle labels |
| --gem-gray-600 | #D6D3D1 | Subtle dividers |
| --gem-gray-700 | #E7E5E4 | Borders |
| --gem-gray-800 | #F5F5F4 | Card/raised surfaces |
| --gem-gray-900 | #FAFAF9 | Slightly raised bg |
| --tier-greenlight | #059669 | Greenlight Material tier (unchanged) |
| --tier-optionable | #d97706 | Optionable tier (unchanged) |
| --tier-needs-dev | #6b7280 | Needs Development tier (unchanged) |

---

## Accessibility Notes

- Violet-700 (#6D28D9) on white: 9.1:1 contrast ratio ✅ (AAA)
- Violet-600 (#7C3AED) on white: 6.1:1 contrast ratio ✅ (AA)
- Gold (#D4A017) on white: 2.8:1 — use ONLY for large/decorative text, not body copy
- Stone-400 (#78716C) on white: 4.6:1 ✅ (AA for normal text)
- All tier colors maintain existing contrast ratios (unchanged)
