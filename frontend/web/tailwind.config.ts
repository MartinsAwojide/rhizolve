import type { Config } from 'tailwindcss'

// Mirrors DESIGN.md's `tokens.colors` front matter verbatim (see
// tests/design/test_token_parity.py, which checks these hex values appear
// here). Runtime colors resolve through the CSS custom properties in
// src/styles/tokens.css so light/dark switches without a rebuild; this
// object exists so the parity check has a single place to diff against.
export const designTokens = {
  'surface-0': { light: '#FAF7F2', dark: '#12161C' },
  'surface-1': { light: '#F3EEE6', dark: '#1A1F27' },
  'surface-2': { light: '#FFFFFF', dark: '#222833' },
  'text-primary': { light: '#1C2024', dark: '#F4F1EC' },
  'text-secondary': { light: '#44494F', dark: '#BDB8B0' },
  'text-muted': { light: '#5E625F', dark: '#8A857D' },
  accent: { light: '#0C447C', dark: '#85B7EB' },
  'accent-fill': { light: '#185FA5', dark: '#378ADD' },
  'on-accent': { light: '#FFFFFF', dark: '#04121F' },
  success: { light: '#0F6E56', dark: '#5DCAA5' },
  danger: { light: '#A32D2D', dark: '#F09595' },
  warning: { light: '#854F0B', dark: '#EF9F27' },
} as const

// Mirrors DESIGN.md's `tokens.projectStatus` front matter (ProjectCard
// status dot only — see tests/design/test_token_parity.py).
export const projectStatusTokens = {
  active: { light: '#D85A30', dark: '#F0997B' },
  closed: { light: '#888780', dark: '#B4B2A9' },
  draft: { light: '#854F0B', dark: '#EF9F27' },
} as const

// Intentional additions layered on top of DESIGN.md's tokens (not part of the
// token-parity contract — see docs/brand/readme.md's "Intentional additions"
// note and docs/brand/tokens/colors.css).
export const borderTokens = {
  border: { light: '#E7E0D5', dark: '#2C333D' },
  'border-strong': { light: '#D2C9BB', dark: '#3A424E' },
  ring: { light: '#185FA5', dark: '#378ADD' },
} as const

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface-0': 'var(--color-surface-0)',
        'surface-1': 'var(--color-surface-1)',
        'surface-2': 'var(--color-surface-2)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        accent: 'var(--color-accent)',
        'accent-fill': 'var(--color-accent-fill)',
        'on-accent': 'var(--color-on-accent)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        'node-active': 'var(--color-node-active)',
        'node-confirmed': 'var(--color-node-confirmed)',
        'node-ruled-out': 'var(--color-node-ruled-out)',
        'node-root-cause': 'var(--color-node-root-cause)',
        'node-suspended': 'var(--color-node-suspended)',
        'node-conflict': 'var(--color-node-conflict)',
        'project-status-active': 'var(--color-project-status-active)',
        'project-status-closed': 'var(--color-project-status-closed)',
        'project-status-draft': 'var(--color-project-status-draft)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        ring: 'var(--color-ring)',
      },
      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
      },
      borderRadius: {
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        voice: ["'Source Serif 4'", 'Georgia', 'serif'],
        mono: ["'JetBrains Mono'", 'ui-monospace', 'monospace'],
      },
    },
  },
} satisfies Config
