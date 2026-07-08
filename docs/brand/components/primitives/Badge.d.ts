import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Semantic tone. Node-status coral is intentionally NOT a badge tone — use NodeStatusMarker / StatusDot. */
  tone?: 'neutral' | 'accent' | 'success' | 'danger' | 'warning';
  children?: React.ReactNode;
}

/** Small pill label for domain tags, counts, maturity, compliance standards. */
export function Badge(props: BadgeProps): JSX.Element;
