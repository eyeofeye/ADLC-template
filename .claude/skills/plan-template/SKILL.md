---
name: plan-template
description: "Exact format for docs/changes/<id>/plan.md: tasks T1..Tn of about one reviewable commit each, with goal, files, tests, eval refs, critical flag, dependencies, verification commands, exit criteria and rollback; parallel-step detection and the plan mutation protocol. Load when writing, executing or reviewing a plan."
---

<!-- Attribution: the cold-start task brief (self-contained context), dependency edges with parallel/serial detection, per-task verification and exit criteria, rollback per task and the plan-mutation protocol (split, insert, skip, reorder, abandon, with audit trail) are adapted from ecc skills/blueprint/SKILL.md (affaan-m/ecc, commit d2ef268, MIT, Copyright (c) 2026 Affaan Mustafa; blueprint is marked origin: community and "inspired by antbotlab/blueprint", upstream license not checked). Dropped from blueprint: plans/ directory, git/gh mode detection, model-tier assignment, adversarial-review sub-agent, memory registration. Task fields are authored. See .claude/skills/VENDORED.md and THIRD_PARTY_NOTICES.md. -->

# Plan template

A plan breaks an approved `spec.md` into **tasks a builder can execute cold**. Path `docs/changes/<id>/plan.md`. Granularity: one task ≈ one reviewable commit; the whole change ships as one PR on branch `adlc/<id>`. Commit messages reference `T#`.

## Front matter
```yaml
---
id: YYYYMMDD-short-slug
spec: docs/changes/YYYYMMDD-short-slug/spec.md
status: draft            # draft | in-progress | done
revision: 1
---
```

## Task block (repeat; tasks are `T1..Tn`)
```markdown
### T3 · Add RLS policy and negative tests for the items table
- **Goal:** one sentence, observable.
- **Spec refs:** RQ-2, AC-001
- **Files:** supabase/migrations/0003_items_rls.sql, supabase/tests/rls.test.ts
- **Critical:** yes            # from the critical-paths script on `Files`
- **Depends on:** T1, T2       # [] if none
- **Context brief:** what a fresh agent must know (links to skills/ADRs, current state, constraints); do not assume earlier tasks were read.
- **Steps:** short numbered list (no code dumps).
- **Tests / eval refs:** tests to add; eval ids from the spec's eval plan (E-4, E-5).
- **Verify:** exact commands (e.g. `pnpm typecheck`, `pnpm test -- rls`), expected result.
- **Exit criteria:** observable conditions that make the task done.
- **Rollback:** how to undo (revert commit; migration down note).
```

## Rules
- Every spec requirement is covered by ≥ 1 task; every task cites ≥ 1 requirement. No task without a test or an eval ref (docs-only tasks say so).
- Order respects dependencies: migration before code that needs it; contract before consumers; flag before use.
- **Parallel detection:** tasks are parallelisable only if they share no files and neither consumes the other's output; add `Parallel with: T4, T5` to the task block only then; otherwise it is serial. The builder runs serially unless the plan says otherwise.
- `Critical: yes` must equal the script output (`node .claude/skills/critical-paths/scripts/critical-paths.mjs <files>`).
- Dev environment only: no task may write prod, run a database push against a non-dev ref or use a human-held operator token.
- A final task always runs the full verification (`eval-rubrics` six-step run) and updates docs/CHANGELOG/`VERSION` when the contract changed.
- Plans describe work; they contain no secrets.

## Mutation protocol (record every change in `## Revision log`)
| Action | Rule |
|---|---|
| Split | replace T# with T#a, T#b; keep dependencies; re-run the critical flag |
| Insert | new id at the end (T#+1…), never renumber existing ids |
| Skip | mark `skipped` with the reason; dependents re-checked |
| Reorder | allowed only if dependencies still hold |
| Abandon | mark `abandoned`, state why; if scope changes the spec, return to spec-designer, and to G1 if the intent changes |
Revision log row: `rev | date | task | action | reason`.

## Acceptance checks (planner self-check)
- [ ] Every requirement covered; every task ≤ ~1 reviewable commit and names tests/evals.
- [ ] Dependency order valid; no cycles.
- [ ] Critical flags match the script.
- [ ] No prod action; contract tasks precede consumer tasks.
