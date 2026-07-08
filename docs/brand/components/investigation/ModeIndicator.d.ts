import React from 'react';

export interface ModeIndicatorProps {
  /** Current routing mode. */
  mode?: 'shallow' | 'deep';
  /** Click opens the ModePopover for a manual override. */
  onClick?: () => void;
  style?: React.CSSProperties;
}

/** Subtle Shallow/Deep routing pill for the chat composer. */
export function ModeIndicator(props: ModeIndicatorProps): JSX.Element;
