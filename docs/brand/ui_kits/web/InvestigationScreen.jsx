// InvestigationScreen — the three-column flagship: sidebar / chat / why-tree.
const NS = window.RhizolveDesignSystem_959827;
const {
  Button, Input, Badge, ChatBubble, ModeIndicator,
  GembaCheckCard, HypothesisReviewCard, ValidatorReviewCard, CountermeasureReviewCard,
} = NS;
const RzLogo = window.RzLogo;

const SIDEBAR_PROJECTS = [
  { name: 'Line 3 seal failures', active: true },
  { name: 'Checkout latency spikes', active: false },
  { name: 'Turbine vibration alarm', active: false },
  { name: 'Batch 22 potency drift', active: false },
];

const PRESENCE = [
  { initials: 'AR', name: 'A. Rivera', role: 'Owner', driver: true, color: 'var(--accent-fill)' },
  { initials: 'JT', name: 'J. Tan', role: 'Analyst', driver: false, color: '#0F6E56' },
  { initials: 'MK', name: 'M. Koch', role: 'Operator', driver: false, color: '#854F0B' },
];

const LEGEND = [
  ['active', 'Active'], ['ruledOut', 'Ruled out'], ['rootCause', 'Root cause'],
  ['suspended', 'Suspended'], ['conflict', 'Conflict'],
];

function InvestigationScreen({ onBack, onExportReport }) {
  const [messages, setMessages] = React.useState([
    { author: 'user', name: 'A. Rivera', text: 'Line 3 keeps stopping mid-shift, roughly twice a day.' },
    { author: 'agent', text: 'That is worth a full investigation. I have opened a Deep-mode 5 Whys run and extracted the phenomenon, domain (manufacturing) and maturity (L4). Confirm to proceed.' },
    { author: 'system', text: 'Switched to Deep mode · investigation inv-8f21c' },
  ]);
  const [card, setCard] = React.useState('gemba'); // gemba | hypothesis | validator | countermeasure | none
  const [draft, setDraft] = React.useState('');
  const [legendOpen, setLegendOpen] = React.useState(false);
  const [selectedNode, setSelectedNode] = React.useState('1.2.2');
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, card]);

  const send = () => {
    if (!draft.trim()) return;
    setMessages((m) => [...m, { author: 'user', name: 'A. Rivera', text: draft.trim() }]);
    setDraft('');
    setTimeout(() => setMessages((m) => [...m, { author: 'agent', text: 'Noted — I have injected that into the investigation context and re-ranked the open hypotheses.' }]), 400);
  };

  const advanceCard = () => {
    const order = ['gemba', 'validator', 'countermeasure', 'none'];
    setCard((c) => order[Math.min(order.indexOf(c) + 1, order.length - 1)]);
  };

  const renderCard = () => {
    if (card === 'gemba') return <GembaCheckCard hypothesis="Worn conveyor seal on line 3" instructions="Inspect the seal at station 3. Photograph any visible wear or debris before deciding." branch="1.2.2" onSubmit={advanceCard} />;
    if (card === 'hypothesis') return <HypothesisReviewCard hypotheses={[{ id: 'h1', text: 'Worn conveyor seal on line 3' }, { id: 'h2', text: 'Drive motor overheating' }]} onConfirm={advanceCard} />;
    if (card === 'validator') return <ValidatorReviewCard decision="root_cause" confidence={0.86} rationale="The Gemba check confirms seal wear, and no deeper cause remains unexamined on this branch." onAccept={advanceCard} onOverride={advanceCard} />;
    if (card === 'countermeasure') return <CountermeasureReviewCard rootCause="Worn conveyor seal, line 3" countermeasure="Replace the seal and add a monthly wear inspection to the preventive-maintenance schedule for line 3." onAccept={advanceCard} onReject={advanceCard} onEdit={advanceCard} />;
    return null;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 400px', height: '100%', background: 'var(--surface-0)' }}>
      {/* ---- Sidebar ---- */}
      <aside style={{ borderRight: '1px solid var(--border)', background: 'var(--surface-1)', display: 'flex', flexDirection: 'column', padding: 16 }}>
        <RzLogo style={{ height: 28, marginBottom: 20, alignSelf: 'flex-start', cursor: 'pointer' }} onClick={onBack} />
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'none' }}>Projects</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SIDEBAR_PROJECTS.map((p) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: p.active ? 'var(--surface-2)' : 'transparent', border: p.active ? '1px solid var(--border)' : '1px solid transparent', cursor: 'pointer' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.active ? 'var(--node-active)' : 'var(--border-strong)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: p.active ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: p.active ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
            </div>
          ))}
        </nav>
        <Button variant="ghost" size="sm" style={{ marginTop: 10, justifyContent: 'flex-start' }}>+ New project</Button>
        <div style={{ marginTop: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>proj-014 · L4 manufacturing</div>
      </aside>

      {/* ---- Chat (center) ---- */}
      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Presence bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Line 3 seal failures</div>
          <div style={{ display: 'flex', marginLeft: 8 }}>
            {PRESENCE.map((p, i) => (
              <div key={p.initials} title={`${p.name} · ${p.role}${p.driver ? ' · driver' : ''}`} style={{ width: 28, height: 28, borderRadius: '50%', background: p.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, marginLeft: i ? -6 : 0, border: p.driver ? '2px solid var(--accent)' : '2px solid var(--surface-0)' }}>{p.initials}</div>
            ))}
          </div>
          <Badge tone="accent" style={{ marginLeft: 4 }}>A. Rivera driving</Badge>
          <div style={{ marginLeft: 'auto' }}>
            <Button variant="secondary" size="sm" onClick={onExportReport}>Export report</Button>
          </div>
        </div>

        {/* Thread */}
        <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {messages.map((m, i) => (
            <ChatBubble key={i} author={m.author} name={m.name}>{m.text}</ChatBubble>
          ))}
          {card !== 'none' && (
            <div style={{ margin: '8px 0 4px' }}>{renderCard()}</div>
          )}
        </div>

        {/* Composer */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ModeIndicator mode="deep" />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>type <span style={{ fontFamily: 'var(--font-mono)' }}>/btw</span> for a side question</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input as="textarea" placeholder="Message the investigation…" value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                style={{ minHeight: 44 }} />
            </div>
            <Button variant="primary" onClick={send}>Send</Button>
          </div>
        </div>
      </main>

      {/* ---- Why-tree panel (right) ---- */}
      <aside style={{ borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Why tree</div>
          <button onClick={() => setLegendOpen((o) => !o)} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            {legendOpen ? 'Hide legend' : 'Legend'}
          </button>
        </div>
        {legendOpen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }}>
            {LEGEND.map(([s, l]) => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)' }}>
                <NS.NodeStatusMarker status={s} size={14} /> {l}
              </span>
            ))}
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          <WhyTree selected={selectedNode} onNodeClick={(n) => setSelectedNode(n.id)} />
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          depth 3 · 5 nodes · 1 root cause
        </div>
      </aside>
    </div>
  );
}

window.InvestigationScreen = InvestigationScreen;
