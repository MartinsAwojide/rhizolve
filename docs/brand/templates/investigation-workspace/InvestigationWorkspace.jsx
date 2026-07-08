// InvestigationWorkspace — self-contained three-column workspace for the DC
// template. Reads design-system components from the compiled bundle namespace,
// inlines the why-tree (no cross-file window deps), registers on window so the
// DC's <x-import> can mount it. Edit freely — this is a starting point.

const SIDEBAR = [
  { name: 'Line 3 seal failures', active: true },
  { name: 'Checkout latency spikes', active: false },
  { name: 'Turbine vibration alarm', active: false },
];
const PRESENCE = [
  { initials: 'AR', role: 'Owner', driver: true, color: 'var(--accent-fill)' },
  { initials: 'JT', role: 'Analyst', driver: false, color: '#0F6E56' },
  { initials: 'MK', role: 'Operator', driver: false, color: '#854F0B' },
];
const TREE = [
  { id: '1',     label: 'Line 3 stops mid-shift', status: 'active',    x: 190, y: 36,  size: 38, parent: null },
  { id: '1.1',   label: 'Belt slips',             status: 'ruledOut',  x: 84,  y: 140, size: 28, parent: '1' },
  { id: '1.2',   label: 'Motor overheats',        status: 'active',    x: 300, y: 140, size: 32, parent: '1' },
  { id: '1.2.1', label: 'Coolant flow low',       status: 'suspended', x: 220, y: 244, size: 26, parent: '1.2' },
  { id: '1.2.2', label: 'Worn conveyor seal',     status: 'rootCause', x: 372, y: 244, size: 32, parent: '1.2' },
];
const LEGEND = [['active', 'Active'], ['ruledOut', 'Ruled out'], ['rootCause', 'Root cause'], ['suspended', 'Suspended'], ['conflict', 'Conflict']];

function orth(a, b) { const m = a.y + (b.y - a.y) / 2; return `M ${a.x} ${a.y} L ${a.x} ${m} L ${b.x} ${m} L ${b.x} ${b.y}`; }

function WsLogo(props) {
  const R = window.React;
  const [dark, setDark] = R.useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  R.useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.getAttribute('data-theme') === 'dark');
    const obs = new MutationObserver(sync); obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] }); sync();
    return () => obs.disconnect();
  }, []);
  return R.createElement('img', { src: dark ? '../../assets/logo-dark.svg' : '../../assets/logo-light.svg', alt: 'Rhizolve', ...props });
}

function InvestigationWorkspace() {
  const React = window.React;
  const WS = window.RhizolveDesignSystem_959827 || {};
  const {
    Button, Input, Badge, ChatBubble, ModeIndicator, NodeStatusMarker,
    GembaCheckCard, ValidatorReviewCard, CountermeasureReviewCard,
  } = WS;
  const [messages, setMessages] = React.useState([
    { author: 'user', name: 'A. Rivera', text: 'Line 3 keeps stopping mid-shift, roughly twice a day.' },
    { author: 'agent', text: 'That is worth a full investigation. I have opened a Deep-mode run and extracted the phenomenon, domain (manufacturing) and maturity (L4). Confirm to proceed.' },
    { author: 'system', text: 'Switched to Deep mode · inv-8f21c' },
  ]);
  const [card, setCard] = React.useState('gemba');
  const [draft, setDraft] = React.useState('');
  const [legendOpen, setLegendOpen] = React.useState(false);
  const [sel, setSel] = React.useState('1.2.2');
  const scrollRef = React.useRef(null);
  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, card]);

  const send = () => {
    if (!draft.trim()) return;
    setMessages((m) => [...m, { author: 'user', name: 'A. Rivera', text: draft.trim() }]);
    setDraft('');
    setTimeout(() => setMessages((m) => [...m, { author: 'agent', text: 'Noted — I have injected that into the investigation context and re-ranked the open hypotheses.' }]), 400);
  };
  const next = () => {
    const order = ['gemba', 'validator', 'countermeasure', 'none'];
    setCard((c) => order[Math.min(order.indexOf(c) + 1, order.length - 1)]);
  };
  const renderCard = () => {
    if (card === 'gemba') return <GembaCheckCard hypothesis="Worn conveyor seal on line 3" instructions="Inspect the seal at station 3. Photograph any wear or debris before deciding." branch="1.2.2" onSubmit={next} />;
    if (card === 'validator') return <ValidatorReviewCard decision="root_cause" confidence={0.86} rationale="The Gemba check confirms seal wear, and no deeper cause remains unexamined on this branch." onAccept={next} onOverride={next} />;
    if (card === 'countermeasure') return <CountermeasureReviewCard rootCause="Worn conveyor seal, line 3" countermeasure="Replace the seal and add a monthly wear inspection to the preventive-maintenance schedule for line 3." onAccept={next} onReject={next} onEdit={next} />;
    return null;
  };
  const byId = Object.fromEntries(TREE.map((n) => [n.id, n]));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 400px', height: '100vh', background: 'var(--surface-0)', fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar */}
      <aside style={{ borderRight: '1px solid var(--border)', background: 'var(--surface-1)', display: 'flex', flexDirection: 'column', padding: 16 }}>
        <WsLogo style={{ height: 28, marginBottom: 20, alignSelf: 'flex-start' }} />
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>Projects</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SIDEBAR.map((p) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: p.active ? 'var(--surface-2)' : 'transparent', border: p.active ? '1px solid var(--border)' : '1px solid transparent', cursor: 'pointer' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.active ? 'var(--node-active)' : 'var(--border-strong)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: p.active ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: p.active ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
            </div>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>proj-014 · L4 manufacturing</div>
      </aside>

      {/* Chat */}
      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Line 3 seal failures</div>
          <div style={{ display: 'flex', marginLeft: 8 }}>
            {PRESENCE.map((p, i) => (
              <div key={p.initials} title={p.role} style={{ width: 28, height: 28, borderRadius: '50%', background: p.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, marginLeft: i ? -6 : 0, border: p.driver ? '2px solid var(--accent)' : '2px solid var(--surface-0)' }}>{p.initials}</div>
            ))}
          </div>
          <Badge tone="accent" style={{ marginLeft: 4 }}>A. Rivera driving</Badge>
          <div style={{ marginLeft: 'auto' }}><Button variant="secondary" size="sm">Export report</Button></div>
        </div>
        <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {messages.map((m, i) => <ChatBubble key={i} author={m.author} name={m.name}>{m.text}</ChatBubble>)}
          {card !== 'none' && <div style={{ margin: '8px 0 4px' }}>{renderCard()}</div>}
        </div>
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ModeIndicator mode="deep" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>type <span style={{ fontFamily: 'var(--font-mono)' }}>/btw</span> for a side question</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input as="textarea" placeholder="Message the investigation…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} style={{ minHeight: 44 }} />
            </div>
            <Button variant="primary" onClick={send}>Send</Button>
          </div>
        </div>
      </main>

      {/* Why-tree */}
      <aside style={{ borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Why tree</div>
          <button onClick={() => setLegendOpen((o) => !o)} style={{ fontSize: 12, color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}>{legendOpen ? 'Hide legend' : 'Legend'}</button>
        </div>
        {legendOpen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }}>
            {LEGEND.map(([s, l]) => <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}><NodeStatusMarker status={s} size={14} /> {l}</span>)}
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          <div style={{ position: 'relative', width: '100%', height: 320 }}>
            <svg width="100%" height="320" viewBox="0 36 460 300" style={{ position: 'absolute', inset: 0 }}>
              {TREE.filter((n) => n.parent).map((n, i) => <path key={i} d={orth(byId[n.parent], n)} fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />)}
            </svg>
            {TREE.map((n) => (
              <button key={n.id} onClick={() => setSel(n.id)} title={n.label} style={{ position: 'absolute', left: n.x, top: n.y, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, width: 110 }}>
                <span style={{ padding: 3, borderRadius: '50%', boxShadow: sel === n.id ? '0 0 0 3px color-mix(in srgb, var(--accent) 40%, transparent)' : 'none' }}>
                  <NodeStatusMarker status={n.status} size={n.size} />
                </span>
                <span style={{ fontSize: 10.5, lineHeight: 1.2, color: 'var(--text-secondary)', textAlign: 'center' }}>{n.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>depth 3 · 5 nodes · 1 root cause</div>
      </aside>
    </div>
  );
}

// A no-op component for <x-import> to render safely (no hooks, so it never
// touches a hook dispatcher). The real workspace is mounted by the DC logic
// class with the page's own React.
function RzWorkspaceLoader() { return null; }
window.RzWorkspaceLoader = RzWorkspaceLoader;

(function attach() {
  if (window.React && window.RhizolveDesignSystem_959827) {
    window.InvestigationWorkspace = InvestigationWorkspace;
  } else {
    setTimeout(attach, 30);
  }
})();
