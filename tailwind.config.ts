import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        eh: {
          green: "#4DCC7A",
          "green-50": "#ECFAF1",
          "green-100": "#D2F4DF",
          "green-200": "#A6E8BE",
          "green-300": "#79DC9D",
          "green-400": "#4DCC7A",
          "green-500": "#34B963",
          "green-600": "#1F9D4E",
          "green-700": "#157A3C",
          "green-800": "#0C5A2D",
          "green-900": "#003B2B",
          "green-950": "#00261B",
          text: "#003B2B",
          "text-muted": "#4A5C56",
          "text-soft": "#7A8985",
          bg: "#FFFFFF",
          "bg-alt": "#FAF9F6",
          "bg-deep": "#003B2B",
          stroke: "#E7EAE5",
          "stroke-strong": "#C8D0C9",
          sand: "#F1E9D9",
          clay: "#C58A5B",
          timber: "#8C5E36",
          sky: "#BBD8E2",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "Inter", "system-ui", "sans-serif"],
      },
      fontWeight: {
        "eh-light": "300",
        "eh-regular": "400",
        "eh-medium": "500",
        "eh-semibold": "600",
        "eh-bold": "700",
      },
      borderRadius: {
        "eh-xs": "4px",
        "eh-sm": "8px",
        "eh-md": "12px",
        "eh-lg": "20px",
        "eh-xl": "32px",
        "eh-pill": "999px",
      },
      boxShadow: {
        "eh-xs": "0 1px 2px rgba(0, 59, 43, 0.06)",
        "eh-sm": "0 2px 6px rgba(0, 59, 43, 0.08)",
        "eh-md": "0 10px 24px rgba(0, 59, 43, 0.10)",
        "eh-lg": "0 24px 48px rgba(0, 59, 43, 0.14)",
        "eh-glow": "0 0 0 6px rgba(77, 204, 122, 0.20)",
      },
    },
  },
  plugins: [],
};

export default config;
