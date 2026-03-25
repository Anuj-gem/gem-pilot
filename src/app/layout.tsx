import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEM — Greenlight Evaluation Model",
  description: "AI-powered script analysis for producers. Upload a script, get a structured first-read report on its breakout potential.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white antialiased">
        {children}
      </body>
    </html>
  );
}
