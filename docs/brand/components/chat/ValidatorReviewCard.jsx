import React from 'react';
import { Card } from '../primitives/Card.jsx';
import { Button } from '../primitives/Button.jsx';

/**
 * ValidatorReviewCard — the validator-decision interrupt (interrupt_after).
 * The agent proposes whether a confirmed node is the true root cause, with a
 * confidence reading; the driver accepts or overrides. AI rationale = serif voice.
 */
export function ValidatorReviewCard({ decision = 'root_cause', confidence = 0.82, rationale, onAccept, onOverride, style = {} }) {
  const pct = Math.round(confidence * 100);
  const isRoot = decision === 'root_cause';
  return (
    <Card elevation="md" style={{ maxWidth: 520, ...style }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption-size)', fontWeight: 'var(--weight-medium)', color: 'var(--accent)', marginBottom: 12 }}>
        Validator decision
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 'var(--weight-medium)',
            color: isRoot ? 'var(--success)' : 'var(--text-secondary)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
            border: `1px solid ${isRoot ? 'var(--success)' : 'var(--border-strong)'}`,
            background: isRoot ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'var(--surface-1)',
          }}
        >
          {isRoot ? 'Confirmed root cause' : 'Go deeper'}
        </span>
      </div>

      {/* Confidence meter */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>Confidence</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{pct}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 'var(--radius-pill)', background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-fill)' }} />
        </div>
      </div>

      {rationale && (
        <div style={{ fontFamily: 'var(--font-voice)', fontSize: 15, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: 16 }}>
          {rationale}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="sm" onClick={onOverride}>Override</Button>
        <Button variant="primary" size="sm" style={{ marginLeft: 'auto' }} onClick={onAccept}>Accept decision</Button>
      </div>
    </Card>
  );
}
