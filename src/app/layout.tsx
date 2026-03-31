import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Nav from "@/components/nav"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GEM — AI-Native Creator Network",
  description: "Find collaborators, build reputation, get discovered. The network for AI-native creators.",
  openGraph: {
    title: "GEM — AI-Native Creator Network",
    description: "Find collaborators, build reputation, get discovered.",
    siteName: "GEM",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[var(--gem-black)] text-[var(--gem-white)] antialiased">
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
