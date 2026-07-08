import React from 'react';

/**
 * NodeStatusMarker — the heart of Rhizolve's visual identity. Renders the five
 * node-status states of the why-tree / fault-tree, identically across renderers.
 * Coral lives ONLY here (and the fault-tree SVG). Never a UI-chrome affordance.
 *
 * states: active | confirmed | ruledOut | rootCause | suspended | conflict
 * `emphaticRuledOut` draws the red-X treatment for a ruled-out node that needs
 * explicit attention (per the DESIGN.md mapping table).
 */
export function NodeStatusMarker({ status = 'active', size = 32, emphaticRuledOut = false, style = {} }) {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const stroke = Math.max(2, size * 0.08);
  const surface = 'var(--surface-2)';

  let body;
  let groupOpacity = 1;
  switch (status) {
    case 'active':
      // Under review: solid coral BORDER, surface fill (a ring, not a disc).
      body = <circle cx={cx} cy={cy} r={r - stroke} fill={surface} stroke="var(--node-active)" strokeWidth={stroke} />;
      break;
    case 'confirmed':
      // Verified real cause (Gemba NOK): solid coral fill.
      body = <circle cx={cx} cy={cy} r={r - stroke} fill="var(--node-active)" />;
      break;
    case 'ruledOut':
      // Dead end (Gemba OK): grey outline, faded to 50%.
      groupOpacity = 0.5;
      body = (
        <>
          <circle cx={cx} cy={cy} r={r - stroke} fill={surface} stroke="var(--node-ruled-out)" strokeWidth={stroke} />
          {emphaticRuledOut && (
            <path
              d={`M${cx - size * 0.18},${cy - size * 0.18} L${cx + size * 0.18},${cy + size * 0.18} M${cx + size * 0.18},${cy - size * 0.18} L${cx - size * 0.18},${cy + size * 0.18}`}
              stroke="var(--danger)"
              strokeWidth={stroke}
              strokeLinecap="round"
            />
          )}
        </>
      );
      break;
    case 'rootCause':
      // Terminal cause: green outline, subtle teal fill, green-plus marker.
      body = (
        <>
          <circle cx={cx} cy={cy} r={r - stroke} fill="color-mix(in srgb, var(--node-root-cause) 16%, var(--surface-2))" stroke="var(--node-root-cause)" strokeWidth={stroke} />
          <path
            d={`M${cx},${cy - size * 0.2} L${cx},${cy + size * 0.2} M${cx - size * 0.2},${cy} L${cx + size * 0.2},${cy}`}
            stroke="var(--node-root-cause)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </>
      );
      break;
    case 'suspended':
      body = (
        <circle
          cx={cx}
          cy={cy}
          r={r - stroke}
          fill={surface}
          stroke="var(--node-suspended)"
          strokeWidth={stroke}
          strokeDasharray={`${size * 0.16} ${size * 0.12}`}
        />
      );
      break;
    case 'conflict':
      body = (
        <>
          <path d={`M${cx},${stroke} a${r - stroke},${r - stroke} 0 0 1 0,${2 * (r - stroke)} Z`} fill="var(--node-conflict)" />
          <path d={`M${cx},${size - stroke} a${r - stroke},${r - stroke} 0 0 1 0,${-2 * (r - stroke)} Z`} fill="var(--node-active)" />
          <circle cx={cx} cy={cy} r={r * 0.42} fill={surface} />
        </>
      );
      break;
    default:
      body = <circle cx={cx} cy={cy} r={r - stroke} fill="var(--node-active)" />;
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ opacity: groupOpacity, ...style }} aria-label={status} role="img">
      {body}
    </svg>
  );
}
