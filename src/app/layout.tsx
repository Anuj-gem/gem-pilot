import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GEM — AI-Native Media Company",
  description: "GEM is a media company built on AI from the ground up. We produce original content, build proprietary tools, and partner with production companies and brands.",
  openGraph: {
    title: "GEM — AI-Native Media Company",
    description: "AI-native media for the next era of storytelling.",
    siteName: "GEM",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[var(--gem-black)] text-[var(--gem-white)] antialiased">
        {children}
      </body>
    </html>
  )
}
