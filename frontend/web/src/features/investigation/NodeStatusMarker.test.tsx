import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NodeStatusMarker } from './NodeStatusMarker'

describe('NodeStatusMarker', () => {
  it.each(['active', 'confirmed', 'ruledOut', 'rootCause', 'suspended', 'conflict'] as const)(
    'renders an accessible svg for %s status',
    (status) => {
      const { container } = render(<NodeStatusMarker status={status} />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('role', 'img')
      expect(svg).toHaveAttribute('aria-label', status)
    },
  )

  it('defaults to a 32px viewBox', () => {
    const { container } = render(<NodeStatusMarker status="active" />)
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 32 32')
  })

  it('respects a custom size', () => {
    const { container } = render(<NodeStatusMarker status="active" size={24} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '24')
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
  })

  it('fades ruledOut status to 50% opacity', () => {
    const { container } = render(<NodeStatusMarker status="ruledOut" />)
    expect(container.querySelector('svg')).toHaveStyle({ opacity: '0.5' })
  })

  it('draws an emphatic X for ruledOut when emphaticRuledOut is set', () => {
    const { container } = render(<NodeStatusMarker status="ruledOut" emphaticRuledOut />)
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0)
  })
})
