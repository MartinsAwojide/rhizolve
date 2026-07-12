# ADR-020 — Web Auth, Routing, and Query Stack

**Status:** Accepted
**Date:** 2026-07-12
**Sprint:** SP07 (US-32, login/register/dashboard)
**Refs:** [E05 Web Client](../agile/e05-web-client.md), [ADR-018](ADR-018-web-styling-and-testing-stack.md)

---

## Context

US-32 needed Clerk auth screens, protected routing, and a project
dashboard backed by server data — the first frontend story requiring
real runtime dependencies beyond React itself. `frontend/web/AGENTS.md`
already mandated TanStack Query for server state and named Clerk/routing
implicitly via the task list, but none of it existed in the codebase yet
(confirmed via exploration before this story: no Clerk package, no
router, no TanStack Query, `App.tsx` a flat unrouted placeholder).

## Decision

1. **`@clerk/react`, not `@clerk/clerk-react`.** The package manager
   flagged `@clerk/clerk-react` as deprecated during install; Clerk's Core
   3 upgrade guide confirms `@clerk/clerk-react` was renamed to
   `@clerk/react` (same exports — `ClerkProvider`, `SignIn`, `SignUp`,
   `useAuth`, verified against the installed package's type declarations).
   Installing the deprecated name would have shipped a dead-end package on
   day one.

2. **`react-router` v8, not v7.** `pnpm add react-router` resolved to v8
   (the plan assumed v7, written before checking the registry). v8's
   breaking change from v7: `RouterProvider` moved to `react-router/dom`;
   `createBrowserRouter`, `Link`, `Navigate`, `Outlet`, `useNavigate` stay
   in `react-router` itself (`react-router-dom` no longer re-exports
   anything in v8). `src/main.tsx` imports `RouterProvider` from
   `react-router/dom` accordingly; everything else in `src/router.tsx`
   and `ProtectedRoute.tsx` imports from `react-router`.

3. **`ProtectedRoute` is a layout route** (`element: <ProtectedRoute />`,
   children nested under it in `router.tsx`), not a wrapper component
   repeated per-route. It reads Clerk's `useAuth()` — renders nothing
   while `!isLoaded`, `<Navigate to="/login" replace />` when signed out,
   `<Outlet />` when signed in. `/login` and `/register` themselves stay
   outside the protected tree (Clerk's `<SignIn/>`/`<SignUp/>` render
   directly).

4. **`App.tsx` (the existing chat/investigation shell from US-31) is
   folded under `/projects/:id`**, and `/projects` gets the new
   `ProjectDashboardPage`. This wasn't in T01–T07's literal task list, but
   routing has to resolve somewhere — leaving `App` unrouted while adding
   a router would have been an inconsistent half-migration.

5. **MSW handlers/server wired for the first time**
   (`src/test/msw/handlers.ts`, `server.ts`), hooked into
   `src/test/setup.ts` via `beforeAll(server.listen({ onUnhandledRequest:
   'error' }))` / `afterEach(server.resetHandlers)` / `afterAll(server.close)`.
   `onUnhandledRequest: 'error'` was chosen over the default `'warn'` so a
   component that fetches an unmocked endpoint fails its test loudly
   rather than silently hanging on an unresolved promise.

6. **`projectStatus` DESIGN.md token group** (see `DESIGN.md`'s
   `tokens.projectStatus`, added alongside this story) is a separate
   group from `nodeStatus`, reusing identical hex values to
   `nodeStatus.active`/`nodeStatus.ruledOut`/`colors.warning` rather than
   pointing `ProjectCard`'s status dot straight at `nodeStatus`. This
   keeps `nodeStatus`'s "never used for UI chrome" comment literally true
   (a project-dashboard status dot is chrome, not an investigation-state
   graphic) while visually matching T07's "why-tree node vocabulary"
   intent. `tailwind.config.ts`/`src/styles/tokens.css` follow the same
   two-file token pipeline established in ADR-018.

## Consequences

- Any future Clerk-related code must import from `@clerk/react`;
  `@clerk/clerk-react` is not installed and importing it would fail.
- Any future router code must respect v8's split import paths
  (`RouterProvider` from `react-router/dom`, everything else from
  `react-router`) — this differs from most existing v6/v7 tutorials and
  AI training data, which assume the pre-v8 shape.
- `VITE_CLERK_PUBLISHABLE_KEY` is a required env var for the app to
  render at all (`ClerkProvider` needs it); documented in the new
  `frontend/web/.env.example`.
- The dashed "New project" card links to `/projects/new`, which currently
  falls through to the `/projects/:id` route (rendering the chat shell
  with `id="new"`) — no dedicated project-creation flow was built in this
  slice; that's a known gap, not a bug.

## Alternatives Considered

- **Pin `react-router@^7`** instead of accepting v8. Rejected: no
  functional reason to pin an older major when v8 was what actually
  installed and its breaking change (import path split) is small and now
  documented here; pinning back would fight the registry for no benefit.
- **Reuse `nodeStatus` tokens directly for `ProjectCard`'s status dot.**
  Rejected by the user in favor of a separate `projectStatus` group (see
  Decision 6) — keeps DESIGN.md's chrome/content separation principle
  intact rather than treating it as narrower than written.
