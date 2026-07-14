import { useMediaQuery } from './useMediaQuery'

const LIGHT_VARIABLES = {
  colorPrimary: '#185FA5',
  colorBackground: '#FFFFFF',
  colorText: '#1C2024',
  colorInputBackground: '#F3EEE6',
  borderRadius: '8px',
  fontFamily: 'Inter, system-ui, sans-serif',
} as const

const DARK_VARIABLES = {
  colorPrimary: '#378ADD',
  colorBackground: '#222833',
  colorText: '#F4F1EC',
  colorInputBackground: '#1A1F27',
  borderRadius: '8px',
  fontFamily: 'Inter, system-ui, sans-serif',
} as const

export function useClerkAppearance() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  return { variables: prefersDark ? DARK_VARIABLES : LIGHT_VARIABLES }
}
