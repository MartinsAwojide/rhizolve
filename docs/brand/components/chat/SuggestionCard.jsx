import React from 'react';
import { Button } from '../primitives/Button.jsx';

/**
 * SuggestionCard — the AI Co-Pilot "staged suggestion" (DESIGN v0.2.0). When the
 * agent proposes an addition to the 5 Whys chain, it renders as a DASHED-outline
 * serif card adjacent to the target node. The graph only transforms once a human
 * accepts (primary blue button); the AI never mutates the tree autonomously.
 */
export function SuggestionCard({ targetNode = null, suggestion, onAccept, onDismiss, style = {} }) {
  return (
    <div
      style={{
        maxWidth: 460,
        background: 'var(--surface-2)',
        border: '1.5px dashed var(--accent)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-lg)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 'var(--weight-medium)', color: 'var(--accent)' }}>
          Suggested branch
        </span>
        {targetNode && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>→ node {targetNode}</span>
        )}
      </div>

      <div style={{ fontFamily: 'var(--font-voice)', fontSize: 15, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: 16 }}>
        {suggestion}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary" size="sm" onClick={onAccept}>Accept suggestion</Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>Dismiss</Button>
      </div>
    </div>
  );
}
