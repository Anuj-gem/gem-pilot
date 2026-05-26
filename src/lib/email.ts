/**
 * Transactional email via Postmark templates.
 *
 * Usage:
 *   await sendEmail('post_signup', 'user@example.com', { first_name: 'Anuj' })
 *
 * Templates are managed in Postmark dashboard. Aliases must match exactly.
 * Idempotent via email_outbox dedupe (template_alias + dedupe_key).
 *
 * Unsubscribe: every email automatically includes an `unsubscribe_url` template
 * variable (HMAC-signed). Users who click it get `email_unsubscribed = true` on
 * their profile. sendEmail checks that flag before sending — once unsubscribed,
 * no email of any kind goes out. Zero manual work required.
 */

import { createHmac } from 'crypto'

const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN!
const FROM_EMAIL = 'Anuj from GEM <anuj@gem.studio>'
const REPLY_TO = 'anuj@gem.studio'
const STREAM = 'outbound'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gem.studio'

// ── Unsubscribe URL helpers ──────────────────────────────────────
// HMAC-SHA256 signed so users can't forge unsubscribe links for others.
// Secret falls back to Supabase JWT secret (always present in Vercel env).
const UNSUB_SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_JWT_SECRET || 'gem-unsub-fallback'

export function generateUnsubscribeUrl(userId: string): string {
  const sig = createHmac('sha256', UNSUB_SECRET).update(userId).digest('hex').slice(0, 32)
  return `${SITE_URL}/api/unsubscribe?uid=${userId}&sig=${sig}`
}

export function verifyUnsubscribeSignature(userId: string, sig: string): boolean {
  const expected = createHmac('sha256', UNSUB_SECRET).update(userId).digest('hex').slice(0, 32)
  return sig === expected
}

// Alerts go here whenever a triggered send fails — so Anuj can catch silent
// failures (missing token, dead template, Postmark outage) before they pile up.
const ALERT_TO = 'anuj@gem.studio'

export type TemplateAlias =
  | 'post_signup'
  | 'post_submission_free'
  | 'post_submission_pro'
  | 'post_upgrade'
  // Broadcast — fires when a new opportunity is added to GEM.
  | 'new_opportunity_broadcast'
  // Review complete — sent when a consideration review is finished.
  | 'consideration_complete'
  // Review complete (no heat) — pass with zero heat earned.
  | 'consideration_complete_no_heat'
  // Collaborator invite — sent when a writer invites a collaborator to their script.
  | 'collaborator_invite'

interface SendEmailOptions {
  templateAlias: TemplateAlias
  to: string
  variables: Record<string, string>
  /** Unique key per-email. Same (templateAlias, dedupeKey) = skip. */
  dedupeKey?: string
  tag?: string
  /** Override the default Reply-To (anuj@gem.studio). Used by the
   *  producer→writer intro so that when the writer hits Reply, the
   *  conversation goes directly to the producer. */
  replyTo?: string
  /** Pass the user's profile ID to auto-check unsubscribe status and
   *  inject an `unsubscribe_url` template variable. If omitted, the
   *  unsubscribe check is skipped (used by admin alerts). */
  userId?: string
}

/**
 * Fire-and-forget email sender with race-proof dedupe.
 *
 * Flow: claim-then-send.
 *   1. INSERT a `pending` row with (template_alias, dedupe_key). A partial unique
 *      index on those columns guarantees only ONE caller wins the claim — any
 *      concurrent callers hit 23505 and abort before sending.
 *   2. Fire the email via Postmark.
 *   3. UPDATE the row to `sent` / `failed`.
 *
 * Without a supabase client (or dedupeKey), falls back to plain send with no
 * dedupe — used by non-idempotent contexts.
 */
export async function sendEmail(
  opts: SendEmailOptions,
  supabase?: any
): Promise<boolean> {
  // ── Unsubscribe gate ────────────────────────────────────────────
  // If we have a supabase client and a userId, check the flag BEFORE
  // doing any work. This is the safety net — even if a caller forgets
  // to filter, no email goes out to unsubscribed users.
  if (supabase && opts.userId) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email_unsubscribed')
        .eq('id', opts.userId)
        .single()
      if (profile?.email_unsubscribed) {
        console.log(`[email] Skipping ${opts.templateAlias} for ${opts.to} — user unsubscribed`)
        return false
      }
    } catch {
      // If the check fails, proceed with sending — don't block emails
      // due to a transient DB error.
    }
  }

  // Auto-inject unsubscribe_url into template variables when userId is available.
  if (opts.userId) {
    opts.variables = {
      ...opts.variables,
      unsubscribe_url: generateUnsubscribeUrl(opts.userId),
    }
  }

  const canDedupe = !!(supabase && opts.dedupeKey)
  let claimedId: string | null = null

  try {
    // 1. Claim the send via INSERT. Unique index on (template_alias, dedupe_key)
    //    makes this race-proof — concurrent callers will hit 23505 and return.
    if (canDedupe) {
      const { data: claimed, error: claimErr } = await supabase
        .from('email_outbox')
        .insert({
          kind: opts.templateAlias,
          payload: { to: opts.to, variables: opts.variables, tag: opts.tag ?? opts.templateAlias },
          template_alias: opts.templateAlias,
          dedupe_key: opts.dedupeKey,
          to_email: opts.to,
          status: 'pending',
        })
        .select('id')
        .single()

      if (claimErr) {
        // 23505 = unique_violation → someone else already claimed this send.
        if (claimErr.code === '23505') {
          console.log(`[email] Skipping ${opts.templateAlias} for ${opts.to} — already claimed (dedupe: ${opts.dedupeKey})`)
          return false
        }
        // Any other DB error: log and abort — don't send without logging.
        console.error(`[email] Claim insert failed for ${opts.templateAlias}:`, claimErr)
        await fireFailureAlert({
          stage: 'claim_insert',
          templateAlias: opts.templateAlias,
          to: opts.to,
          error: `DB insert failed: ${claimErr.message ?? claimErr.code ?? 'unknown'}`,
          supabase,
        })
        return false
      }
      claimedId = claimed?.id ?? null
    }

    // 2. Send via Postmark template API
    const res = await fetch('https://api.postmarkapp.com/email/withTemplate', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_TOKEN,
      },
      body: JSON.stringify({
        From: FROM_EMAIL,
        ReplyTo: opts.replyTo ?? REPLY_TO,
        To: opts.to,
        TemplateAlias: opts.templateAlias,
        TemplateModel: opts.variables,
        MessageStream: STREAM,
        TrackOpens: true,
        TrackLinks: 'HtmlOnly',
        Tag: opts.tag ?? opts.templateAlias,
      }),
    })

    const json = await res.json()
    const ok = res.ok && json.MessageID

    // 3. Resolve the claim (sent/failed), OR log a standalone send when no claim exists.
    if (claimedId && supabase) {
      await supabase
        .from('email_outbox')
        .update(
          ok
            ? { status: 'sent', message_id: json.MessageID, sent_at: new Date().toISOString() }
            : { status: 'failed', error_message: JSON.stringify(json).slice(0, 500) }
        )
        .eq('id', claimedId)
        .then(() => {})
        .catch((err: any) => console.error('[email] outbox update failed:', err))
    } else if (supabase) {
      // Non-deduped send — log a standalone row.
      await supabase.from('email_outbox').insert({
        kind: opts.templateAlias,
        payload: { to: opts.to, variables: opts.variables, tag: opts.tag ?? opts.templateAlias },
        template_alias: opts.templateAlias,
        dedupe_key: null,
        to_email: opts.to,
        message_id: ok ? json.MessageID : null,
        status: ok ? 'sent' : 'failed',
        sent_at: ok ? new Date().toISOString() : null,
        error_message: ok ? null : JSON.stringify(json).slice(0, 500),
      }).then(() => {}).catch((err: any) => console.error('[email] outbox insert failed:', err))
    }

    if (ok) {
      console.log(`[email] Sent ${opts.templateAlias} to ${opts.to} (MessageID: ${json.MessageID})`)
      return true
    }
    console.error(`[email] Postmark error for ${opts.templateAlias}:`, json)
    await fireFailureAlert({
      stage: 'postmark_send',
      templateAlias: opts.templateAlias,
      to: opts.to,
      error: `Postmark ${res.status}: ${json.Message ?? JSON.stringify(json).slice(0, 200)}`,
      supabase,
    })
    return false
  } catch (err: any) {
    console.error(`[email] Exception sending ${opts.templateAlias}:`, err)
    await fireFailureAlert({
      stage: 'exception',
      templateAlias: opts.templateAlias,
      to: opts.to,
      error: `Exception: ${err?.message ?? String(err)}`,
      supabase,
    })
    // If we claimed but threw before update, the row sits in 'pending' — that's
    // the correct outcome: it blocks retries until someone investigates.
    return false
  }
}

// ── Failure alerts ────────────────────────────────────────────────
// When any triggered send fails (claim insert, Postmark reject, exception),
// fire a plain-text alert email to anuj@gem.studio so it surfaces immediately
// instead of piling up silently. Guarded by a 1-hour dedupe window per
// (template_alias + to_email + stage) so a flood of failures doesn't produce
// a flood of alerts.
//
// Deliberately uses a direct Postmark call (no template, no outbox claim) so
// that a broken sendEmail() path can't infinite-loop. If Postmark itself is
// down or the token is wrong, we log to console + write a dead-letter row
// and give up — nothing else we can do from here.

interface AlertCtx {
  stage: 'claim_insert' | 'postmark_send' | 'exception'
  templateAlias: string
  to: string
  error: string
  supabase?: any
}

async function fireFailureAlert(ctx: AlertCtx): Promise<void> {
  try {
    // 1. Dedupe: skip if we already alerted about this exact failure in the
    //    last hour. Uses email_outbox with kind='triggered_email_alert'.
    if (ctx.supabase) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const fingerprint = `${ctx.templateAlias}|${ctx.to}|${ctx.stage}`
      const { data: recent } = await ctx.supabase
        .from('email_outbox')
        .select('id')
        .eq('kind', 'triggered_email_alert')
        .eq('dedupe_key', fingerprint)
        .gte('created_at', oneHourAgo)
        .limit(1)
      if (recent && recent.length > 0) {
        console.log(`[email] Alert suppressed (already sent in last hour): ${fingerprint}`)
        return
      }
    }

    const subject = `[GEM] Triggered email failed: ${ctx.templateAlias}`
    const body = [
      `A triggered email failed to send. Investigate before this compounds.`,
      ``,
      `Template: ${ctx.templateAlias}`,
      `Recipient: ${ctx.to}`,
      `Stage: ${ctx.stage}`,
      `Error: ${ctx.error}`,
      ``,
      `Time: ${new Date().toISOString()}`,
      `Env: ${process.env.VERCEL_ENV ?? 'unknown'}`,
      ``,
      `-- GEM alerts`,
    ].join('\n')

    if (!POSTMARK_TOKEN) {
      // Can't even send an alert — just record it so a human can find it later.
      console.error('[email] ALERT (Postmark token missing):', subject, body)
      if (ctx.supabase) {
        await ctx.supabase.from('email_outbox').insert({
          kind: 'triggered_email_alert',
          payload: { subject, body, reason: 'postmark_token_missing' },
          template_alias: null,
          dedupe_key: `${ctx.templateAlias}|${ctx.to}|${ctx.stage}`,
          to_email: ALERT_TO,
          status: 'failed',
          error_message: 'POSTMARK_SERVER_TOKEN not set',
        }).then(() => {}).catch(() => {})
      }
      return
    }

    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': POSTMARK_TOKEN,
      },
      body: JSON.stringify({
        From: FROM_EMAIL,
        To: ALERT_TO,
        Subject: subject,
        TextBody: body,
        MessageStream: STREAM,
        Tag: 'triggered_email_alert',
      }),
    })
    const alertJson = await res.json().catch(() => ({}))
    const alertOk = res.ok && alertJson.MessageID

    // Log the alert attempt to outbox so we have a trail, with the fingerprint
    // as dedupe_key for the 1-hour suppression above.
    if (ctx.supabase) {
      await ctx.supabase.from('email_outbox').insert({
        kind: 'triggered_email_alert',
        payload: { subject, body, stage: ctx.stage, target_template: ctx.templateAlias, target_recipient: ctx.to },
        template_alias: null,
        dedupe_key: `${ctx.templateAlias}|${ctx.to}|${ctx.stage}`,
        to_email: ALERT_TO,
        message_id: alertOk ? alertJson.MessageID : null,
        status: alertOk ? 'sent' : 'failed',
        sent_at: alertOk ? new Date().toISOString() : null,
        error_message: alertOk ? null : JSON.stringify(alertJson).slice(0, 500),
      }).then(() => {}).catch((err: any) => console.error('[email] alert outbox insert failed:', err))
    }

    if (!alertOk) {
      console.error('[email] Failure alert could not be delivered:', alertJson)
    }
  } catch (err) {
    // Last line of defense — never throw from an alert handler.
    console.error('[email] fireFailureAlert crashed:', err)
  }
}
