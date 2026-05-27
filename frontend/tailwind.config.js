/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#f7f6f2",
          dark: "#eeede8"
        },
        fresh: {
          50: "#ecfdf8",
          100: "#d1faf0",
          200: "#a7f3e0",
          300: "#6ee7c7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b"
        },
        ocean: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e"
        },
        ink: {
          DEFAULT: "#1c1917",
          soft: "#44403c",
          muted: "#78716c",
          faint: "#a8a29e"
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        display: ['"Fraunces"', "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 1px 3px rgba(28, 25, 23, 0.06), 0 8px 24px rgba(28, 25, 23, 0.06)",
        lift: "0 12px 40px -12px rgba(13, 148, 136, 0.25)"
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem"
      }
    }
  },
  plugins: []
};
