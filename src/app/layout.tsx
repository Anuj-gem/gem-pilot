import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google"
import { PostHogProvider } from "@/components/posthog-provider"
import { GoogleAdsScript } from "@/components/google-ads-script"
import { IntercomWidget } from "@/components/intercom-widget"
import { SiteFooter } from "@/components/site-footer"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-display" })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

const SITE_URL = "https://www.gem.studio"
const SITE_NAME = "GEM"
const DEFAULT_TITLE = "GEM"
const DEFAULT_DESCRIPTION = "Upload your screenplay. Get a sharable pitch, private development notes, and an industry match in 60 seconds. First read free."
const SHORT_DESCRIPTION = "A pitch, notes, and industry matching for your script. First read free."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s — GEM",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "GEM" }],
  keywords: [
    "screenwriter",
    "screenplay",
    "industry matching",
    "screenplay pitch",
    "script feedback",
    "development notes",
    "producers reps dev execs",
    "screenwriting tools",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: SHORT_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: SHORT_DESCRIPTION,
    site: "@gem_studio",
    creator: "@gem_studio",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[var(--gem-black)] text-[var(--gem-white)] antialiased">
        <GoogleAdsScript />
        <IntercomWidget />
        <Suspense fallback={null}>
          <PostHogProvider />
        </Suspense>
        <div className="flex-1 min-w-0 w-full overflow-x-hidden">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  )
}
