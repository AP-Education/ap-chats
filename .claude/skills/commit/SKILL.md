---
name: commit
description: Split the working tree diff into coherent Conventional Commits. Use whenever the user asks to commit, split changes into commits, or clean up a messy diff into separate commits.
---

# Commit

Create commits for the changes requested by the user.

- Inspect relevant staged, unstaged, and untracked changes.
  Reuse existing context when it is still current.
- Follow repository commit conventions and configured validation.
- Group changes by coherent purpose. Keep implementation and its
  tests together; split independently useful, unrelated changes.
- Include only changes within the requested scope.
  Preserve unrelated edits and existing staging.
- Stage explicit files or hunks. Avoid broad staging commands.
- Use Conventional Commits, with a scope when useful.
  Write a concise subject describing the actual change.
- Add a body only when it provides useful context or rationale.
- Do not add co-author or generated-by attribution.
- Do not push unless explicitly requested.

## Commit message shape

```
type(scope): concrete outcome

Optional body explaining why, only if non-obvious.
```

Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `infra`, `perf`. Confirm actual types/scopes from `git log` rather than assuming this list.
