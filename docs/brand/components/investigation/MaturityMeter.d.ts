import React from 'react';

export interface MaturityMeterProps {
  /** Maturity level 1–5. Governs hypothesis complexity. */
  level?: number;
  /** Show the "L3 · Defined" label after the segments. */
  showLabel?: boolean;
  style?: React.CSSProperties;
}

/** The 1–5 organisation maturity scale (Basic → Optimising). */
export function MaturityMeter(props: MaturityMeterProps): JSX.Element;
