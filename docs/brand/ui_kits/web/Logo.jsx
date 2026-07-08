// RzLogo — theme-aware Rhizolve mark. Swaps to the dark asset when the document
// (or nearest ancestor) carries data-theme="dark", so the wordmark stays legible
// in both modes. Pass through style / onClick / alt like an <img>.
function RzLogo({ style, ...rest }) {
  const R = window.React;
  const [dark, setDark] = R.useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  R.useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.getAttribute('data-theme') === 'dark');
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    sync();
    return () => obs.disconnect();
  }, []);
  return R.createElement('img', {
    src: dark ? '../../assets/logo-dark.svg' : '../../assets/logo-light.svg',
    alt: 'Rhizolve',
    style,
    ...rest,
  });
}
window.RzLogo = RzLogo;
