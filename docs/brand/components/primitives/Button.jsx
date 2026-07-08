import React from 'react';

/**
 * Rhizolve Button — the primary chrome affordance.
 * Chrome is blue: the solid variant uses accent-fill. Never coral (coral is
 * reserved for node-status meaning). Two weights, sentence case, 8px radius.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  children,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { height: 32, padding: '0 12px', fontSize: 13 },
    md: { height: 40, padding: '0 16px', fontSize: 14 },
    lg: { height: 48, padding: '0 20px', fontSize: 15 },
  };

  const variants = {
    primary: {
      background: 'var(--accent-fill)',
      color: 'var(--on-accent)',
      border: '1px solid transparent',
    },
    secondary: {
      background: 'var(--surface-2)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-strong)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--accent)',
      border: '1px solid transparent',
    },
    danger: {
      background: 'transparent',
      color: 'var(--danger)',
      border: '1px solid var(--danger)',
    },
  };

  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;

  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-medium)',
        lineHeight: 1,
        borderRadius: 'var(--radius-control)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 120ms ease, opacity 120ms ease, box-shadow 120ms ease',
        whiteSpace: 'nowrap',
        ...v,
        ...style,
      }}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
