import React from 'react';

/**
 * ModeIndicator — the subtle Shallow/Deep routing pill in the chat composer.
 * ● Shallow = direct conversational answer, no graph.
 * ◆ Deep = the 5 Whys graph is running.
 * Deliberately quiet chrome; the agent decides the mode, the user can override.
 */
export function ModeIndicator({ mode = 'shallow', onClick, style = {} }) {
  const isDeep = mode === 'deep';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
        padding: '0 10px',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-caption-size)',
        fontWeight: 'var(--weight-medium)',
        cursor: onClick ? 'pointer' : 'default',
        lineHeight: 1,
        ...style,
      }}
    >
      <span style={{ color: 'var(--accent)', fontSize: 10 }}>{isDeep ? '◆' : '●'}</span>
      {isDeep ? 'Deep' : 'Shallow'}
    </button>
  );
}
