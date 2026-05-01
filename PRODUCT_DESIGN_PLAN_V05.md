# GEM v0.5 — Product & Design Plan

> Authored 2026-04-29. Spans the next major iteration of GEM as the **status
> platform for screenwriters**. The bones (profile + reviews + invites +
> follows + Discover + dashboard feed) are now in place. This doc covers
> what every page does, every card exposes, and how the system trains
> behavior.

---

## 1. The behavioral spine

Everything in v0.5 is in service of training four behaviors:

| Behavior                       | Where it shows up                              |
|--------------------------------|------------------------------------------------|
| Publish more public scripts    | Profile + Discover + Following feed            |
| Get higher Selznick scores     | Score badges on every script surface           |
| Receive more peer reviews      | Review counts on cards + "Most reviewed" rank  |
| Give more peer reviews         | Reviewer status tier + "Reviews given" counter |

Secondary (compound) behaviors that follow from these:

- Follow more writers (because the feed gets richer)
- Engage with reviews (because notifications surface them)
- Refine drafts (because score history exposes growth)

---

## 2. Status surfaces — what we measure + display

Three categories of status object:

**Per-writer (aggregate)**
- Followers count
- Following count
- Public scripts ("Published") count
- Total reviews received
- Total reviews given
- Average Selznick score across published scripts
- Top Selznick score
- Activity streak (weeks active in last 8)

**Per-script**
- Selznick score + tier (already)
- Number of peer reviews
- Average peer score
- Date published
- Format / declared budget tier
- Reviewer attention (who reviewed it — names + handles + scores)

**Per-reviewer (mirror of writer track)**
- Reviews given count
- Average review-quality rating (Selznick-rated peer Reads, future)
- Reviewer tier (Active Reviewer / Top Reviewer / Industry Reader — future)

These are the numbers a writer chases. Every card in the app should make
at least one of them visible.

---

## 3. Page-by-page

### 3.1 `/dashboard` (logged-in home)

Already in place. Sections in order:

1. **Profile hero** (avatar + name + handle + headline + 3 stat chips: Followers / Reviews / Published)
2. **Action needed** (review invites + recent reviews on your scripts)
3. **Your scripts** (5 most recent, View all expands; filterable later by Most Recent / Top Score / Most Reviewed)
4. **Following feed** (publishes + reviews from people you follow)
5. **Discover preview** (3 top-scoring public scripts + "All scripts →")

**v0.5 adds:**
- Follower-count change indicator: "+2 since you last visited"
- Score-history sparkline next to "Top score" stat chip (if 3+ scripts)
- Suggested writers strip (3 writers in your lane) at bottom

### 3.2 `/w/[handle]` (public writer profile)

Already in place. Sections:

1. **Header card** (avatar + name + @handle + headline + bio + IMDb link + Follow button)
2. **Stats grid** (Followers / Following / Scripts / Top score / Reviews)
3. **Public scripts** (clickable cards → reports)
4. **Reviews written** (clickable cards → that script's report)

**v0.5 adds:**
- Tabs at top of content: **Scripts** · **Reviews written** · **Followers** · **Following**
- "Most reviewed" highlight: writer's most-reviewed script gets a small "★ 12 reviews" badge
- Activity row under header: "Last published: 3 days ago · Last review given: yesterday"
- Score trajectory mini-chart if 3+ public scripts (line going up = "Rising" badge)

### 3.3 `/report/[id]` (script report)

Already in place. Adds for v0.5:

- **Writer card** at top (already done — the small WriterCard)
- **Peer review count + average** prominent next to Selznick score
- **Review CTA** more prominent (currently a small button in the section header → make it a fixed bottom-right floating card on desktop, sticky bottom bar on mobile)
- **"Was this script suggested to you?" chip** showing referral path (e.g., "Found via @lukas-oden's review") if applicable
- Better script-share affordance — "Share this report" button at top right that copies a clean link

### 3.4 `/discover` (community surface)

Currently: prolific writers + recent posts. **v0.5 expands into a real leaderboard surface.**

Layout (desktop):

```
┌─────────────────┬───────────────────────────────────────┐
│ Top tabs        │ This week / This month / All time     │
├─────────────────┼───────────────────────────────────────┤
│ Most prolific   │ Featured row                          │
│ writers (10)    │ Top scoring script · Most reviewed    │
│                 │ this week (with full preview cards)   │
│ Top reviewers   ├───────────────────────────────────────┤
│ (10)            │ Recent posts (paginated, infinite)    │
│                 │   [Card] [Card] [Card]                │
│ Rising writers  │   [Card] [Card] [Card]                │
│ (10)            │                                       │
└─────────────────┴───────────────────────────────────────┘
```

Sidebar leaderboards:

- **Most prolific** — by # of public scripts (already)
- **Top reviewers** — by # quality reviews given
- **Rising** — biggest score-trajectory increase last 30 days

Main column:

- **Featured row** — one big "Top this week" card + one big "Most reviewed this week" card
- **Recent feed** — chronological flow of new public scripts

Filters across top: format (feature/series), genre, lane (budget tier).

### 3.5 `/following` (your follows list)

Already in place. Adds for v0.5:

- "Followers" tab (people who follow YOU)
- Search/filter for finding writers in your follows
- Last-active indicator next to each name

### 3.6 `/profile` (edit)

Already in place. Adds:

- **Theme preference** (light/dark/system)
- **Notification preferences** (email me when: I get a review, someone follows me, my invite is accepted, my script gets viewed by industry)
- **Account deletion** (compliance)

### 3.7 `/review/[id]` (write a review)

Already in place. Adds:

- Show the writer's headline + handle + avatar at top (we have it; reuse WriterCard at full size)
- Show "previous reviews on this script" inline so reviewer sees what others said
- Save-as-draft (auto-save every 10 sec)

### 3.8 NEW: `/w/[handle]/reviews` 

Dedicated page for "all reviews this writer has given" — currently inline-on-profile-but-truncated. Useful for Top Reviewers whose review log is their portfolio.

### 3.9 NEW: `/leaderboard` (or merge into /discover with tabs)

Dedicated leaderboard surface:

- Top 100 writers by composite score (avg score × log(review count) × log(follower count + 1))
- Top 100 scripts this week / month / all time
- Top reviewers
- Most-followed writers

Updates daily.

---

## 4. Reusable card components

We have a fragmented set today. Consolidate into a small kit:

**`<ScriptCard>`**
- Used on: dashboard feed, /w/[handle] portfolio, /discover recent, /following feed
- Props: title, score, tier, format, writer (handle, name), review_count, published_at, density (compact|full)
- Compact (~64px tall): score badge + title + writer · format
- Full (~120px tall): + headline preview + review count + posted-X-ago

**`<WriterCard>`**
- Used on: review bylines, follow lists, suggested writers
- Props: avatar, name, handle, headline, follower_count?, follow_button?
- Three sizes: xs (just avatar+name), sm (avatar+name+handle), lg (full card with stats)

**`<ReviewCard>`**
- Used on: report page, profile page, feed
- Props: reviewer (writer card data), score, body, suggestion, created_at, script_link
- Always shows reviewer card at top, score badge top-right, body, optional suggestion in a separated section

**`<FeedItem>`**
- Used on: dashboard feed, /following feed
- Props: actor (writer card), verb, timestamp, embedded_card (script or review)
- Avatar | actor + verb + timestamp | embedded card below

**`<StatChip>`**
- Used on: profile heroes, dashboard, discover sidebar
- Props: label, value, delta?, sparkline?

**`<FollowButton>`** — done, keep

**`<ScoreBadge>`**
- Used everywhere a score appears
- Props: score, size (xs|sm|md|lg), tier?
- Brand purple gradient, white score text, optional tier underneath

A single `cards/index.tsx` exports all of these. Every page uses them.
No more bespoke score-circle styling per page.

---

## 5. Navigation

**Top nav (desktop):**

```
[GEM]   Home   Discover   Submit                    [+ New script]  [Avatar ▾]
```

Avatar dropdown:
- Your profile (`/w/{handle}`)
- Edit profile (`/profile`)
- Following (`/following`)
- Settings
- Sign out

**Mobile:**

- Top bar: GEM logo + Avatar + hamburger
- Bottom tab bar: Home · Discover · [+ Submit (raised)] · Profile

(Bottom tabs are the killer mobile pattern — one-thumb access to the four
core surfaces.)

---

## 6. Mobile-specific

| Surface       | Desktop                              | Mobile                                |
|---------------|--------------------------------------|---------------------------------------|
| Dashboard     | 3-column max width 720px             | Single column, full bleed             |
| Profile hero  | Avatar left, stats inline right      | Avatar centered, stats below          |
| Discover      | Sidebar + main column                | Stacked: sidebar above main           |
| Script card   | Score + title + meta + action        | Same compact, action becomes tap      |
| Feed item     | Avatar + actor + embedded card       | Avatar smaller, no embedded preview   |
| Review form   | Score slider + textareas             | Same, with sticky submit button       |
| Top nav       | Full inline                          | Hamburger; bottom tab bar replaces it |

Touch targets: every tappable element ≥ 44pt. Score badges that double as
links must be at least 44×44.

---

## 7. Information we currently hide that we should expose

In rough priority:

1. **Per-script peer-review count** — show on every script card everywhere. Currently only on report page.
2. **Average peer score per script** — cool number to flex; sits next to Selznick score on cards.
3. **Activity recency on profiles** — "Last published 3 days ago" / "Last review given yesterday" — proves a writer is alive.
4. **Score trajectory** — small sparkline on profile if writer has 3+ scripts; powers the "Rising" badge.
5. **Reviewer attention on a script** — show first 3 reviewer avatars under the score on report page ("Reviewed by ●●●").
6. **Industry reads** — once we restore producer/lit-rep view tracking, expose "X industry views" on writer-side.
7. **Followers since last visit** — "+2 new followers" indicator on dashboard.
8. **Trending in the last week** — week-over-week movement on Discover ("up 12 places").

Every additional number is a reason to come back tomorrow.

---

## 8. The design system token list

Codify what's already emerging:

- **Brand purple gradient**: `linear-gradient(135deg, #7c3aed, #a855f7)` — used for score badges, primary buttons, avatar fallbacks
- **Brand purple solid**: `#7c3aed` for accent text + interactive
- **Gold accent**: `#fbbf24` (or `#d4a017`) for "Headline" labels and trending markers
- **Body neutrals**: `#0f0f0f` (text primary), `#444` (text secondary), `#888` (muted), `#ececec` (borders), `#fafafa` (subtle bg), `#fff` (canvas)
- **Typography**: Georgia serif for content titles + script names; Inter / system sans for everything else
- **Section labels**: `text-[11px] font-bold tracking-[0.16em] uppercase text-gray-500`
- **Card borders**: `1px solid #ececec` (default), `1px solid #d8d4ff` (purple-tinted hover)
- **Card hover**: `bg-gray-50` or `bg-purple-50/40`
- **Border radius**: 8px (small), 10px (cards), 12px (containers), 999px (pills/avatars)

---

## 9. Build order — what ships when

**Phase A (1 week)** — Card consolidation + missing-info exposure:
- Build the cards/ kit (ScriptCard, WriterCard, ReviewCard, FeedItem, StatChip, ScoreBadge)
- Replace ad-hoc rendering across all pages with the kit
- Add per-script review count + avg peer score everywhere a script renders
- Add activity recency to profiles ("Last published X ago")

**Phase B (1 week)** — Discover + leaderboards:
- Discover: tabs (This week / Month / All time), filters (format/genre/lane), sidebar leaderboards (Prolific / Top Reviewers / Rising)
- Featured row (Top scoring this week + Most reviewed this week)
- Followers/Following tabs on profile

**Phase C (1 week)** — Engagement loops + mobile polish:
- Suggested writers (dashboard + profile)
- Followers-since-last-visit indicator
- Notifications preferences
- Mobile bottom tab bar
- Sticky review CTA on report page

**Phase D (1 week)** — Status compounding:
- Score trajectory chart on profile
- "Rising" / "Active Reviewer" / "Top Reviewer" badges
- /leaderboard page
- Auto-save drafts in /review form

---

## 10. What we're explicitly NOT building (yet)

- Posts / status updates (separate from scripts) — Reviews carry the social weight for now
- Comments on reviews — keep noise low
- DMs — email-out is enough until we have scale
- Notifications panel — preferences page only, push delivery is email
- Likes / hearts on cards — they cheapen reviews; reviews are the engagement signal
- Group / room features — let community emerge from follows + reviews first

---

## 11. Decisions (locked 2026-04-29)

1. **Privacy reframe — YES.** "Publish" = public to GEM members. Drop "industry" framing in writer-facing copy until producer side stabilizes.
2. **Community score — separate, not blended.** Display as "Community score: 88 (12 reviews)" next to Selznick on every script surface. Plain average of attributed peer scores. Over time, the gap between Selznick and Community is the training signal that surfaces where Selznick is wrong.
3. **Reviewer karma — NO. Killed entirely.** No earn/spend system. Engagement is intrinsic.
4. **Featured / GEM Picks — NO for now.** Algorithmic only (top score, most reviewed). Manual curation comes later if needed.
5. **Anonymous reviews — NO.** Every review is attributed. The signal IS the reviewer's identity.

## 12. The review-request flow (added 2026-04-29)

Two-sided review request:

**Writer-initiated (today):** Writer hits "Invite reviewer" on their report → enters email → reviewer gets magic link, signs up if needed, writes review.

**Writer-requests-from-existing-reviewer (NEW for v0.5):**
- Writer browses Discover or another writer's profile.
- On any GEM user's profile, writer can hit "Request review from {writer}" → modal → optional note → submit.
- Target user gets a "X requested you review their script Y" notification (in-app + email).
- Target user approves or declines from their dashboard's Action-needed strip.
- On approve, target user gets reviewer access to that script + standard review flow.

This formalizes the "Lucas comes across someone interesting and asks for a read" pattern. Permission-gated end-to-end — no anonymous sniping, no karma games. The act of asking is itself an engagement signal.

## 13. The community-score wedge

The behavioral payoff for the whole platform:

> Your Selznick is 75. Your peer reviews average 92 across 12 reviewers. So either Selznick is wrong about your script, or you have 12 friends. The platform makes the answer visible. Go get more reviews.

Implications:
- Every script card shows BOTH numbers when ≥3 peer reviews exist.
- Profile averages are ALWAYS the community score (not Selznick) once enough reviews exist — your status is what your peers say, not what the AI said.
- Discover sort options: "Top Selznick" / "Top Community" / "Most reviewed" — community score is a first-class sort.
- Big delta = "Selznick / Community gap: +17" badge on the script — this is shareable Twitter content.
