// ReportScreen — the completed-investigation report view (E08). Embeds the same
// static fault-tree SVG the PDF uses (node-status vocabulary), an AI TL;DR in the
// serif voice, root causes + countermeasures, a steering log, a download panel,
// and the HMAC signature footer in mono.
const RNS = window.RhizolveDesignSystem_959827;
const { Card, Badge, Button, NodeStatusMarker } = RNS;
const RzLogo = window.RzLogo;

const FT_NODES = [
  { id: '1',     label: 'Line 3 stops mid-shift', status: 'confirmed', x: 210, y: 34,  size: 34, parent: null },
  { id: '1.1',   label: 'Belt slips',             status: 'ruledOut',  x: 96,  y: 132, size: 26, parent: '1' },
  { id: '1.2',   label: 'Motor overheats',        status: 'confirmed', x: 324, y: 132, size: 30, parent: '1' },
  { id: '1.2.1', label: 'Coolant flow low',       status: 'ruledOut',  x: 244, y: 232, size: 26, parent: '1.2' },
  { id: '1.2.2', label: 'Worn conveyor seal',     status: 'rootCause', x: 392, y: 232, size: 32, parent: '1.2' },
];

function orth(a, b) {
  const midY = a.y + (b.y - a.y) / 2;
  return `M ${a.x} ${a.y} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${b.y}`;
}

function FaultTree() {
  const byId = Object.fromEntries(FT_NODES.map((n) => [n.id, n]));
  const edges = FT_NODES.filter((n) => n.parent).map((n) => ({ from: byId[n.parent], to: n }));
  const legend = [['confirmed', 'Confirmed cause'], ['ruledOut', 'Ruled out'], ['rootCause', 'Root cause']];
  return (
    <div>
      <div style={{ position: 'relative', width: '100%', height: 290, background: 'var(--surface-1)', borderRadius: 'var(--radius-control)', border: '1px solid var(--border)' }}>
        <svg width="100%" height="290" viewBox="0 20 490 280" style={{ position: 'absolute', inset: 0 }}>
          {edges.map((e, i) => <path key={i} d={orth(e.from, e.to)} fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />)}
        </svg>
        {FT_NODES.map((n) => (
          <div key={n.id} style={{ position: 'absolute', left: n.x, top: n.y, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 110 }}>
            <NodeStatusMarker status={n.status} size={n.size} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, lineHeight: 1.2, color: 'var(--text-secondary)', textAlign: 'center' }}>{n.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
        {legend.map(([s, l]) => (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)' }}>
            <NodeStatusMarker status={s} size={13} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 18, color: 'var(--text-primary)', margin: '0 0 12px' }}>{children}</h2>;
}

function ReportScreen({ onBack }) {
  const steering = [
    ['Hypothesis review', 'A. Rivera removed "contaminated lubricant"', '09:42'],
    ['Gemba check', 'M. Koch submitted NOK · worn seal', '11:18'],
    ['Validator decision', 'A. Rivera accepted root cause · 86%', '11:31'],
    ['Countermeasure', 'A. Rivera accepted corrective action', '11:35'],
  ];
  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--surface-0)' }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'color-mix(in srgb, var(--surface-0) 88%, transparent)', backdropFilter: 'blur(8px)', zIndex: 2 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>‹ Investigation</button>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Investigation report</span>
        <Badge tone="success" style={{ marginLeft: 4 }}>Complete</Badge>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <RzLogo style={{ height: 26 }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 24, color: 'var(--text-primary)', margin: '8px 0 6px' }}>Line 3 seal failures</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="neutral">Manufacturing</Badge>
            <Badge tone="accent">ISO 9001</Badge>
            <Badge tone="neutral">Maturity L4</Badge>
            <Badge tone="neutral">Depth 3</Badge>
          </div>
        </div>

        {/* TL;DR — serif voice */}
        <Card elevation="sm">
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>Summary (TL;DR)</div>
          <p style={{ fontFamily: 'var(--font-voice)', fontSize: 16, lineHeight: 1.65, color: 'var(--text-primary)', margin: 0 }}>
            Line 3 stopped roughly twice per shift. Investigation traced the phenomenon through motor overheating to a worn conveyor seal at station 3, confirmed by an on-floor Gemba check. Belt slippage and low coolant flow were ruled out. The countermeasure — seal replacement plus a monthly wear inspection added to preventive maintenance — was accepted. Time to verified root cause: 1&nbsp;h&nbsp;53&nbsp;m.
          </p>
        </Card>

        {/* Fault tree */}
        <div>
          <SectionTitle>Fault tree</SectionTitle>
          <FaultTree />
        </div>

        {/* Root causes + countermeasures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card elevation="sm">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <NodeStatusMarker status="rootCause" size={20} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Root cause</span>
            </div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>Worn conveyor seal on line 3, station 3 — allowed debris ingress and drive-motor overheating.</p>
          </Card>
          <Card elevation="sm">
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Countermeasure</div>
            <p style={{ fontFamily: 'var(--font-voice)', fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>Replace the seal and add a monthly wear inspection to the preventive-maintenance schedule for line 3.</p>
          </Card>
        </div>

        {/* Steering log */}
        <div>
          <SectionTitle>Steering decisions</SectionTitle>
          <Card elevation="sm" padded={false}>
            {steering.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', width: 46 }}>{s[2]}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--accent)', width: 130 }}>{s[0]}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>{s[1]}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Download panel */}
        <div>
          <SectionTitle>Export</SectionTitle>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="primary">Download PDF</Button>
            <Button variant="secondary">Markdown</Button>
            <Button variant="secondary">AIAG 8D</Button>
            <Button variant="ghost">Download all (ZIP)</Button>
          </div>
        </div>

        {/* Signature footer — mono */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.9 }}>
          <div>investigation inv-8f21c-3a · model attribution: openrouter/anthropic + cactus (2 nodes)</div>
          <div>sha-256 a3f9e1c7b0d4…82ce · hmac signed · <span style={{ color: 'var(--success)' }}>verified ✓</span></div>
        </div>
      </div>
    </div>
  );
}

window.ReportScreen = ReportScreen;
