import React from 'react';

export interface StatusDotProps {
  /** Project status. active = solid coral · closed = hollow grey · draft = amber. */
  status?: 'active' | 'closed' | 'draft';
  size?: number;
  /** Show the text label beside the dot. */
  withLabel?: boolean;
  style?: React.CSSProperties;
}

/** Project / investigation status dot for dashboard cards. */
export function StatusDot(props: StatusDotProps): JSX.Element;
