import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#262229",
        plum: "#5b3b69",
        plumDark: "#432c50",
        rice: "#f7f5ef",
        mint: "#e3f2e7",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(64, 43, 71, 0.09)",
        card: "0 8px 24px rgba(64, 43, 71, 0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
