import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "var(--bg-void)",
        panel: "var(--bg-panel)",
        hud: {
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
          cyan: "var(--accent-cyan)",
          border: "var(--border-hud)",
        },
      },
      borderRadius: {
        panel: "var(--radius-panel)",
      },
      boxShadow: {
        "hud-inner": "inset 0 1px 0 rgba(34, 211, 238, 0.1)",
        "hud-glow": "0 0 12px rgba(34, 211, 238, 0.15)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
