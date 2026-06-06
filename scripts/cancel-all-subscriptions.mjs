// cancel-all-subscriptions.mjs
//
// One-off: cancels ALL active Stripe subscriptions immediately and QUIETLY.
//   - Cancels right away (no more charges), no proration, no final invoice
//     — so Stripe generates no receipt/invoice email.
//   - The Stripe API cancellation itself does NOT email the customer.
//     The GEM announcement email is what tells members.
//
// SAFETY: runs in DRY RUN by default — it only LISTS what it would cancel,
// touching nothing. Set DRY_RUN=false to actually cancel.
//
// Before the live run, verify in Stripe Dashboard → Settings → Customer
// emails that subscription/invoice emails are off, just to be 100% sure.
//
// Run from the gem-app 2 folder (so the `stripe` package resolves):
//   STRIPE_SECRET_KEY=sk_live_xxx node scripts/cancel-all-subscriptions.mjs
//   STRIPE_SECRET_KEY=sk_live_xxx DRY_RUN=false node scripts/cancel-all-subscriptions.mjs

import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('Missing STRIPE_SECRET_KEY. Run with STRIPE_SECRET_KEY=sk_live_... in front of the command.')
  process.exit(1)
}

const stripe = new Stripe(key)
const DRY_RUN = process.env.DRY_RUN !== 'false'
const STATUSES = ['active', 'trialing', 'past_due', 'unpaid']

async function run() {
  console.log(DRY_RUN
    ? '🟡 DRY RUN — listing only, nothing will be cancelled.\n'
    : '🔴 LIVE — cancelling subscriptions for real.\n')

  let total = 0
  let cancelled = 0

  for (const status of STATUSES) {
    let startingAfter
    while (true) {
      const page = await stripe.subscriptions.list({
        status,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })

      for (const sub of page.data) {
        total++
        if (DRY_RUN) {
          console.log(`would cancel   ${sub.id}   status=${status}   customer=${sub.customer}`)
        } else {
          try {
            await stripe.subscriptions.cancel(sub.id, { prorate: false, invoice_now: false })
            cancelled++
            console.log(`cancelled      ${sub.id}   customer=${sub.customer}`)
          } catch (e) {
            console.error(`FAILED         ${sub.id}: ${e.message}`)
          }
        }
      }

      if (!page.has_more) break
      startingAfter = page.data[page.data.length - 1].id
    }
  }

  console.log('')
  if (DRY_RUN) {
    console.log(`Found ${total} active subscription(s). Re-run with DRY_RUN=false to cancel them.`)
  } else {
    console.log(`Cancelled ${cancelled} of ${total} subscription(s).`)
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
