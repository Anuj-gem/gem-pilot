// /privacy — GEM Privacy Notice. Source of truth lives in
// /legal/privacy-notice.md; this page is the public-facing render.
// When the markdown changes, update the JSX below to match.

import Nav from '@/components/nav'
import Link from 'next/link'

export const metadata = {
  title: 'Privacy Notice — GEM',
  description: 'What GEM collects, who can see it, and how to reach us.',
}

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <article className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-24 prose-gem">
        <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 mb-2">
          Privacy Notice
        </h1>
        <p className="text-[13px] text-[var(--gem-gray-400)] m-0 mb-8">
          Last updated: October 2026 · Operating entity: GEM Studios ·{' '}
          <a
            href="mailto:privacy@gem.studio"
            className="text-[var(--gem-accent)] hover:underline"
          >
            privacy@gem.studio
          </a>
        </p>

        <Lede>
          A plain-English summary of what we collect, who can see it, and how to
          reach us. We aim to keep this short. If our practices change in a way
          that would meaningfully affect you, we&apos;ll update it here.
        </Lede>

        <H2>What we collect</H2>
        <Bullets>
          <li>
            <Bold>Account information</Bold> — your name, email, password
            (hashed), and account type (writer or industry partner).
          </li>
          <li>
            <Bold>Profile information</Bold> — for industry partners, your
            company name and role. For writers, optional profile fields.
          </li>
          <li>
            <Bold>Scripts you upload</Bold> — we extract the text from the PDF
            and run it through our AI evaluation.
          </li>
          <li>
            <Bold>Reports and edits</Bold> — the evaluation we generate, plus
            any titles, headlines, tags, or privacy settings you configure.
          </li>
          <li>
            <Bold>Communications</Bold> — messages we deliver between you and
            other users (e.g. producer intros), and any messages you send us
            directly.
          </li>
          <li>
            <Bold>Payment information</Bold> — billing address and the last
            four digits of your card. Full card details are handled by Stripe;
            we never store them.
          </li>
          <li>
            <Bold>Usage data</Bold> — pages you visit, actions you take,
            browser, device, IP, approximate location.
          </li>
        </Bullets>

        <H2>Who sees what</H2>
        <Bullets>
          <li>
            <Bold>Your scripts and report content</Bold> are seen by GEM staff
            for support and platform operations, by you, and — if you choose
            to publish — by industry partners on the platform, on a per-section
            basis you control.
          </li>
          <li>
            <Bold>Producer ↔ writer messages</Bold> are delivered by us. We
            never expose either party&apos;s email address to the other except
            through the messages they themselves initiate.
          </li>
          <li>
            <Bold>Service providers</Bold> that operate GEM see whatever data
            they need to do their job: hosting (Vercel), database (Supabase),
            AI evaluation (OpenAI), payments (Stripe), email (Postmark),
            analytics (PostHog), advertising attribution (Google).
          </li>
          <li>
            <Bold>Legal process.</Bold> If we receive a valid subpoena, court
            order, or other legally enforceable request, we will comply.
          </li>
          <li>
            <Bold>Business transfer.</Bold> If GEM is acquired, your data may
            transfer to the acquiring entity. We&apos;ll notify you if that
            happens.
          </li>
        </Bullets>
        <P>We do not sell your information.</P>

        <H2>Your script content and AI</H2>
        <P>
          When you upload a screenplay, we send the extracted text to OpenAI to
          generate the evaluation. OpenAI&apos;s published policy says they
          don&apos;t use API content to train their models. We don&apos;t sell,
          license, or share your script content with anyone other than the
          recipients described above. <Bold>You retain all rights to your
          script.</Bold> Our limited license to display and process it is
          described in the <Link className="text-[var(--gem-accent)] hover:underline" href="/terms">Terms of Use</Link>.
        </P>

        <H2>Privacy rights</H2>
        <P>
          If you live in a jurisdiction with specific privacy rights (e.g.
          California, the EU, the UK), you may have rights to access, correct,
          delete, or export your information. Email{' '}
          <a
            href="mailto:privacy@gem.studio"
            className="text-[var(--gem-accent)] hover:underline"
          >
            privacy@gem.studio
          </a>{' '}
          and we&apos;ll honor your request.
        </P>
        <P>
          You can also email us to delete your account at any time. We&apos;ll
          remove your data from active systems within a reasonable period after
          the request, except where we&apos;re required to retain it (e.g. tax
          records).
        </P>

        <H2>Cookies</H2>
        <P>
          We use cookies to keep you signed in, secure your session, measure how
          the product is used (PostHog), and attribute advertising (Google
          Ads). You can disable cookies in your browser; some functionality
          will break.
        </P>

        <H2>Security</H2>
        <P>
          We use TLS for all traffic, encryption at rest, and role-based access
          controls. We can&apos;t guarantee absolute security. If we discover a
          breach affecting your information, we&apos;ll let you know.
        </P>

        <H2>Adults only</H2>
        <P>GEM is for adults. Don&apos;t use it if you&apos;re under 18.</P>

        <H2>Updates</H2>
        <P>
          We&apos;ll post updates here. If a change is meaningful, we&apos;ll
          let you know by email.
        </P>

        <H2>Contact</H2>
        <P>
          <a
            href="mailto:privacy@gem.studio"
            className="text-[var(--gem-accent)] hover:underline"
          >
            privacy@gem.studio
          </a>
        </P>
      </article>
    </>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 mt-9 mb-3">
      {children}
    </h2>
  )
}
function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15.5px] sm:text-[16px] text-[var(--gem-gray-100)] leading-[1.65] m-0 mb-3.5 max-w-[68ch]">
      {children}
    </p>
  )
}
function Lede({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-100)] leading-[1.6] m-0 mb-6 max-w-[68ch]">
      {children}
    </p>
  )
}
function Bullets({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc pl-6 m-0 mb-3.5 space-y-2 text-[15.5px] sm:text-[16px] text-[var(--gem-gray-100)] leading-[1.6] max-w-[68ch] [&>li]:pl-1">
      {children}
    </ul>
  )
}
function Bold({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-semibold text-[var(--gem-gray-50)]">{children}</span>
  )
}
