// WhyTree — cosmetic recreation of the interactive xyflow why-tree.
// Static d3-hierarchy-style top-down layout with orthogonal (right-angle)
// connectors and NodeStatusMarker nodes. Node size encodes depth/importance.
const { NodeStatusMarker } = window.RhizolveDesignSystem_959827;

// Hand-laid tree: {id, label, status, x, y, size, parent}
const WHY_NODES = [
  { id: '1',   label: 'Line 3 stops mid-shift', status: 'active',    x: 200, y: 40,  size: 40, parent: null },
  { id: '1.1', label: 'Belt slips under load',   status: 'ruledOut',  x: 90,  y: 150, size: 30, parent: '1' },
  { id: '1.2', label: 'Drive motor overheats',   status: 'active',    x: 310, y: 150, size: 34, parent: '1' },
  { id: '1.2.1', label: 'Coolant flow low',      status: 'suspended', x: 220, y: 262, size: 28, parent: '1.2' },
  { id: '1.2.2', label: 'Worn conveyor seal',    status: 'rootCause', x: 380, y: 262, size: 34, parent: '1.2' },
];

function orthPath(a, b) {
  const midY = a.y + (b.y - a.y) / 2;
  return `M ${a.x} ${a.y} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${b.y}`;
}

function WhyTree({ onNodeClick, selected }) {
  const byId = Object.fromEntries(WHY_NODES.map((n) => [n.id, n]));
  const edges = WHY_NODES.filter((n) => n.parent).map((n) => ({ from: byId[n.parent], to: n }));
  return (
    <div style={{ position: 'relative', width: '100%', height: 340 }}>
      <svg width="100%" height="340" viewBox="0 40 480 320" style={{ position: 'absolute', inset: 0 }}>
        {edges.map((e, i) => (
          <path key={i} d={orthPath(e.from, e.to)} fill="none"
            stroke="var(--border-strong)" strokeWidth="1.5" />
        ))}
      </svg>
      {WHY_NODES.map((n) => (
        <button key={n.id} onClick={() => onNodeClick?.(n)}
          title={n.label}
          style={{
            position: 'absolute', left: n.x, top: n.y,
            transform: 'translate(-50%, -50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 4,
            width: 120,
          }}>
          <span style={{
            padding: 3, borderRadius: '50%',
            boxShadow: selected === n.id ? '0 0 0 3px color-mix(in srgb, var(--accent) 40%, transparent)' : 'none',
          }}>
            <NodeStatusMarker status={n.status} size={n.size} />
          </span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, lineHeight: 1.2, color: 'var(--text-secondary)', textAlign: 'center' }}>
            {n.label}
          </span>
        </button>
      ))}
    </div>
  );
}

window.WhyTree = WhyTree;
