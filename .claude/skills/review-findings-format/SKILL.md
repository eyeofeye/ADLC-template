---
name: review-findings-format
description: "Findings file format, severity scale, evidence gate and false-positive filter shared by reviewer and the four specialist sub-reviewers (review-code, review-security, review-database, review-typescript). Load when writing or aggregating review findings."
---

<!-- Attribution: the confidence filter, pre-report gate, "proof for top severities", "zero findings is valid" rule and false-positive list are adapted from ecc agents/code-reviewer.md (affaan-m/ecc, commit d2ef268, MIT, Copyright (c) 2026 Affaan Mustafa). See THIRD_PARTY_NOTICES.md. Severity names, file layout and aggregation rules are authored. -->

# Review findings format

## Severity ( ecc's CRITICAL/HIGH/MEDIUM/LOW mapped as shown)

| Severity | Meaning | ecc equivalent | Effect on verdict |
|---|---|---|---|
| **blocker** | Exploitable security hole, data loss/corruption, broken RLS boundary, secret exposure, breaking contract change without a MAJOR bump, non-idempotent prod-path step, build/typecheck failure | CRITICAL | **Any blocker => `reject`** |
| **major** | Real defect or maintainability risk with a concrete failure mode that is not immediately exploitable (missing negative test, N+1 on a user path, unhandled rejection, `any` on a boundary, missing index on an RLS/FK column) | HIGH | `reject` by default; the coordinator may log it as a follow-up only if it sits in unchanged code (pre-existing) |
| **minor** | Improvement that a senior engineer on this team would still change (naming, dead code, small perf, missing doc on a public contract field) | MEDIUM and LOW | Never blocks; listed |

Critical-path changes still need the human G2 whatever the findings say (reviewer returns `human-required`).

## Evidence gate (before writing any finding)

1. Can I cite the exact `file:line`? If not, drop it.
2. Can I name the input/state and the bad outcome? If not, you are pattern-matching: drop or downgrade.
3. Have I read the surrounding code, callers, tests and the spec clause? Many apparent issues are handled one frame up.
4. Is the severity defensible? A missing comment is never major; one `any` in a test fixture is never a blocker.

**blocker and major require proof:** exact snippet + line, the failure scenario (input, state, outcome), and why existing guards (types, RLS, framework defaults, validation) do not catch it. If you cannot give all three, demote to minor or drop.
Report only findings you are more than ~80% sure about. Skip stylistic preference unless it violates `CLAUDE.md` or an ADR. Skip unchanged code unless it is a blocker-class security issue. Consolidate repeats ("5 handlers lack X" is one finding with five locations).
**A clean review is valid.** Zero findings with status `complete` is the correct output for a clean diff; never manufacture findings.

## Common false positives (skip unless you have codebase-specific evidence)

- "Add error handling" where the caller, framework or queue retry/DLQ already handles it.
- "Missing validation" on an internal function whose callers validate (trace one caller).
- "Magic number" for 200/404/60/1000/0/-1, status codes, or self-describing single-use constants.
- "Function too long" for exhaustive switches, config objects, test tables, generated code (e.g. generated database types).
- "Missing JSDoc" on self-describing internal helpers.
- "Possible null dereference" when a guard or type narrowing is in scope.
- "N+1" on fixed-cardinality loops (e.g. a fixed set of three items) or already batched paths.
- "Missing await" on intentional fire-and-forget (`void`, `ctx.waitUntil(...)`) with a comment.
- "Hardcoded value" in tests, fixtures, docs, `.env.example`, or a public anon key that is public by design.
- SHA-256/MD5 used as a checksum (import manifest, ETag), not for passwords; `Math.random()` for jitter.
Ask: "Would a senior engineer on this team actually change this in review?" If no, skip.

## Findings file (written by each sub-reviewer)

Path: `docs/changes/<id>/review/<agent-name>.md` (one file per sub-reviewer; the only file it may write).

```markdown
---
reviewer: review-security            # agent name
change_id: YYYYMMDD-short-slug
head_commit: <git sha reviewed>
scope: [src/app/api/items/route.ts, supabase/functions/issue-grant/index.ts]
status: complete                     # complete | incomplete (explain below)
counts: { blocker: 1, major: 0, minor: 2 }
---
## Summary
One paragraph: what was reviewed, what was not, verdict hint (reject if blocker > 0).

## Findings
### SEC-001 · blocker
- **Where:** supabase/functions/issue-grant/index.ts:42
- **Rule:** SEC-TOKEN-2 (grant must be bound to the resource id and tenant id)
- **Evidence:** `<snippet>`; scenario: <input -> state -> outcome>; guards that do not catch it: <why>
- **Fix:** <concrete suggestion; do not edit code>

## Needs eval evidence
- Items you could not confirm statically and want eval-runner to produce (e.g. "EXPLAIN on outbox drain query on dev").

## Not reviewed / could not run
- Commands that failed or were not allowed, files out of scope.

## Needs human (optional)
- Anything that needs a credential, a prod action or an edit outside your allowed path (never attempt it).
```

IDs: `CODE-nnn`, `SEC-nnn`, `DB-nnn`, `TS-nnn`. `Rule` cites an ID from the agent's own checklist (or the spec clause).

## Aggregation (reviewer only)

1. Run the routing table (below); require a findings file with `status: complete` and `head_commit` equal to the PR head from every routed sub-reviewer. Missing/incomplete/stale: re-run that sub-reviewer once; still missing => `human-required` with the reason.
2. Merge findings; de-duplicate on same `file:line` + same root cause (keep the highest severity, cite both rule IDs).
3. Any blocker => `verdict: reject`. Majors => `reject` unless pre-existing (then follow-up). Otherwise `approve`.
4. If any critical path is touched (CI-derived list) => `human-required` (G2) regardless; blockers still make it `reject`.
5. Write `review.md` (front matter `verdict`, `critical_paths_touched`, `subreviews: {name: {status, counts}}`) and a combined findings table that links each finding to its sub-review file.

Routing: `review-code` and `review-security` run on any diff that touches a non-Markdown file. `review-typescript` runs on `*.ts`, `*.tsx`, `*.js`, `*.mjs`. `review-database` runs on `supabase/**`, `*.sql`, `{{CONTRACT_DIR}}/**` RLS tables, or any file using `.from(` / `.rpc(` / raw SQL. A Markdown-only diff is reviewed by `reviewer` alone.
