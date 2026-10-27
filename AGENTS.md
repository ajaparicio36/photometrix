# Repository instructions

## Repository context

Before planning or editing, identify the repository root and read the applicable `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, and `CONTEXT.md` files that exist. Check for narrower copies along the path to each file being changed. Follow instruction priority and scope; surface material conflicts instead of guessing.

## CodeGraph

When `.codegraph/` exists at the root, use CodeGraph before text searches or opening files to locate or understand code. Prefer the `codegraph_explore` MCP tool, naming the relevant file, symbol, or question; otherwise run `codegraph explore "<symbol names or question>"`. If `.codegraph/` is absent, skip CodeGraph; indexing is the user's decision.

## Parallel work and integration

Before parallel implementation tasks that could conflict in one checkout, invoke `using-git-worktrees`. Give each task its own branch and isolated worktree, record its parent branch, and reuse existing isolation instead of nesting worktrees. Read-only or clearly non-conflicting work needs no worktree.

After implementation and required tests pass in a worktree, invoke `finishing-a-development-branch`, present its integration choices, and wait for the user's selection. A subagent returns this decision point to the coordinator or user; it does not choose, merge, push, create a PR, delete a branch, or remove a worktree on its own.

For a GitHub worktree based on a feature branch rather than the default or a normal integration branch (`main`, `master`, `dev`, or `develop`), check for an open parent-branch PR. If the user chooses to create a PR, ask whether to target that parent as a stacked PR. Use authenticated GitHub CLI when available. Use `gh stack` only after `gh stack --help` confirms availability; otherwise use `gh pr create --base <parent-branch>`.

## Automated QA

Run non-interactive unit, integration, static, and headless checks within the requested task without additional confirmation.

Before interactive QA that controls a graphical browser, Android emulator, or physical device, ask the user to confirm the shared resource is available. After confirmation, identify the exact browser session or device, scope interaction to the assigned application, and report exercised flows, collected evidence, and failures.

- For web UI QA, invoke `computer-use` and verify affected flows in Chrome.
- For Android UI QA, invoke `android-cli`; use Android CLI for building, running, layout inspection, and screenshots, and `adb` for device interaction.

## TypeScript

- Use `unknown` with type guards at uncertain boundaries; do not use `any`.
- Prefer `const`, explicit return types, no unused declarations, and `satisfies` for type-safe literals.
- Use discriminated unions, mapped and conditional types, template-literal types, `infer`, and utility types when they improve safety or clarity. Prefer a simpler precise type when sufficient.
- For each added or changed public route, include a working usage example and verify it end-to-end.

## Agent skills

### Issue tracker

Track issues in `.scratch/<feature>/issues/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Use one root glossary and `docs/adr/`. See `docs/agents/domain.md`.
