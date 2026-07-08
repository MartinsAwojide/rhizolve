// Mobile screens for the Rhizolve Android client (chat-first + Gemba field surface).
const MNS = window.RhizolveDesignSystem_959827;
const { Button, ChatBubble, GembaCheckCard, ConnectivityIndicator, NodeStatusMarker } = MNS;

function TopBar({ title, connectivity, onMenu }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>{title}</span>
      <div style={{ marginLeft: 'auto' }}><ConnectivityIndicator mode={connectivity} /></div>
    </div>
  );
}

function TabRow({ tab, setTab }) {
  const tabs = [['chat', 'Chat'], ['tree', 'Why tree']];
  return (
    <div style={{ display: 'flex', borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
      {tabs.map(([k, l]) => (
        <button key={k} onClick={() => setTab(k)} style={{ flex: 1, minHeight: 52, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: tab === k ? 'var(--accent)' : 'var(--text-muted)', borderTop: tab === k ? '2px solid var(--accent)' : '2px solid transparent' }}>{l}</button>
      ))}
    </div>
  );
}

// Chat-first investigation screen
function MobileChatScreen({ connectivity, onOpenGemba }) {
  const [tab, setTab] = React.useState('chat');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-0)' }}>
      <TopBar title="Line 3 seal failures" connectivity={connectivity} />
      {tab === 'chat' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>
          <ChatBubble author="user" name="You">Line 3 keeps stopping mid-shift.</ChatBubble>
          <ChatBubble author="agent">Opening a Deep-mode run. I have a Gemba check ready for the worn-seal hypothesis on branch 1.2.2.</ChatBubble>
          <div style={{ margin: '10px 0' }}>
            <button onClick={onOpenGemba} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 56, padding: '0 14px', borderRadius: 8, border: '2px solid var(--node-active)', background: 'color-mix(in srgb, var(--node-active) 10%, var(--surface-2))', cursor: 'pointer', textAlign: 'left' }}>
              <NodeStatusMarker status="active" size={26} />
              <span>
                <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Gemba check assigned</span>
                <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)' }}>Worn conveyor seal · tap to open</span>
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, paddingTop: 8 }}>
            {[['active', 'Line 3 stops mid-shift', 36], ['active', 'Drive motor overheats', 32], ['rootCause', 'Worn conveyor seal', 32]].map(([s, l, sz], i) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <NodeStatusMarker status={s} size={sz} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)' }}>{l}</span>
                </div>
                {i < 2 && <div style={{ width: 2, height: 18, background: 'var(--border-strong)' }} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      {/* Composer */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
        <button style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' }}>🎙</button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)' }}>Message…</div>
        <Button variant="primary" style={{ height: 44 }}>Send</Button>
      </div>
      <TabRow tab={tab} setTab={setTab} />
    </div>
  );
}

// Full-screen Gemba field surface
function MobileGembaScreen({ connectivity, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-0)' }}>
      <TopBar title="Gemba check" connectivity={connectivity} />
      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '2px 0 12px' }}>‹ Back to chat</button>
        <GembaCheckCard hypothesis="Worn conveyor seal on line 3" instructions="Inspect the seal at station 3. Record what you observe, photograph any wear, then choose a result." branch="1.2.2" onSubmit={onBack} style={{ maxWidth: '100%' }} />
      </div>
    </div>
  );
}

Object.assign(window, { MobileChatScreen, MobileGembaScreen });
