import type { Config } from "tailwindcss";

// Farbwerte 1:1 aus der bisherigen App uebernommen, damit Look & Feel identisch bleibt.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#FBF7EE",
        card: "#FFFFFF",
        ink: "#2B3B2F",
        "ink-soft": "#5B6B5E",
        hairline: "#E7E0CD",
        gold: "#2E8B57",
        "gold-soft": "#DCEEE2",
        teal: "#B8860B",
        "teal-soft": "#F3E7C9",
        sage: "#0E7C86",
        "sage-soft": "#D8EAEA",
        plum: "#7A5C8E",
        "plum-soft": "#EAE3F0",
        rust: "#C0392B",
        "rust-soft": "#F5DAD6",
        amber: "#3457D5",
        "amber-soft": "#DCE3F8",
        berry: "#E6B800",
        "berry-soft": "#FBF0C9",
        slate: "#546A7B",
        "slate-soft": "#DCE4E8",
        rose: "#B5537A",
        "rose-soft": "#F3DCE6",
      },
    },
  },
  plugins: [],
};

export default config;
