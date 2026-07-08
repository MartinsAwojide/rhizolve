import React from 'react';

export type GembaResult = 'OK' | 'NOK' | 'ROOT_CAUSE';

export interface GembaCheckCardProps {
  /** The hypothesis being physically / procedurally verified. */
  hypothesis: string;
  /** Plain-language instructions for the operator. */
  instructions: string;
  /** Branch id (e.g. "3.1") shown in mono. */
  branch?: string;
  onSubmit?: (payload: { result: GembaResult }) => void;
  style?: React.CSSProperties;
}

/**
 * Field verification interrupt: evidence-first, three stacked ≥56dp result
 * buttons (OK hollow · NOK coral · Root cause green-plus). Docks inline in chat.
 * @startingPoint section="Chat" subtitle="Gemba check interrupt card" viewport="560x620"
 */
export function GembaCheckCard(props: GembaCheckCardProps): JSX.Element;
