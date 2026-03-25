import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gem: {
          // Accent (emerald — replaces gold for badges, labels, highlights)
          gold: "#15803d",          // emerald-700
          "gold-light": "#16a34a",  // emerald-600
          "gold-dark": "#166534",   // emerald-800
          // Surfaces (light mode)
          surface: "#ffffff",
          "surface-raised": "#f9fafb",   // zinc-50
          "surface-overlay": "#f4f4f5",  // zinc-100
          // Borders
          border: "#e4e4e7",       // zinc-200
          "border-light": "#d4d4d8", // zinc-300
          // Text
          "text-primary": "#09090b",   // zinc-950
          "text-secondary": "#52525b", // zinc-600
          "text-muted": "#71717a",     // zinc-500
          // Verdict colours
          pass: "#15803d",
          consider: "#b45309",
          develop: "#92400e",
          prioritize: "#15803d",
          danger: "#dc2626",
          // Dark CTA button
          cta: "#09090b",
        },
      },
      fontFamily: {
        // Keep display alias pointing at Inter (drops serif)
        display: ["var(--font-body)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
