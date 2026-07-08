# AGENTS.md — frontend/web/

React 19, Vite, TypeScript, Tailwind. Node 22, `pnpm`.

## Commands

- Install: `pnpm install`
- Dev server (proxies `/api` to backend per `vite.config.ts`): `pnpm dev`
- Tests: `pnpm vitest --run`
- Lint: `pnpm eslint .`
- Type check: `pnpm tsc --noEmit`
- Add a dependency: `pnpm add <package>` — dev: `pnpm add -D <package>`

## Code style

- Functional components and hooks only. No class components.
- TanStack Query owns all server state — no server data living in `useState`/`useEffect` fetch patterns.
- Design tokens come from `DESIGN.md`'s front matter, never ad hoc hex values. Every colour token carries both `light` and `dark` values — see `tests/design/test_token_parity.py` for what CI enforces, including a structural check that no token is missing a mode.
- Structured card pattern used throughout the chat UI:
```tsx
export function GembaCheckCard({ hypothesis, instructions, onSubmit }: GembaCheckCardProps) {
  const [result, setResult] = useState<GembaResult | null>(null)
  return (
    <Card>
      <ResultRadioGroup value={result} onChange={setResult} />
      <Button disabled={!result} onClick={() => onSubmit({ result })}>Submit</Button>
    </Card>
  )
}
```

## Testing

- Vitest + React Testing Library. Query by role or label text, not test IDs — except the why-tree canvas, which has no accessible role to query by.
- Mock server responses with MSW (`server.use(http.post(...))`), not manual `fetch` mocks.

## Boundaries

- Never store investigation or session data in `localStorage`/`sessionStorage`. Artifacts and the main app both forbid it — use React state or the backend as source of truth.
- Never call an `[third_party_mcp_app]`-tagged connector tool directly without going through connector suggestion first — applies to any UI code proposing a third-party integration action, not just chat responses.

## Definition of Done (frontend/web)

- [ ] `pnpm eslint .` and `pnpm tsc --noEmit` clean
- [ ] `pnpm vitest --run` green
- [ ] New design tokens added to `DESIGN.md`, never hardcoded in a component
