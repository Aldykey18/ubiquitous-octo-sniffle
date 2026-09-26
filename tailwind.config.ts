import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        electric: "#3d7bff",
        violet: "#8b5cf6",
        cyan: "#22d3ee",
        value: "#34d399",
        warn: "#f59e0b",
        danger: "#f43f5e"
      },
      fontFamily: {
        display: ["Tahoma", "Segoe UI", "Verdana", "sans-serif"],
        body: ["Tahoma", "Segoe UI", "Verdana", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"]
      },
      animation: {
        "fade-up": "fadeUp .6s cubic-bezier(.22,1,.36,1) both",
        "fade-in": "fadeIn .5s ease both",
        float: "floatY 7s ease-in-out infinite",
        "float-slow": "floatY 11s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.6s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        "spin-slow": "spin 14s linear infinite",
        "ring-spin": "ringSpin 18s linear infinite",
        ticker: "ticker 2.4s ease-in-out infinite"
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px) scale(.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        floatY: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" }
        },
        pulseGlow: {
          "0%,100%": { opacity: ".55" },
          "50%": { opacity: "1" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" }
        },
        ringSpin: {
          "0%": { transform: "rotateX(64deg) rotateZ(0deg)" },
          "100%": { transform: "rotateX(64deg) rotateZ(360deg)" }
        },
        ticker: {
          "0%,100%": { transform: "translateY(0)", opacity: "1" },
          "50%": { transform: "translateY(-2px)", opacity: ".8" }
        }
      },
      boxShadow: {
        glass: "0 10px 40px -12px rgb(0 0 0 / .55)",
        "glow-blue": "0 0 32px -6px rgb(61 123 255 / .55)",
        "glow-violet": "0 0 32px -6px rgb(139 92 246 / .5)",
        "glow-green": "0 0 26px -6px rgb(52 211 153 / .5)"
      }
    }
  },
  plugins: []
};

export default config;
