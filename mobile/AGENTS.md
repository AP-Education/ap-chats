## Feature structure

Each `features/<name>/` follows the same shape (see `push/`, `calls/`):

- `api/` — HTTP calls
- `components/` — screens and invisible mount-only units (see below)
- `store/` — Zustand stores, when the feature owns cross-component state
- `types/` — the feature's public shape
- `utils/` — plain helpers with no React/Expo lifecycle of their own

Add only the folders a feature actually needs; don't scaffold empty ones.

## Side-effect-only units: components, not raw hooks

An app-wide side effect that has no UI of its own (register for push, wire a
native event listener) is a component that returns `null`, not a custom hook
called at the top of `App.tsx`. Mount it directly in the provider tree instead:

```tsx
<AppProviders>
  <PushRegistration />
  <CallSession />
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
