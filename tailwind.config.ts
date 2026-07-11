import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Elatime palette — warm, playful, kid-friendly
        canvas: "#0e1726",
        sea: "#12324f",
        land: "#1b2a3d",
        coral: "#ff6b6b",
        sunshine: "#ffd166",
        mint: "#06d6a0",
        sky: "#4cc9f0",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
