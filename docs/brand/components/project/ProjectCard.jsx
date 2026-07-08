import React from 'react';
import { Card } from '../primitives/Card.jsx';
import { Badge } from '../primitives/Badge.jsx';
import { StatusDot } from '../investigation/StatusDot.jsx';
import { MaturityMeter } from '../investigation/MaturityMeter.jsx';

/**
 * ProjectCard — a project tile on the dashboard grid. Shows name, domain badge,
 * one-line description, status dot (coral = active), active-investigation count,
 * maturity level, and member count.
 */
export function ProjectCard({ project = {}, onClick, style = {} }) {
  const {
    name = 'Untitled project',
    domain = 'General',
    description = '',
    status = 'active',
    investigations = 0,
    maturity = 3,
    members = 1,
    visibility = 'Team',
  } = project;

  return (
    <Card
      elevation="sm"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 260, ...style }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <StatusDot status={status} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </span>
        </div>
        <Badge tone="neutral">{domain}</Badge>
      </div>

      {description && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, textWrap: 'pretty' }}>
          {description}
        </div>
      )}

      <MaturityMeter level={maturity} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 2, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>
        <span><strong style={{ color: 'var(--text-secondary)', fontWeight: 'var(--weight-medium)' }}>{investigations}</strong> active</span>
        <span><strong style={{ color: 'var(--text-secondary)', fontWeight: 'var(--weight-medium)' }}>{members}</strong> members</span>
        <span style={{ marginLeft: 'auto' }}>{visibility}</span>
      </div>
    </Card>
  );
}
