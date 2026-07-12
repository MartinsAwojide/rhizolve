import { describe, expect, it } from 'vitest'
import { deriveNodeStatus } from './nodeStyle'
import type { WhyNode } from '../chat/types'

const base: WhyNode = {
  id: 'n1',
  branch_path: 'root.h1',
  depth: 1,
  hypothesis: 'Belt worn out',
  gemba_result: 'pending',
  gemba_notes: '',
  is_root_cause: false,
  countermeasure: '',
}

describe('deriveNodeStatus', () => {
  it('returns active for a default pending node', () => {
    expect(deriveNodeStatus(base)).toBe('active')
  })

  it('returns ruledOut when gemba_result is OK', () => {
    expect(deriveNodeStatus({ ...base, gemba_result: 'OK' })).toBe('ruledOut')
  })

  it('returns confirmed when gemba_result is NOK', () => {
    expect(deriveNodeStatus({ ...base, gemba_result: 'NOK' })).toBe('confirmed')
  })

  it('returns suspended when status is suspended', () => {
    expect(deriveNodeStatus({ ...base, status: 'suspended' })).toBe('suspended')
  })

  it('returns rootCause when is_root_cause is true', () => {
    expect(deriveNodeStatus({ ...base, is_root_cause: true })).toBe('rootCause')
  })

  it('returns conflict when conflict is true', () => {
    expect(deriveNodeStatus({ ...base, conflict: true })).toBe('conflict')
  })

  it('prioritizes conflict over rootCause', () => {
    expect(deriveNodeStatus({ ...base, conflict: true, is_root_cause: true })).toBe(
      'conflict',
    )
  })

  it('prioritizes rootCause over suspended', () => {
    expect(
      deriveNodeStatus({ ...base, is_root_cause: true, status: 'suspended' }),
    ).toBe('rootCause')
  })

  it('prioritizes suspended over confirmed', () => {
    expect(deriveNodeStatus({ ...base, status: 'suspended', gemba_result: 'NOK' })).toBe(
      'suspended',
    )
  })
})
