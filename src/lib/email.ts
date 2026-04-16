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
 * Fire-and-forget email sender. Logs to email_outbox for deduplication.
 * Swallows errors so it never breaks the calling flow.
 */
export async function sendEmail(
  opts: SendEmailOptions,
  supabase?: any
): Promise<boolean> {
  try {
    // 1. Dedupe check via email_outbox
    if (opts.dedupeKey && supabase) {
      const { data: existing } = await supabase
        .from('email_outbox')
        .select('id')
        .eq('template_alias', opts.templateAlias)
        .eq('dedupe_key', opts.dedupeKey)
        .limit(1)
        .single()

      if (existing) {
        console.log(`[email] Skipping ${opts.templateAlias} for ${opts.to} — already sent (dedupe: ${opts.dedupeKey})`)
        return false
      }
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

    if (res.ok && json.MessageID) {
      console.log(`[email] Sent ${opts.templateAlias} to ${opts.to} (MessageID: ${json.MessageID})`)

      // 3. Log to email_outbox
      if (supabase) {
        await supabase.from('email_outbox').insert({
          template_alias: opts.templateAlias,
          dedupe_key: opts.dedupeKey ?? null,
          to_email: opts.to,
          message_id: json.MessageID,
          status: 'sent',
        }).then(() => {}).catch((err: any) => {
          // Non-fatal — dedupe index will prevent true duplicates
          console.error('[email] email_outbox insert failed:', err)
        })
      }

      return true
    } else {
      console.error(`[email] Postmark error for ${opts.templateAlias}:`, json)

      if (supabase) {
        await supabase.from('email_outbox').insert({
          template_alias: opts.templateAlias,
          dedupe_key: opts.dedupeKey ?? null,
          to_email: opts.to,
          message_id: null,
          status: 'failed',
          error_message: JSON.stringify(json).slice(0, 500),
        }).catch(() => {})
      }

      return false
    }
  } catch (err) {
    console.error(`[email] Exception sending ${opts.templateAlias}:`, err)
    return false
  }
}
