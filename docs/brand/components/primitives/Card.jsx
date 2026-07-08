import React from 'react';

/**
 * Rhizolve Card — the raised container used throughout the app: project cards,
 * chat interrupt cards, dashboard panels. Surface-2 with a hairline border,
 * 12px radius, soft editorial shadow.
 */
export function Card({ elevation = 'md', padded = true, children, style = {}, ...rest }) {
  const shadows = {
    flat: 'none',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
  };
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        boxShadow: shadows[elevation] ?? shadows.md,
        padding: padded ? 'var(--space-lg)' : 0,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Optional titled header row for a Card. Sentence case. */
export function CardHeader({ title, meta = null, children, style = {} }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
        ...style,
      }}
    >
      <div style={{ fontSize: 'var(--text-h3-size)', fontWeight: 'var(--weight-medium)' }}>
        {title}
      </div>
      {meta}
      {children}
    </div>
  );
}
