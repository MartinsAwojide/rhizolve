import React from 'react';
import { Card } from '../primitives/Card.jsx';
import { NodeStatusMarker } from '../investigation/NodeStatusMarker.jsx';

/**
 * GembaCheckCard — the field verification interrupt. Docks inline in the chat
 * thread (web) and is the primary field surface (Android). Evidence capture
 * comes FIRST (record what you saw), then the three stacked ≥56dp result
 * buttons carrying the node vocabulary: OK = hollow, NOK = solid coral,
 * Root cause = green-plus.
 */
export function GembaCheckCard({ hypothesis, instructions, branch = null, onSubmit, style = {} }) {
  const [result, setResult] = React.useState(null);

  const results = [
    { key: 'OK', status: 'ruledOut', title: 'OK', subtitle: 'Checked out — this is not the cause', accent: 'var(--node-ruled-out)' },
    { key: 'NOK', status: 'confirmed', title: 'NOK', subtitle: 'Confirmed — this is a real cause', accent: 'var(--node-active)' },
    { key: 'ROOT_CAUSE', status: 'rootCause', title: 'Root cause', subtitle: 'Fixing this prevents recurrence', accent: 'var(--node-root-cause)' },
  ];

  const evidence = [
    { key: 'voice', label: 'Voice' },
    { key: 'photo', label: 'Photo' },
    { key: 'type', label: 'Type' },
  ];

  return (
    <Card elevation="md" style={{ maxWidth: 520, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption-size)', fontWeight: 'var(--weight-medium)', color: 'var(--accent)', textTransform: 'none' }}>
          Gemba check
        </span>
        {branch && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>branch {branch}</span>
        )}
      </div>

      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', marginBottom: 6 }}>
        {hypothesis}
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
        {instructions}
      </div>

      {/* Evidence first */}
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 'var(--weight-medium)', color: 'var(--text-muted)', marginBottom: 8 }}>
        Record what you observed
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {evidence.map((e) => (
          <button
            key={e.key}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 'var(--radius-control)',
              border: '1px dashed var(--border-strong)',
              background: 'var(--surface-1)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 'var(--weight-medium)',
              cursor: 'pointer',
            }}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Result selection — three stacked ≥56dp buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map((r) => {
          const selected = result === r.key;
          return (
            <button
              key={r.key}
              onClick={() => setResult(r.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                minHeight: 'var(--touch-gemba)',
                padding: '0 16px',
                textAlign: 'left',
                borderRadius: 'var(--radius-control)',
                border: `2px solid ${selected ? r.accent : 'var(--border-strong)'}`,
                background: selected ? `color-mix(in srgb, ${r.accent} 12%, var(--surface-2))` : 'var(--surface-2)',
                cursor: 'pointer',
                transition: 'border-color 120ms ease, background 120ms ease',
              }}
            >
              <NodeStatusMarker status={r.status} size={28} emphaticRuledOut={r.key === 'OK'} />
              <span>
                <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>
                  {r.title}
                </span>
                <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {r.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        disabled={!result}
        onClick={() => onSubmit?.({ result })}
        style={{
          marginTop: 16,
          width: '100%',
          height: 'var(--touch-gemba)',
          borderRadius: 'var(--radius-control)',
          border: 'none',
          background: 'var(--accent-fill)',
          color: 'var(--on-accent)',
          fontFamily: 'var(--font-sans)',
          fontSize: 15,
          fontWeight: 'var(--weight-medium)',
          cursor: result ? 'pointer' : 'not-allowed',
          opacity: result ? 1 : 0.45,
        }}
      >
        Submit result
      </button>
    </Card>
  );
}
