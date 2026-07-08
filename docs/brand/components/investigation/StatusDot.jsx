import React from 'react';

/**
 * StatusDot — project / investigation status dot on dashboard cards.
 * Reuses the Search Party node vocabulary: solid coral = active, hollow = closed,
 * amber = draft. This is the ONE chrome context where coral appears, because a
 * project's status IS its investigation state, not a decorative accent.
 */
export function StatusDot({ status = 'active', size = 10, withLabel = false, style = {} }) {
  const map = {
    active: { fill: 'var(--node-active)', border: 'var(--node-active)', label: 'Active' },
    closed: { fill: 'transparent', border: 'var(--node-ruled-out)', label: 'Closed' },
    draft:  { fill: 'var(--warning)', border: 'var(--warning)', label: 'Draft' },
  };
  const s = map[status] || map.active;
  const dot = (
    <span
      data-status={status}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 'var(--radius-pill)',
        background: s.fill,
        border: `2px solid ${s.border}`,
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    />
  );
  if (!withLabel) return dot;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption-size)', color: 'var(--text-secondary)', ...style }}>
      {dot}
      {s.label}
    </span>
  );
}
