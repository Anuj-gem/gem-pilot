// /terms — GEM Terms of Use. Source of truth lives in /legal/terms-of-use.md;
// this page is the public-facing render. When the markdown changes, update
// the JSX below to match.

import Nav from '@/components/nav'

export const metadata = {
  title: 'Terms of Use — GEM',
  description: 'The terms that govern your use of GEM.',
}

export default function TermsPage() {
  return (
    <>
      <Nav />
      <article className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-24">
        <h1 className="text-[28px] sm:text-[36px] font-bold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 mb-2">
          Terms of Use
        </h1>
        <p className="text-[13px] text-[var(--gem-gray-400)] m-0 mb-8">
          Last updated: October 2026 · Operating entity: GEM Studios ·{' '}
          <a
            href="mailto:support@gem.studio"
            className="text-[var(--gem-accent)] hover:underline"
          >
            support@gem.studio
          </a>
        </p>

        <Lede>
          By using GEM, you agree to these Terms. If you don&apos;t agree, don&apos;t use GEM.
        </Lede>

        <H2>1. Eligibility</H2>
        <P>You must be 18 or older to use GEM.</P>

        <H2>2. Your account</H2>
        <P>
          Each person may only create and maintain one GEM account. Don&apos;t
          create multiple accounts to access additional free evaluations or to
          circumvent any limits. We may suspend or terminate duplicate accounts
          without notice.
        </P>
        <P>
          You&apos;re responsible for keeping your login credentials secure and
          for everything that happens on your account. Don&apos;t share your
          account. Tell us right away if you think your account is compromised.
        </P>

        <H2>3. Your content</H2>
        <P>
          <Bold>You own what you upload.</Bold> Scripts, profile content, edits
          to your report, and messages you send are yours.
        </P>
        <P>
          You grant GEM a limited, non-exclusive, royalty-free license to host,
          display, process (including with AI evaluation tools), and transmit
          your content as needed to operate the platform — including showing
          your published report to industry partners according to your privacy
          settings. This license ends when you remove the content from GEM,
          except for backups and logs we retain for a reasonable period.
        </P>
        <P>
          You confirm that you have the rights to upload anything you upload
          and that doing so doesn&apos;t violate someone else&apos;s rights.
        </P>

        <H2>4. What you can&apos;t do</H2>
        <P>Don&apos;t use GEM to:</P>
        <Bullets>
          <li>Upload content you don&apos;t have the rights to upload.</li>
          <li>Harass, threaten, or harm anyone.</li>
          <li>
            Try to circumvent paywalls or access controls, or scrape the
            platform.
          </li>
          <li>Send spam through GEM&apos;s communication features.</li>
          <li>Distribute malware or otherwise harm GEM or its users.</li>
          <li>Use GEM in violation of any law.</li>
        </Bullets>

        <H2>5. Subscriptions and billing</H2>
        <P>
          GEM Pro is a recurring subscription billed monthly through Stripe. By
          subscribing, you authorize us to charge your payment method on the
          recurring schedule.
        </P>
        <P>
          You can cancel anytime through your account or by emailing{' '}
          <a
            href="mailto:support@gem.studio"
            className="text-[var(--gem-accent)] hover:underline"
          >
            support@gem.studio
          </a>
          . Cancellation takes effect at the end of your current billing
          period; you keep Pro access until then.{' '}
          <Bold>Fees are non-refundable except where required by law.</Bold>
        </P>
        <P>
          If your payment fails, we may suspend or downgrade your account.
        </P>
        <P>
          We may change subscription pricing or features at any time. We&apos;ll
          notify you at least 14 days before any price increase takes effect on
          your account.
        </P>

        <H2>6. Industry partner accounts</H2>
        <P>
          Industry partner accounts (producers, representatives) get to see
          scripts that writers have published to GEM. By using an industry
          partner account, you confirm you&apos;re a working professional in
          entertainment and you accept the producer-side acknowledgments shown
          at signup.
        </P>

        <H2>7. AI evaluations</H2>
        <P>
          GEM uses AI to evaluate scripts.{' '}
          <Bold>Evaluations are opinions, not professional advice.</Bold>{' '}
          They&apos;re not guarantees about commercial success, talent, or the
          prospects of your career. Don&apos;t rely on them as the only basis
          for important decisions.
        </P>

        <H2>8. Our content and trademarks</H2>
        <P>
          The GEM platform, including its design, code, and trademarks, belongs
          to us. We grant you a limited, revocable license to use the platform
          as intended.
        </P>

        <H2>9. Suspension and termination</H2>
        <P>
          <Bold>
            We can suspend or terminate any account, and remove or restrict any
            content, at our discretion
          </Bold>{' '}
          — including for violations of these Terms, abusive behavior,
          suspected fraud, or to comply with legal requests. Where reasonable,
          we&apos;ll give notice. We&apos;ll refund any prepaid Pro time on a
          pro-rata basis if we terminate without cause.
        </P>
        <P>You can stop using GEM anytime by deleting your account.</P>

        <H2>10. No warranties</H2>
        <P>
          GEM is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo;
          We don&apos;t promise the platform will always be available,
          error-free, or fit for any particular purpose. We disclaim all
          implied warranties to the maximum extent allowed by law.
        </P>

        <H2>11. Limitation of liability</H2>
        <P>
          To the maximum extent allowed by law, GEM is not liable for indirect,
          incidental, special, consequential, or punitive damages, or for lost
          profits or revenue, arising out of your use of the platform. Our
          total liability for any claim is limited to the amount you paid us in
          the 12 months before the claim.
        </P>

        <H2>12. Legal requests</H2>
        <P>
          We comply with valid legal process. If we receive a subpoena, court
          order, or similar request, we may produce the requested information
          without notice to you, except where prohibited.
        </P>

        <H2>13. Changes to these Terms</H2>
        <P>
          We may update these Terms. If a change is material, we&apos;ll post
          the updated version here and email you. Continued use after the
          effective date counts as acceptance.
        </P>

        <H2>14. Contact</H2>
        <P>
          <a
            href="mailto:support@gem.studio"
            className="text-[var(--gem-accent)] hover:underline"
          >
            support@gem.studio
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
