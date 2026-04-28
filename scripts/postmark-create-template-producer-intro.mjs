#!/usr/bin/env node
/**
 * Creates the `producer_intro_to_writer` Postmark template.
 *
 * Run locally with the Postmark server token set in your shell:
 *
 *   POSTMARK_SERVER_TOKEN=<token> node scripts/postmark-create-template-producer-intro.mjs
 *
 * If the alias already exists, the script will update the existing template
 * in place instead of creating a new one. Safe to re-run.
 *
 * Variables the template uses:
 *   - writer_first_name
 *   - script_title
 *   - producer_name
 *   - producer_email
 *   - producer_company   (may be empty)
 *   - producer_role      (may be empty: "Producer" / "Representative")
 *   - producer_message   (may be empty)
 *   - report_url
 */

const TOKEN = process.env.POSTMARK_SERVER_TOKEN
if (!TOKEN) {
  console.error('Error: set POSTMARK_SERVER_TOKEN before running.')
  process.exit(1)
}

const ALIAS = 'producer_intro_to_writer'

const Subject = '{{producer_name}} reached out about {{script_title}} on GEM'

const TextBody = `Hi {{writer_first_name}},

{{producer_name}}{{#producer_role}} ({{producer_role}}{{#producer_company}}, {{producer_company}}{{/producer_company}}){{/producer_role}} just marked your script "{{script_title}}" as Interested on GEM and wanted to reach out.

{{#producer_message}}Their note:

{{producer_message}}

{{/producer_message}}Hit Reply to this email to respond directly to {{producer_name}}. They'll get your reply at {{producer_email}}.

You can review their interest on your dashboard:
{{report_url}}

— GEM
gem.studio
`

const HtmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>{{producer_name}} reached out about {{script_title}}</title>
</head>
<body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f5f1;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;border:1px solid #e8e4d8;">
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8a8579;font-weight:700;">GEM · Industry interest</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0 32px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:700;color:#0a0a0a;">
                Hi {{writer_first_name}},
              </h1>
              <p style="margin:0 0 18px 0;font-size:15.5px;line-height:1.55;color:#222;">
                <strong>{{producer_name}}</strong>{{#producer_role}} <span style="color:#666;">({{producer_role}}{{#producer_company}}, {{producer_company}}{{/producer_company}})</span>{{/producer_role}} just marked your script <strong>"{{script_title}}"</strong> as Interested on GEM and wanted to reach out.
              </p>
            </td>
          </tr>

          {{#producer_message}}
          <tr>
            <td style="padding:0 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f6ee;border-left:3px solid #d4a017;border-radius:6px;margin-bottom:18px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#8a8579;font-weight:700;">Their note</p>
                    <p style="margin:0;font-size:15px;line-height:1.6;color:#1a1a1a;white-space:pre-wrap;">{{producer_message}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          {{/producer_message}}

          <tr>
            <td style="padding:8px 32px 0 32px;">
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.55;color:#333;">
                <strong>Hit Reply to this email</strong> to respond directly to {{producer_name}}. Your reply lands in their inbox at <span style="color:#666;">{{producer_email}}</span> — GEM stays out of the way from here.
              </p>
            </td>
          </tr>

          <tr>
            <td align="left" style="padding:6px 32px 28px 32px;">
              <a href="{{report_url}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:8px;">Open report on GEM →</a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 24px 32px;border-top:1px solid #efece2;">
              <p style="margin:18px 0 0 0;font-size:12px;line-height:1.5;color:#8a8579;">
                You're receiving this because you published "{{script_title}}" to industry on GEM. Adjust visibility anytime from your dashboard at <a href="https://www.gem.studio/dashboard" style="color:#7c3aed;text-decoration:none;">gem.studio/dashboard</a>.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0 0;font-size:11px;color:#8a8579;text-align:center;">GEM · gem.studio</p>
      </td>
    </tr>
  </table>
</body>
</html>
`

async function main() {
  // Look up by alias to see if it already exists.
  const lookupRes = await fetch(`https://api.postmarkapp.com/templates/${ALIAS}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Postmark-Server-Token': TOKEN,
    },
  })

  const exists = lookupRes.status === 200

  const payload = {
    Name: 'Producer intro to writer',
    Alias: ALIAS,
    Subject,
    HtmlBody,
    TextBody,
    TemplateType: 'Standard',
  }

  if (exists) {
    console.log(`Template ${ALIAS} already exists — updating in place...`)
    const updateRes = await fetch(`https://api.postmarkapp.com/templates/${ALIAS}`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': TOKEN,
      },
      body: JSON.stringify(payload),
    })
    const json = await updateRes.json()
    if (!updateRes.ok) {
      console.error('Update failed:', json)
      process.exit(1)
    }
    console.log('Updated:', json)
  } else {
    console.log(`Creating template ${ALIAS}...`)
    const createRes = await fetch('https://api.postmarkapp.com/templates', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': TOKEN,
      },
      body: JSON.stringify(payload),
    })
    const json = await createRes.json()
    if (!createRes.ok) {
      console.error('Create failed:', json)
      process.exit(1)
    }
    console.log('Created:', json)
  }

  console.log(`\nDone. Alias: ${ALIAS}`)
}

main().catch((err) => {
  console.error('Script crashed:', err)
  process.exit(1)
})
