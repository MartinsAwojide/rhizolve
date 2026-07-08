import React from 'react';
import { Card } from '../primitives/Card.jsx';
import { Button } from '../primitives/Button.jsx';

/**
 * HypothesisReviewCard — the hypothesis-review interrupt. The agent proposes a
 * ranked list of hypotheses; the driver can remove, reorder, and add before
 * generating Gemba checks. AI-authored hypothesis text renders in the serif voice.
 */
export function HypothesisReviewCard({ hypotheses = [], onConfirm, onRemove, onAdd, style = {} }) {
  return (
    <Card elevation="md" style={{ maxWidth: 520, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption-size)', fontWeight: 'var(--weight-medium)', color: 'var(--accent)' }}>
          Hypothesis review
        </span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>
          {hypotheses.length} candidates · drag to reorder
        </span>
      </div>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {hypotheses.map((h, i) => (
          <li
            key={h.id ?? i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--border)',
              background: 'var(--surface-1)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginTop: 3, cursor: 'grab' }}>⠿ {i + 1}</span>
            <span style={{ flex: 1, fontFamily: 'var(--font-voice)', fontSize: 15, lineHeight: 1.55, color: 'var(--text-primary)' }}>
              {typeof h === 'string' ? h : h.text}
            </span>
            <button
              onClick={() => onRemove?.(h.id ?? i)}
              aria-label="Remove hypothesis"
              style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}
            >
              ×
            </button>
          </li>
        ))}
      </ol>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <Button variant="secondary" size="sm" onClick={onAdd}>Add hypothesis</Button>
        <Button variant="primary" size="sm" style={{ marginLeft: 'auto' }} onClick={onConfirm}>Generate checks</Button>
      </div>
    </Card>
  );
}
