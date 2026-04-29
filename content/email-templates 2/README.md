# Email templates

Source-of-truth copy for the four Postmark transactional templates GEM
sends. Each `.md` file here is the *current* version of a Postmark
template — Subject, HtmlBody, TextBody — kept in repo for version
control and review.

Postmark itself is the live system; these files are the canonical copy.
Whenever the copy changes here, paste into Postmark too.

## Templates

| File | Postmark alias | Trigger | Variables |
|---|---|---|---|
| `post_signup.md` | `post_signup` | OAuth callback or `/api/send-welcome` after a writer signs up | `{{first_name}}` |
| `post_submission_free.md` | `post_submission_free` | `/api/evaluate` or `/api/score-submission` after a free writer's eval completes | `{{first_name}}`, `{{title}}`, `{{report_url}}` |
| `post_submission_pro.md` | `post_submission_pro` | Same triggers as above, when the writer is Pro | `{{first_name}}`, `{{title}}`, `{{report_url}}` |
| `post_upgrade.md` | `post_upgrade` | `/api/stripe/webhook` after `checkout.session.completed`, or `/api/send-upgrade-email` | `{{first_name}}` |

## Postmark template format

Each file is split into three sections, fenced by HTML comments:

```
<!-- SUBJECT -->
…subject line…

<!-- HTML -->
…HTML body (Mustache vars OK)…

<!-- TEXT -->
…plain-text body fallback…
```

Variables use Mustache: `{{first_name}}`, `{{title}}`, `{{report_url}}`.

The send is wired by alias (not template ID) in `src/lib/email.ts`. As
long as the alias matches, copy changes in Postmark deploy instantly —
no code change required.

## Conventions

- **Boom-boom-boom.** Transactional emails are short. One headline, one
  primary CTA, one sub-link to the blog if relevant.
- **Brand colors.** Accent purple is `#7C3AED`; dark text is `#1C1917`;
  borders/dividers are `#E7E5E4`. Inline-style only — Postmark
  recipients render in clients that strip `<style>` tags.
- **Buttons** are styled inline `<a>` tags with `display:inline-block;
  padding: 12px 22px; border-radius: 10px; background: #7C3AED;
  color: #fff; font-weight: 600;`.
- **From** is set globally in `src/lib/email.ts` to
  `Anuj from GEM <anuj@gem.studio>`. **Reply-To** is `anuj@gem.studio`.
  Don't override per-template unless you have a reason (the
  producer→writer intro overrides Reply-To).
- **Blog sub-link** at the bottom is a soft secondary CTA — small font,
  underline, never a button.
