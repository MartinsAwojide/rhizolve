import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement & HTMLTextAreaElement> {
  /** Render as a single-line input or a multi-line textarea. */
  as?: 'input' | 'textarea';
  /** Optional field label (sentence case). */
  label?: React.ReactNode;
  /** Helper or error text below the field. */
  hint?: React.ReactNode;
  /** Show danger-coloured border + hint. */
  invalid?: boolean;
  /** Icon node inside the field, before the text. */
  leadingIcon?: React.ReactNode;
  wrapperStyle?: React.CSSProperties;
}

/** Text field / textarea with accent focus ring. Used in forms and the composer. */
export function Input(props: InputProps): JSX.Element;
