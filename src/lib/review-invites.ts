// Helpers for the per-script review invite flow (Anuj 2026-04-29 v0.2).

import crypto from 'crypto'

const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN!
const FROM_EMAIL = 'Anuj from GEM <anuj@gem.studio>'
const REPLY_TO   = 'anuj@gem.studio'
const STREAM     = 'outbound'

export function generateInviteToken(): string {
  // 24 random bytes → 32-char base64url. URL-safe, hard to guess.
  return crypto.randomBytes(24).toString('base64url')
}

interface SendReviewInviteEmailArgs {
  to: string
  inviterName: string
  scriptTitle: string
  inviteUrl: string
  note?: string | null
}

/** Sends the "X invited you to review their script" email via Postmark.
 *  Uses the raw /email endpoint (not /email/withTemplate) so we don't need
 *  a Postmark template provisioned for this v0.2 build. */
export async function sendReviewInviteEmail({
  to, inviterName, scriptTitle, inviteUrl, note,
}: SendReviewInviteEmailArgs): Promise<{ ok: boolean; error?: string }> {
  const subject = `${inviterName} invited you to review "${scriptTitle}" on GEM`
  const html = buildHtml({ inviterName, scriptTitle, inviteUrl, note: note ?? null, to })

  try {
    const r = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Postmark-Server-Token': POSTMARK_TOKEN,
      },
      body: JSON.stringify({
        From: FROM_EMAIL,
        ReplyTo: REPLY_TO,
        To: to,
        Subject: subject,
        HtmlBody: html,
        MessageStream: STREAM,
        TrackOpens: true,
        TrackLinks: 'HtmlOnly',
        Tag: 'review_invite',
      }),
    })
    if (!r.ok) {
      const txt = await r.text()
      return { ok: false, error: `Postmark ${r.status}: ${txt.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'send failed' }
  }
}

function buildHtml({
  inviterName, scriptTitle, inviteUrl, note,
}: { inviterName: string; scriptTitle: string; inviteUrl: string; note: string | null; to: string }): string {
  const noteBlock = note
    ? `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 18px 0;border-left:3px solid #e5e5e5;padding:6px 14px;font-style:italic;">${escapeHtml(note)}</p>`
    : ''
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#fff;font-size:16px;line-height:1.6;color:#333;">
  <div style="margin-bottom:28px;">
    <span style="font-size:20px;font-weight:700;letter-spacing:1px;color:#1a1a1a;">GEM</span>
  </div>
  <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px 0;">
    <strong>${escapeHtml(inviterName)}</strong> invited you to review their script
    <em>${escapeHtml(scriptTitle)}</em> on GEM.
  </p>
  <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 18px 0;">
    Click below to read it and leave your honest take. If you don't have a GEM
    account yet, you'll be prompted to sign up — it takes a few seconds.
  </p>
  ${noteBlock}
  <div style="margin:22px 0 8px 0;text-align:left;">
    <a href="${inviteUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:8px;letter-spacing:0.2px;box-shadow:0 4px 14px rgba(124,58,237,0.25);">Review the script →</a>
  </div>
  <p style="font-size:12px;color:#888;margin-top:28px;">
    This invite is for you only. If you don't recognize ${escapeHtml(inviterName)},
    you can safely ignore this email.
  </p>
  <div style="border-top:1px solid #e5e5e5;padding-top:20px;margin-top:28px;">
    <p style="font-size:12px;color:#666;margin:0;">
      <a href="https://www.gem.studio" style="color:#7c3aed;text-decoration:underline;">gem.studio</a>
    </p>
  </div>
</div>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
