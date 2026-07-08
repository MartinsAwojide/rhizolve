// DashboardScreen — project grid + metrics row + needs-attention rail.
const { ProjectCard, Card, Badge, Button } = window.RhizolveDesignSystem_959827;
const RzLogo = window.RzLogo;

const PROJECTS = [
  { name: 'Line 3 seal failures', domain: 'Manufacturing', description: 'Recurring conveyor stoppages on the packaging line.', status: 'active', investigations: 2, maturity: 4, members: 5, visibility: 'Team' },
  { name: 'Checkout latency spikes', domain: 'IT infrastructure', description: 'Intermittent p99 latency on the payments service.', status: 'active', investigations: 1, maturity: 3, members: 3, visibility: 'Organisation' },
  { name: 'Batch 22 potency drift', domain: 'Pharmaceuticals', description: 'Assay results trending below spec across three lots.', status: 'draft', investigations: 0, maturity: 5, members: 2, visibility: 'Private' },
  { name: 'Turbine vibration alarm', domain: 'Utilities & energy', description: 'Bearing-2 vibration exceeding threshold intermittently.', status: 'active', investigations: 1, maturity: 4, members: 4, visibility: 'Team' },
  { name: 'Claims backlog SLA miss', domain: 'Financial services', description: 'Tier-2 claims exceeding the 5-day resolution SLA.', status: 'closed', investigations: 0, maturity: 2, members: 6, visibility: 'Organisation' },
];

const METRICS = [
  { label: 'Active investigations', value: '7' },
  { label: 'Root causes found', value: '34' },
  { label: 'Avg depth to cause', value: '3.8' },
  { label: 'Gemba completion', value: '92%' },
];

const ATTENTION = [
  { kind: 'Gemba assigned', text: 'Worn seal check · branch 3.1', dot: 'var(--node-active)' },
  { kind: 'Conflict flag', text: 'Field result disputes 2.4', dot: 'var(--node-conflict)' },
  { kind: 'Awaiting quorum', text: 'Turbine vibration · 2 of 3 ready', dot: 'var(--accent)' },
];

function DashboardScreen({ onOpenProject, onSignOut }) {
  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--surface-0)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 28px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'color-mix(in srgb, var(--surface-0) 88%, transparent)', backdropFilter: 'blur(8px)', zIndex: 2 }}>
        <RzLogo style={{ height: 30 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button variant="secondary" size="sm" onClick={onSignOut}>Sign out</Button>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-fill)', color: 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500 }}>AR</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 28, padding: '28px', maxWidth: 1200, margin: '0 auto' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 22, color: 'var(--text-primary)', margin: '0 0 18px' }}>Projects</h1>

          {/* Metrics row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {METRICS.map((m) => (
              <Card key={m.label} elevation="sm" style={{ padding: 16 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{m.label}</div>
              </Card>
            ))}
          </div>

          {/* Project grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {PROJECTS.map((p, i) => (
              <ProjectCard key={i} project={p} onClick={() => onOpenProject?.(p)} />
            ))}
            {/* New project card */}
            <button onClick={() => onOpenProject?.(PROJECTS[0])} style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 12, background: 'transparent', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              + New project
            </button>
          </div>
        </div>

        {/* Needs-attention rail */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 16, color: 'var(--text-primary)', margin: '2px 0 12px' }}>Needs attention</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ATTENTION.map((a, i) => (
              <Card key={i} elevation="sm" style={{ padding: 14, cursor: 'pointer' }} onClick={() => onOpenProject?.(PROJECTS[0])}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.dot }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'none' }}>{a.kind}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-primary)' }}>{a.text}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.DashboardScreen = DashboardScreen;
