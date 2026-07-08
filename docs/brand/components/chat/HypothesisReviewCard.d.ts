import React from 'react';

export interface Hypothesis {
  id?: string;
  text: string;
}

export interface HypothesisReviewCardProps {
  /** Ranked candidates. Strings or {id, text}. */
  hypotheses: (Hypothesis | string)[];
  onConfirm?: () => void;
  onRemove?: (id: string | number) => void;
  onAdd?: () => void;
  style?: React.CSSProperties;
}

/** Hypothesis-review interrupt: remove / reorder / add before generating Gemba checks. */
export function HypothesisReviewCard(props: HypothesisReviewCardProps): JSX.Element;
