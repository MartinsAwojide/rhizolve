import React from 'react';

export interface ConnectivityIndicatorProps {
  /** Auto-mode routing state. cloud = strong signal · hybrid = weak · local = offline. */
  mode?: 'cloud' | 'hybrid' | 'local';
  style?: React.CSSProperties;
}

/** Android auto-mode network / inference-routing indicator. Always visible in the field. */
export function ConnectivityIndicator(props: ConnectivityIndicatorProps): JSX.Element;
