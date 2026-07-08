import React from 'react';

/**
 * MaturityMeter — the 1–5 organisation maturity scale that governs hypothesis
 * complexity (1 = basic poka-yoke gaps → 5 = complex systemic failures).
 * Five segments fill up to the current level; neutral chrome, no coral.
 */
export function MaturityMeter({ level = 3, showLabel = true, style = {} }) {
  const labels = ['Basic', 'Developing', 'Defined', 'Managed', 'Optimising'];
  const clamped = Math.max(1, Math.min(5, level));
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', ...style }}>
      <span style={{ display: 'inline-flex', gap: 3 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            style={{
              width: 16,
              height: 5,
              borderRadius: 'var(--radius-pill)',
              background: i <= clamped ? 'var(--accent-fill)' : 'var(--border-strong)',
            }}
          />
        ))}
      </span>
      {showLabel && (
        <span style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-secondary)', fontWeight: 'var(--weight-medium)' }}>
          L{clamped} · {labels[clamped - 1]}
        </span>
      )}
    </span>
  );
}
