import React from 'react';

/**
 * ConnectivityIndicator — Android auto-mode network state. The app measures
 * signal continuously and routes inference automatically:
 *   cloud  — strong/moderate signal, cloud APIs
 *   hybrid — weak signal, OpenRouter + Cactus fallback
 *   local  — no signal, fully on-device Cactus
 * Always visible on the field surface.
 */
export function ConnectivityIndicator({ mode = 'cloud', style = {} }) {
  const map = {
    cloud:  { label: 'Cloud', color: 'var(--success)', bars: 3 },
    hybrid: { label: 'Hybrid', color: 'var(--warning)', bars: 2 },
    local:  { label: 'On-device', color: 'var(--text-muted)', bars: 1 },
  };
  const m = map[mode] || map.cloud;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 26,
        padding: '0 10px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-caption-size)',
        fontWeight: 'var(--weight-medium)',
        color: 'var(--text-secondary)',
        ...style,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
        {[6, 9, 12].map((h, i) => (
          <span
            key={i}
            style={{
              width: 3,
              height: h,
              borderRadius: 1,
              background: i < m.bars ? m.color : 'var(--border-strong)',
            }}
          />
        ))}
      </span>
      {m.label}
    </span>
  );
}
