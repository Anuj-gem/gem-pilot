'use client'

import Script from 'next/script'
import { GA_ADS_ID } from '@/lib/gtag'

/**
 * Loads the Google Ads gtag.js snippet.
 * Drop this into the root layout. Does nothing if NEXT_PUBLIC_GOOGLE_ADS_ID is not set.
 */
export function GoogleAdsScript() {
  if (!GA_ADS_ID) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ADS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ADS_ID}', {
            send_page_view: false
          });
        `}
      </Script>
    </>
  )
}
