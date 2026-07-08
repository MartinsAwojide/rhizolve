import React from 'react';

export interface ValidatorReviewCardProps {
  /** The validator's proposed decision. */
  decision?: 'root_cause' | 'go_deeper';
  /** 0–1 confidence, shown as a meter + percentage. */
  confidence?: number;
  /** AI rationale (renders in the serif voice). */
  rationale?: React.ReactNode;
  onAccept?: () => void;
  onOverride?: () => void;
  style?: React.CSSProperties;
}

/** Validator-decision interrupt: accept or override the root-cause call, with confidence. */
export function ValidatorReviewCard(props: ValidatorReviewCardProps): JSX.Element;
