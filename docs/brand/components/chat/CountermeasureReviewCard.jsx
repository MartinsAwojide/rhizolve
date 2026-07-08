import React from 'react';
import { Card } from '../primitives/Card.jsx';
import { Button } from '../primitives/Button.jsx';

/**
 * CountermeasureReviewCard — the countermeasure-review interrupt (interrupt_after).
 * The agent drafts a corrective action for a confirmed root cause; the driver
 * accepts, edits, or rejects. The proposed text is AI-authored → serif voice.
 */
export function CountermeasureReviewCard({ rootCause, countermeasure, onAccept, onEdit, onReject, style = {} }) {
  return (
    <Card elevation="md" style={{ maxWidth: 520, ...style }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption-size)', fontWeight: 'var(--weight-medium)', color: 'var(--accent)', marginBottom: 12 }}>
        Countermeasure review
      </div>

      {rootCause && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 'var(--weight-medium)', color: 'var(--text-muted)', marginBottom: 4 }}>
            For root cause
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-primary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid var(--node-root-cause)', boxSizing: 'border-box' }} />
            {rootCause}
          </div>
        </div>
      )}

      <div
        style={{
          fontFamily: 'var(--font-voice)',
          fontSize: 15,
          lineHeight: 1.65,
          color: 'var(--text-primary)',
          padding: '12px 14px',
          borderRadius: 'var(--radius-control)',
          border: '1px solid var(--border)',
          background: 'var(--surface-1)',
          marginBottom: 16,
        }}
      >
        {countermeasure}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="danger" size="sm" onClick={onReject}>Reject</Button>
        <Button variant="secondary" size="sm" onClick={onEdit}>Edit</Button>
        <Button variant="primary" size="sm" style={{ marginLeft: 'auto' }} onClick={onAccept}>Accept</Button>
      </div>
    </Card>
  );
}
