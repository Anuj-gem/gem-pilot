import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google"
import { PostHogProvider } from "@/components/posthog-provider"
import { GoogleAdsScript } from "@/components/google-ads-script"
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
const DEFAULT_TITLE = "GEM — AI Script Evaluation"
const DEFAULT_DESCRIPTION = "Upload your screenplay and get a professional evaluation in under a minute. Scored dimensions, development notes, production analysis, and tier placement — built on the same rubric used for produced film and television."
const SHORT_DESCRIPTION = "Get the evaluation a producer would give your script. Upload, score, improve."

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
    "screenplay evaluation",
    "script coverage",
    "AI screenwriting",
    "script feedback",
    "screenwriting tools",
    "script reader",
    "screenplay score",
    "producer feedback",
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
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[var(--gem-black)] text-[var(--gem-white)] antialiased">
        <GoogleAdsScript />
        <Suspense fallback={null}>
          <PostHogProvider />
        </Suspense>
        <div className="flex-1 min-w-0 w-full overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  )
}
