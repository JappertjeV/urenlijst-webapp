import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1c1c1a", soft: "#5f5e5a", faint: "#888780" },
        surface: { DEFAULT: "#ffffff", soft: "#f7f6f2", line: "#e7e5df" },
        accent: { DEFAULT: "#534ab7", soft: "#eeedfe", ink: "#26215c" },
      },
      borderRadius: { card: "12px" },
    },
  },
  plugins: [],
};
export default config;
