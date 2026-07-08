import React from 'react';

/**
 * Rhizolve Input — text field / textarea used in forms, project setup, and the
 * chat composer. Hairline border, 8px radius, accent focus ring.
 */
export function Input({
  as = 'input',
  label = null,
  hint = null,
  invalid = false,
  leadingIcon = null,
  style = {},
  wrapperStyle = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const Tag = as;
  const borderColor = invalid
    ? 'var(--danger)'
    : focused
    ? 'var(--ring)'
    : 'var(--border-strong)';

  return (
    <label style={{ display: 'block', fontFamily: 'var(--font-sans)', ...wrapperStyle }}>
      {label && (
        <span
          style={{
            display: 'block',
            marginBottom: 6,
            fontSize: 'var(--text-caption-size)',
            fontWeight: 'var(--weight-medium)',
            color: 'var(--text-secondary)',
          }}
        >
          {label}
        </span>
      )}
      <span
        style={{
          display: 'flex',
          alignItems: as === 'textarea' ? 'flex-start' : 'center',
          gap: 8,
          background: 'var(--surface-2)',
          border: `1px solid ${borderColor}`,
          borderRadius: 'var(--radius-control)',
          padding: as === 'textarea' ? '10px 12px' : '0 12px',
          boxShadow: focused ? '0 0 0 3px color-mix(in srgb, var(--ring) 22%, transparent)' : 'none',
          transition: 'border-color 120ms ease, box-shadow 120ms ease',
        }}
      >
        {leadingIcon}
        <Tag
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          style={{
            flex: 1,
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-body-size)',
            lineHeight: as === 'textarea' ? 1.6 : undefined,
            height: as === 'textarea' ? undefined : 40,
            resize: as === 'textarea' ? 'vertical' : undefined,
            minHeight: as === 'textarea' ? 72 : undefined,
            ...style,
          }}
          {...rest}
        />
      </span>
      {hint && (
        <span
          style={{
            display: 'block',
            marginTop: 6,
            fontSize: 'var(--text-caption-size)',
            color: invalid ? 'var(--danger)' : 'var(--text-muted)',
          }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}
