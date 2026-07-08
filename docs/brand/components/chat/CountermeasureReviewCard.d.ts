import React from 'react';

export interface CountermeasureReviewCardProps {
  /** The confirmed root cause this countermeasure addresses. */
  rootCause?: React.ReactNode;
  /** AI-drafted corrective action (serif voice). */
  countermeasure: React.ReactNode;
  onAccept?: () => void;
  onEdit?: () => void;
  onReject?: () => void;
  style?: React.CSSProperties;
}

/** Countermeasure-review interrupt: accept, edit, or reject the AI-drafted corrective action. */
export function CountermeasureReviewCard(props: CountermeasureReviewCardProps): JSX.Element;
