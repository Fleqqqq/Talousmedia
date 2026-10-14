import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#080C14",
        surface: "#0F172A",
        "surface-card": "#131D31",
        "surface-border": "#1E293B",
        accent: {
          gold: "#D97706",
          emerald: "#10B981",
          cyan: "#0EA5E9",
          red: "#EF4444"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      }
    },
  },
  plugins: [],
};
export default config;
