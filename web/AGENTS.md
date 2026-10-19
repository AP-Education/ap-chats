## Architecture: app -> pages -> features -> shared

## Rules:

- shared cannot depend on features or pages; features cannot depend on pages
- pages and layouts compose features; avoid business logic
- features represent user capabilities and own the business concepts behind them
- comment only what the code cannot say; no decorative symbols (arrows, dashes, box drawing) in comments or code
- feature modules expose their public surface through types.ts; add index.ts only where a module genuinely needs one entry point, not by default

## Components:

- decompose by semantic responsibility, not LOC
- page components should primarily compose
- don't mix data fetching, orchestration and large JSX
- colocate single-use components
- promote to shared only after genuine reuse

## State:

- remote state belongs to the query layer, but data ownership belongs to the feature that consumes it
- URL state belongs to router
- local interaction state stays local
- Zustand only for genuinely shared client state

## Ownership & Composition:

- keep code and state in the narrowest semantic scope that owns them; promote only when ownership genuinely expands
- use providers/context to expose cohesive feature state and behavior to a subtree; avoid independent queries for data already owned by the surrounding scope
- expose semantic values and actions (`total`, `canEdit`, `createChannel`) rather than cache/query implementation details
- compose large features from cohesive internal parts; colocate their components, hooks, types, and helpers instead of organizing by technical type
- introduce nested modules only for meaningful semantic boundaries, not file count
- keep JSX declarative; avoid nested or substantial conditional markup
- use ternaries only for small presentation choices; prefer early returns or semantic component boundaries for distinct UI states

## Hooks:

- hooks encapsulate React behavior/integration
- don't create useX merely to hide arbitrary functions

## Abstractions:

- extract shared abstractions when semantics are shared, not merely because JSX looks similar

## Performance:

- an update renders only what it changes: entities keep their identity while unchanged, list items are memo boundaries, hooks and contexts return stable values
- static CSS modules with `var(--ant-*)` tokens; no runtime styles in list items
- often-changing values live on the elements that read them, not on large inherited subtrees
- no per-item sticky, blur or will-change without paint containment
- verify on a phone viewport with 4x CPU throttling
