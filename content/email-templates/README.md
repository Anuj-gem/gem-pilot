# Email templates

Source-of-truth copy for GEM's email templates. Each `.md` file is the
*current* version — Subject, HtmlBody, TextBody — kept in repo for
version control. Postmark is the live system; update both when copy changes.

Deploy all templates to Postmark:
```
node scripts/deploy-postmark-templates.mjs          # deploy all
node scripts/deploy-postmark-templates.mjs --dry     # preview changes
node scripts/deploy-postmark-templates.mjs --alias=post_signup  # one template
```

## Transactional templates (Postmark aliases)

| File | Alias | Trigger | Variables |
|---|---|---|---|
| `post_signup.md` | `post_signup` | OAuth callback / `/api/send-welcome` | `{{first_name}}` |
| `post_submission_free.md` | `post_submission_free` | Eval completes, free writer | `{{first_name}}`, `{{title}}`, `{{report_url}}`, `{{match_count}}` |
| `post_submission_pro.md` | `post_submission_pro` | Eval completes, Pro writer | `{{first_name}}`, `{{title}}`, `{{report_url}}`, `{{match_count}}` |
| `post_upgrade.md` | `post_upgrade` | Stripe checkout completed | `{{first_name}}` |

## Drip sequence — has submission (trial → Pro conversion)

Sent to free users who have completed at least one evaluation but
haven't upgraded. Triggered by time since first eval completion.

| File | Timing | Purpose | Variables |
|---|---|---|---|
| `drip_24h.md` | 24 hours after first eval | Match count nudge | `{{first_name}}`, `{{match_count}}` |
| `drip_72h.md` | 72 hours | Value prop — why GEM vs. contests/queries | `{{first_name}}` |
| `drip_7d.md` | 7 days | New opportunities hook | `{{first_name}}` |
| `drip_14d.md` | 14 days | Final Pro push — $20/mo vs. contest entry | `{{first_name}}` |

## Drip sequence — no submission (signup → first upload)

Sent to users who signed up but never uploaded a screenplay.
Triggered by time since account creation, with no submissions.

| File | Timing | Purpose | Variables |
|---|---|---|---|
| `drip_24h_nosub.md` | 24 hours after signup | Nudge to upload — free eval waiting | `{{first_name}}` |
| `drip_72h_nosub.md` | 72 hours | Walk through what happens when you submit | `{{first_name}}` |
| `drip_7d_nosub.md` | 7 days | Live opportunity count — upload to see matches | `{{first_name}}`, `{{match_count}}` |
| `drip_14d_nosub.md` | 14 days | Last nudge — free eval, no credit card | `{{first_name}}` |

Drip sends via broadcast stream.

## Broadcast templates

| File | Trigger | Variables |
|---|---|---|
| `new_opportunity_broadcast.md` | New opportunity added to GEM | `{{opportunity_title}}`, `{{format}}`, `{{genres}}`, `{{budget}}`, `{{tags}}`, `{{description}}`, `{{opportunity_url}}` |
| `opportunities_announcement.md` | One-time announcement | (legacy) |
| `trial_opportunities_personal.md` | Personalized trial user push | (per-user match data) |

## Format

Each file has three sections fenced by HTML comments:

```
<!-- SUBJECT -->
…subject line…

<!-- HTML -->
…HTML body (Mustache vars OK)…

<!-- TEXT -->
…plain-text fallback…
```

## Conventions

- **Short.** One headline, one primary CTA, one sub-link.
- **Brand colors.** Accent purple `#7C3AED`; dark text `#1C1917`; borders `#E7E5E4`. Inline styles only.
- **Buttons:** `display:inline-block; padding:12px 22px; border-radius:10px; background:#7C3AED; color:#fff; font-weight:600;`
- **From:** `Anuj from GEM <anuj@gem.studio>` (set in `src/lib/email.ts`).
- **No "AI" in copy.** Never use "AI" in any email. GEM reads/evaluates/matches — don't explain how.
- **No "leaderboard."** Say "Discover" if referencing the public page.
