/** @type {import('tailwindcss').Config} */
// Theme tokens live as CSS variables in src/index.css. Wrapping them in
// color-mix lets opacity modifiers (bg-accent/10, border-danger/30) work.
const token = (name) => `color-mix(in srgb, var(--${name}) calc(<alpha-value> * 100%), transparent)`;

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: token('accent-primary'),
        'on-accent': token('accent-contrast'),
        'accent-2': token('accent-2'),
        highlight: token('highlight'),
        'on-highlight': token('highlight-text'),
        'on-danger': token('danger-contrast'),
        warm: token('accent-warm'),
        danger: token('danger'),
        success: token('success'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        muted: token('muted-color'),
        faint: token('faint-color'),
        ink: token('text-color'),
        canvas: token('bg-color'),
        hairline: token('hairline'),
        'hairline-strong': token('hairline-strong'),
        'input-bg': token('input-bg'),
        'input-border': token('input-border'),
        'panel-bg': token('panel-bg'),
      },
    },
  },
  plugins: [],
}
