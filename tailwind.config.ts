import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Elatime palette — bright, playful, kid-friendly (light theme)
        cream: "#fff6ec", // warm page background
        paper: "#ffffff", // cards
        ink: "#2c2a3a", // primary text
        "ink-soft": "#6f6d7e", // muted text
        // candy accents
        coral: "#ff6b6b",
        sunshine: "#ffd166",
        mint: "#06d6a0",
        sky: "#4cc9f0",
        grape: "#9b8cff",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 6px 20px -6px rgba(44, 42, 58, 0.18)",
        card: "0 2px 10px -4px rgba(44, 42, 58, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
