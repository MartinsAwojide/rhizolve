import React from 'react';

export interface SuggestionCardProps {
  /** The node id the suggested branch would attach to (e.g. "1.2"). */
  targetNode?: string;
  /** The AI-proposed hypothesis / branch text (renders in the serif voice). */
  suggestion: React.ReactNode;
  /** Human validation — the graph only transforms on accept. */
  onAccept?: () => void;
  onDismiss?: () => void;
  style?: React.CSSProperties;
}

/**
 * AI Co-Pilot staged suggestion: a dashed-outline serif card proposing a branch,
 * gated behind explicit human acceptance. The agent never mutates the tree itself.
 */
export function SuggestionCard(props: SuggestionCardProps): JSX.Element;
