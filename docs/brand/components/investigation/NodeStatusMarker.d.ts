import React from 'react';

export type NodeStatus =
  | 'active'      // solid coral ring, surface fill — branch under review
  | 'confirmed'   // solid coral fill — Gemba NOK, verified real cause
  | 'ruledOut'    // grey outline, faded 50% — Gemba OK dead end
  | 'rootCause'   // green outline + subtle teal fill + green-plus
  | 'suspended'   // dashed blue outline — soft-reset branch
  | 'conflict';   // split donut — field result disputes closed branch

export interface NodeStatusMarkerProps {
  status?: NodeStatus;
  /** Pixel diameter. Node size encodes depth / importance in the tree. */
  size?: number;
  /** Draw the red-X emphatic treatment on a ruled-out node. */
  emphaticRuledOut?: boolean;
  style?: React.CSSProperties;
}

/**
 * The five-state node vocabulary of the why-tree and fault-tree. The one place
 * coral is allowed. Identical across xyflow tree, report SVG, and Android buttons.
 * @startingPoint section="Investigation" subtitle="Node-status vocabulary — the coral system" viewport="700x150"
 */
export function NodeStatusMarker(props: NodeStatusMarkerProps): JSX.Element;
