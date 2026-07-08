import React from 'react';

export interface ProjectSummary {
  name: string;
  /** Domain label (Manufacturing, IT infrastructure, …). */
  domain: string;
  description?: string;
  status?: 'active' | 'closed' | 'draft';
  /** Count of active investigations. */
  investigations?: number;
  /** Maturity level 1–5. */
  maturity?: number;
  members?: number;
  visibility?: 'Private' | 'Team' | 'Organisation';
}

export interface ProjectCardProps {
  project: ProjectSummary;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * Dashboard project tile: status dot, domain badge, maturity, counts.
 * @startingPoint section="Project" subtitle="Dashboard project card" viewport="320x200"
 */
export function ProjectCard(props: ProjectCardProps): JSX.Element;
