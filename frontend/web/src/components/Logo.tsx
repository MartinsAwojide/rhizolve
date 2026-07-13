import type { ImgHTMLAttributes } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'

type LogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'>

export function Logo(props: LogoProps) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  return <img src={prefersDark ? '/brand/logo-dark.svg' : '/brand/logo-light.svg'} alt="Rhizolve" {...props} />
}
