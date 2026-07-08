import React from 'react';

/**
 * Rhizolve Badge — small pill label for domain tags, counts, and states.
 * `tone` maps to semantic colours (neutral chrome by default). Coral is NOT
 * available here — node status uses NodeStatusMarker / StatusDot, never a badge.
 */
export function Badge({ tone = 'neutral', children, style = {}, ...rest }) {
  const tones = {
    neutral: { background: 'var(--surface-1)', color: 'var(--text-secondary)', border: 'var(--border)' },
    accent:  { background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)', border: 'color-mix(in srgb, var(--accent) 30%, transparent)' },
    success: { background: 'color-mix(in srgb, var(--success) 12%, transparent)', color: 'var(--success)', border: 'color-mix(in srgb, var(--success) 30%, transparent)' },
    danger:  { background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)', border: 'color-mix(in srgb, var(--danger) 30%, transparent)' },
    warning: { background: 'color-mix(in srgb, var(--warning) 14%, transparent)', color: 'var(--warning)', border: 'color-mix(in srgb, var(--warning) 32%, transparent)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 22,
        padding: '0 10px',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-caption-size)',
        fontWeight: 'var(--weight-medium)',
        lineHeight: 1,
        borderRadius: 'var(--radius-pill)',
        background: t.background,
        color: t.color,
        border: `1px solid ${t.border}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
