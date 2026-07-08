import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual role. `primary` = solid blue accent-fill (chrome). `danger` is outline red. Never coral. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Control height: sm 32 · md 40 · lg 48. */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Optional icon node placed before the label (e.g. a Lucide icon). */
  leadingIcon?: React.ReactNode;
  /** Optional icon node placed after the label. */
  trailingIcon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Primary chrome button. Blue accent only — coral is reserved for node-status.
 * @startingPoint section="Primitives" subtitle="Buttons — primary, secondary, ghost, danger" viewport="700x160"
 */
export function Button(props: ButtonProps): JSX.Element;
