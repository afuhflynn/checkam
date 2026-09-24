import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", ".dark"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // CheckAm Custom Authority & Cameroon Verdict Colors
        authority: {
          50: "#f0f4f9",
          100: "#dbe4f1",
          200: "#bccde5",
          300: "#91afd4",
          400: "#608cbe",
          500: "#3d6ea8",
          600: "#2d548b",
          700: "#244371",
          800: "#1e375d",
          900: "#0b192c",
          950: "#060d18",
        },
        verdict: {
          scam: {
            bg: "#FEF2F2",
            border: "#FCA5A5",
            text: "#991B1B",
            badge: "#DC2626",
            accent: "#7F1D1D",
          },
          caution: {
            bg: "#FFFBEB",
            border: "#FCD34D",
            text: "#92400E",
            badge: "#D97706",
            accent: "#78350F",
          },
          verified: {
            bg: "#F0FDF4",
            border: "#86EFAC",
            text: "#166534",
            badge: "#16A34A",
            accent: "#14532D",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "pulse-subtle": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.02)" },
        },
        "badge-ping": {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "pulse-subtle": "pulse-subtle 2.5s ease-in-out infinite",
        "badge-ping": "badge-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
