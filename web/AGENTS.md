## Architecture: app → pages → features → domain → shared

## Rules:

- shared cannot depend on business modules;
- domain cannot depend on features/pages
- pages compose features; avoid business logic
- features represent user capabilities
- domain represents business concepts
- avoid unnecessary comments that describes what code already do, try to avoid ascii chars inside comments or code at all
- feature/domain modules expose index.ts, but not at the bottom of the module

## Components:

- decompose by semantic responsibility, not LOC
- page components should primarily compose
- don't mix data fetching, orchestration and large JSX
- colocate single-use components
- promote to shared only after genuine reuse

## State:

- remote state belongs to the query layer, but data ownership belongs to the domain/feature that consumes it
- URL state belongs to router
- local interaction state stays local
- Zustand only for genuinely shared client state

## Ownership & Composition:

- keep code and state in the narrowest semantic scope that owns them; promote only when ownership genuinely expands
- use providers/context to expose cohesive feature or domain state and behavior to a subtree; avoid independent queries for data already owned by the surrounding scope
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
