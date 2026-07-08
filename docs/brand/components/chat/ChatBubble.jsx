import React from 'react';

/**
 * ChatBubble — a single message in the investigation thread. The typeface tells
 * the user who is speaking before they read a word:
 *   author="agent" → Source Serif 4 voice (AI-authored: TL;DR, shallow answers)
 *   author="user"  → Inter sans, right-aligned, on a subtle fill
 * System notes render as centred muted mono-ish captions.
 */
export function ChatBubble({ author = 'agent', name = null, children, style = {} }) {
  if (author === 'system') {
    return (
      <div style={{ textAlign: 'center', margin: '6px 0', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-caption-size)', color: 'var(--text-muted)', ...style }}>
        {children}
      </div>
    );
  }
  const isUser = author === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', margin: '10px 0', ...style }}>
      <div style={{ maxWidth: '78%' }}>
        {name && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 'var(--weight-medium)', color: 'var(--text-muted)', marginBottom: 4, textAlign: isUser ? 'right' : 'left' }}>
            {name}
          </div>
        )}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
            background: isUser ? 'color-mix(in srgb, var(--accent) 12%, var(--surface-2))' : 'var(--surface-1)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontFamily: isUser ? 'var(--font-sans)' : 'var(--font-voice)',
            fontSize: isUser ? 15 : 16,
            lineHeight: isUser ? 1.5 : 'var(--text-body-lh)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
