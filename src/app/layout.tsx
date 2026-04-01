import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GEM — AI Script Evaluation",
  description: "Upload your screenplay and get a professional evaluation in under a minute. Scored dimensions, development notes, production analysis, and tier placement — built on the same rubric used for produced film and television.",
  openGraph: {
    title: "GEM — AI Script Evaluation",
    description: "Get the evaluation a producer would give your script. Upload, score, improve.",
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
