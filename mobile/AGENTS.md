## Feature structure

Each `features/<name>/` follows the same shape (see `push/`, `calls/`):

- `api/` — HTTP calls
- `components/` — screens and invisible mount-only units (see below)
- `store/` — Zustand stores, when the feature owns cross-component state
- `types/` — the feature's public shape
- `utils/` — plain helpers with no React/Expo lifecycle of their own
- `background/` — listeners and tasks that must work with no screen at all (a ring or a
  push can start the JS runtime alone); they start as the bundle loads, imported from
  `src/index.ts`

Add only the folders a feature actually needs; don't scaffold empty ones.

## Side-effect-only units: components, not raw hooks

An app-wide side effect that has no UI of its own (register for push, wire a
native event listener) is a component that returns `null`, not a custom hook
called at the top of `App.tsx`. Mount it directly in the provider tree instead:

```tsx
<AppProviders>
  <PushRegistration />
  <CallRuntime />
  ...
</AppProviders>
```

The effect lives directly in the component body — no separate `useXxx` hook
file to keep in sync with it. This mirrors `web/`'s
`ApiAuthSession`/`UserProfileSync` (see `web/src/app/providers/AppProviders.tsx`),
which use the same pattern for the same reason: it makes "this is an active,
mounted, side-effecting unit" visible directly in the JSX tree, rather than an
unlabeled call buried in a component's body.

Reach for an actual hook only when something needs to return a value or be
called conditionally by more than one caller — not for "runs once, does
something, renders nothing."

## Capabilities the page can rely on

The page learns what this shell can do from `ApApp<Name>/<n>` tokens in the WebView's
User-Agent, listed in `src/features/webview/utils/shell-user-agent.ts`. When a change
gives the page a new bridge message or native behaviour, add its token in the same
change, and make `web/` check the token rather than assume every shell has it. Shells
from the stores keep running old code for months, and over-the-air updates
(`docs/adr/0008-app-updates.md`) reach them in any order relative to web deploys.
