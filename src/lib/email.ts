/**
 * Transactional email via Postmark templates.
 *
 * Usage:
 *   await sendEmail('post_signup', 'user@example.com', { first_name: 'Anuj' })
 *
 * Templates are managed in Postmark dashboard. Aliases must match exactly.
 * Idempotent via email_outbox dedupe (template_alias + dedupe_key).
 */

const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN!
const FROM_EMAIL = 'Anuj from GEM <anuj@gem.studio>'
const REPLY_TO = 'anuj@gem.studio'
const STREAM = 'outbound'

export type TemplateAlias =
  | 'post_signup'
  | 'post_submission_free'
  | 'post_submission_pro'
  | 'post_upgrade'

interface SendEmailOptions {
  templateAlias: TemplateAlias
  to: string
  variables: Record<string, string>
  /** Unique key per-email. Same (templateAlias, dedupeKey) = skip. */
  dedupeKey?: string
  tag?: string
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
        ReplyTo: REPLY_TO,
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
    return false
  } catch (err) {
    console.error(`[email] Exception sending ${opts.templateAlias}:`, err)
    // If we claimed but threw before update, the row sits in 'pending' — that's
    // the correct outcome: it blocks retries until someone investigates.
    return false
  }
}
