// LoginScreen — Rhizolve sign-in. Warm editorial split: brand rail + form card.
const { Button, Input } = window.RhizolveDesignSystem_959827;
const RzLogo = window.RzLogo;

function LoginScreen({ onSignIn }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', height: '100%', background: 'var(--surface-0)' }}>
      {/* Brand rail */}
      <div style={{ background: 'var(--surface-1)', borderRight: '1px solid var(--border)', padding: '56px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <RzLogo style={{ height: 40 }} />
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 30, lineHeight: 1.25, color: 'var(--text-primary)', margin: '0 0 16px', maxWidth: 420 }}>
            From observation to verified root cause.
          </h1>
          <p style={{ fontFamily: 'var(--font-voice)', fontSize: 18, lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0, maxWidth: 400 }}>
            A structured 5&nbsp;Whys investigation any team can trust — defensible regardless of who reviews it.
          </p>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>Internal enterprise tool · ISO 9001 output</div>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: 340 }}>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 22, color: 'var(--text-primary)', margin: '0 0 4px' }}>Sign in</h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px' }}>Continue to your projects</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Work email" placeholder="you@company.com" defaultValue="a.rivera@northform.io" />
            <Input label="Password" type="password" defaultValue="········" />
            <Button variant="primary" size="lg" onClick={onSignIn} style={{ width: '100%', marginTop: 4 }}>Sign in</Button>
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', marginTop: 20, textAlign: 'center' }}>
            No account? <a href="#" onClick={(e) => { e.preventDefault(); onSignIn?.(); }} style={{ color: 'var(--accent)', fontWeight: 500 }}>Request access</a>
          </p>
        </div>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
