import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shadow depth. `flat` = border only. */
  elevation?: 'flat' | 'sm' | 'md' | 'lg';
  /** Apply default 16px padding. Set false for edge-to-edge content (e.g. media). */
  padded?: boolean;
  children?: React.ReactNode;
}

export interface CardHeaderProps {
  title: React.ReactNode;
  /** Right-aligned meta slot (badge, timestamp, menu). */
  meta?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Raised surface-2 container, 12px radius, hairline border. */
export function Card(props: CardProps): JSX.Element;
export function CardHeader(props: CardHeaderProps): JSX.Element;
