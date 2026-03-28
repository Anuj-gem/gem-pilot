import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEM — Greenlight Evaluation Model",
  description: "Submit your script and get detailed AI-powered feedback across 10 dimensions. Free for every writer. GEM is looking for the best undiscovered scripts in the world.",
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
