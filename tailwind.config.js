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
        c1: token('c1'), 'c1-on': token('c1-on'), 'c1-soft': token('c1-soft'), 'c1-ink': token('c1-ink'),
        c2: token('c2'), 'c2-on': token('c2-on'), 'c2-soft': token('c2-soft'), 'c2-ink': token('c2-ink'),
        c3: token('c3'), 'c3-on': token('c3-on'), 'c3-soft': token('c3-soft'), 'c3-ink': token('c3-ink'),
        'surface-solid': token('surface-solid'),
      },
    },
  },
  plugins: [],
}
