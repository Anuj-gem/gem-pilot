import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gem: {
          gold: "#C9A84C",
          "gold-light": "#E0C878",
          "gold-dark": "#A07C28",
          surface: "#0A0A0C",
          "surface-raised": "#111114",
          "surface-overlay": "#1A1A1F",
          border: "#2A2A30",
          "border-light": "#3A3A42",
          "text-primary": "#F0EDE6",
          "text-secondary": "#9A9A9E",
          "text-muted": "#6A6A70",
          pass: "#2D8B4E",
          consider: "#B8860B",
          develop: "#8B6914",
          prioritize: "#C9A84C",
          danger: "#C0392B",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
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
