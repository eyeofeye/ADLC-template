---
name: eval-rubrics
description: "What 'done' means for eval-runner: capability vs regression evals, grader types, pass@k/pass^k, the six-step local verification, the project eval checklist (RLS negatives, contract, job idempotency, observability, domain checks), and the eval-report format with 'not tested' honesty. Load when planning or running evals, or writing eval-report.md."
---

<!-- Attribution: eval types, grader types, pass@k / pass^k, eval anti-patterns and the six-phase verification report (with the "target acceptance reported separately" rule) are adapted from ecc skills/eval-harness/SKILL.md and skills/verification-loop/SKILL.md (affaan-m/ecc, commit d2ef268, MIT, Copyright (c) 2026 Affaan Mustafa). The ecc framework utilities (scripts/eval-harness.js, capsules) are not used. The project checklist is authored. See .claude/skills/VENDORED.md and THIRD_PARTY_NOTICES.md. -->

# Eval rubrics

Evals are the unit tests of agent-built changes: defined **before** coding (in `spec.md`'s eval plan), run by eval-runner on dev, reported in `eval-report.md`. Every `spec.md` criterion maps to ≥ 1 eval; every eval to a criterion.

## Eval types
- **Capability eval:** new behaviour works. `Task`, `Success criteria` (checkbox list), `Expected output`.
- **Regression eval:** existing behaviour unchanged. `Baseline` (git SHA or tag), tests with PASS/FAIL, result `X/Y (previously Y/Y)`.

## Graders (prefer the first)
1. **Code grader**: deterministic (test, SQL assertion, HTTP status, schema validation, file/probe tool output). Default.
2. **Rule grader**: regex/schema constraints on outputs (document structure, OpenAPI conformance).
3. **Model grader**: only for open-ended output; rubric + score + reasoning; never the sole gate for security.
4. **Human grader**: flag `HUMAN REVIEW REQUIRED` with change, reason and risk (LOW/MEDIUM/HIGH). Always for browser/device-specific behaviour automation cannot cover, security-sensitive judgement, and prod facts agents cannot see.

## Reliability
`pass@k` = at least one success in k attempts (capability, suggested target pass@3 ≥ 0.90, recommended by ecc); `pass^k` = all k attempts pass (regression and critical paths, target pass^3 = 1.00). Flaky graders are not allowed in release gates: quarantine and list them in the report.

## Verification run (local, in this order; stop at first red)
1. build · 2. typecheck (`tsc --noEmit`) · 3. lint · 4. unit/integration tests with coverage delta (set your own numeric threshold: {{COVERAGE_THRESHOLD}}) · 5. secret/security grep + dependency audit where allowed · 6. diff review (unintended files, critical paths via `critical-paths`).
Commands use the repo's own scripts; report what ran and its exit code. Local PASS is **not** target acceptance: report dev-environment/preview verification separately as VERIFIED, FAILED, NOT PERFORMED or NOT APPLICABLE with the environment and evidence; do not touch prod.

## Project checklist (include the rows that apply)
- **RLS:** negative tests (anon, other-tenant JWT, unpublished rows, writes denied) (`supabase-rls-patterns`).
- **Contract:** dev backend responses validate against the OpenAPI files; backward-compat diff vs last tag (`client-contract-versioning`).
- **Jobs and queues:** duplicate event does not double-process; killed worker retried; DLQ path exercised; run table records bytes and wall time.
- **Observability:** an alert rule exists per SLO/DLQ; a synthetic failure reaches the error tracker.
- **Cost:** deltas in bytes, wall time, queue operations vs the spec's cost section (`cost-guardrails`).
- **Domain checks:** {{DOMAIN_EVALS}} (add the checks your domain needs; examples live in `examples/`).

## eval-report.md
Front matter: `change_id`, `head_commit`, `env` (dev/preview), `date`. Sections: **Summary** (READY FOR REVIEW or NOT READY), **Per-criterion results** (id, grader type, command/query, PASS/FAIL, evidence path), **Capability** and **Regression** counts with pass@k/pass^k, **Flaky list**, **Coverage delta**, **Cost deltas**, **Not tested** (mandatory, even if empty: "nothing"), **Needs human**. Evidence: command output excerpts, never secrets or production data; test data is synthetic.

## Anti-patterns
Overfitting to known examples; happy path only; ignoring cost and latency drift while chasing pass rates; running destructive checks outside dev; weakening an eval to make it pass.
