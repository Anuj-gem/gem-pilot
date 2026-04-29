# GEM Signup Acknowledgments

Two short acknowledgments shown inline at signup — one for writers, one for industry partners. These are NOT separate legal documents; they're checkboxes the user reads and confirms before completing signup. Reproduced here so the same wording is referenced in product, marketing, and onboarding flows.

## For writers

Shown as a single checkbox at writer signup, before the account is created:

> **By creating an account, I acknowledge that:**
>
> - I have the rights to upload the screenplays I submit to GEM.
> - GEM displays my report to industry partners only as I direct, through the privacy controls I set on each report.
> - I can remove a script — and my account — at any time.

Implementation note: required checkbox; submit button disabled until checked. Logged with timestamp + IP at signup.

## For industry partners

Shown as a single checkbox at producer / representative signup, before the account is created:

> **By creating an industry partner account, I acknowledge that:**
>
> - Scripts I read on GEM are confidential and owned by their authors.
> - I won't redistribute or share any script outside of GEM without the author's express approval.
> - Any option, development, or production conversation happens directly with the writer, not through GEM.

Implementation note: required checkbox at producer onboarding (not at general signup, since account_type is selected during a separate onboarding step). Logged with timestamp + IP at the moment the user finalizes their producer account.
