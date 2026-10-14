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
      minHeight: {
        "hero-globe": "58vh",
      },
      /* C17b motion tokens — values live in globals.css so reduced motion can zero them. */
      transitionDuration: {
        fast: "var(--motion-duration-fast)",
        base: "var(--motion-duration-base)",
        slow: "var(--motion-duration-slow)",
      },
      transitionTimingFunction: {
        "motion-out": "var(--motion-ease-out)",
        "motion-in": "var(--motion-ease-in)",
        "motion-standard": "var(--motion-ease-standard)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-up-in": {
          from: { opacity: "0", transform: "translate3d(0, var(--motion-slide-distance), 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.98)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      /* Entry animations fill `backwards` only: no transform lingers after the run
         (a resting transform would re-parent `position: fixed` descendants). */
      animation: {
        "fade-in": "fade-in var(--motion-duration-base) var(--motion-ease-out) backwards",
        "fade-out": "fade-out var(--motion-duration-fast) var(--motion-ease-in) forwards",
        "slide-up-in": "slide-up-in var(--motion-duration-slow) var(--motion-ease-out) backwards",
        "scale-in": "scale-in var(--motion-duration-base) var(--motion-ease-out) backwards",
      },
    },
  },
  plugins: [],
};

export default config;
