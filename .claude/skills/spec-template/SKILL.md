---
name: spec-template
description: "Exact front matter and sections for docs/changes/<id>/spec.md: requirements traced to intent criteria, exact contracts (API, events, DB schema, storage keys), contract impact, security/RLS, observability, cost with sources, migration and rollback, eval plan, traceability table, UNVERIFIED list. Load when drafting or reviewing a spec."
---

<!-- Authored for this template. The eval-plan fields follow `eval-rubrics` (ecc-adapted). No other third-party content. -->

# Spec template

A spec turns an **approved** intent into a design a builder can implement without inventing requirements. Path `docs/changes/<id>/spec.md`. Reviewed in the PR (no separate gate). Facts come from `docs/`, the repo and sources looked up this session.

## Front matter
```yaml
---
id: YYYYMMDD-short-slug
intent: docs/changes/YYYYMMDD-short-slug/intent.md   # must be status: approved
status: draft
traces: [R1, R2, AC-001, AC-002]
touches: [supabase/functions/issue-grant/, {{CONTRACT_DIR}}/]
critical_paths: yes      # output of the critical-paths script on `touches`
adr_impact: [ADR-NNN]    # ADRs amended or new; [] if none
contract_impact: MINOR   # none | PATCH | MINOR | MAJOR
---
```

## Sections
1. **Summary**: what changes and why, 3–5 lines.
2. **Requirements**: `RQ-1…`, each tracing to one or more intent criteria (`AC-nnn`) and to your requirement IDs. Every AC maps to ≥ 1 RQ.
3. **Design**: only what builders need, with **exact contracts**: API request/response and error codes, events/queue messages, DB schema (tables, columns, RLS, grants, indexes), storage keys, config. Reference skills instead of restating them (`supabase-rls-patterns` and your domain skills, `{{PROJECT_SKILLS}}`).
4. **Contract impact**: `none | PATCH | MINOR | MAJOR` with justification and, for MAJOR, the overlap-window plan (`client-contract-versioning`). Required for any change to RLS visibility, API shape, token/grant format or CORS.
5. **Security and data boundary**: RLS/grant changes, secrets touched (names only), new tokens or scopes, MCP/permission changes, untrusted inputs handled (`security-review`).
6. **Observability**: signals, correlation tags, alerts added or changed (`observability-conventions`).
7. **Cost and limits**: a range with source URL and look-up date, or "no impact" (`cost-guardrails`). No invented prices.
8. **Migration and rollback**: schema order (expand before code, contract after), data backfill, rollback steps for every schema or pipeline change; prod only via CI after G3.
9. **Eval plan**: table `RQ → eval → grader type → command/query → environment (dev) → pass criterion` including negative tests and what will be reported as NOT tested (`eval-rubrics`).
10. **Traceability table**: AC → RQ → eval; no empty cell.
11. **Risks, UNVERIFIED items, open questions**: each external claim carries a URL or the tag UNVERIFIED; questions that need the human go to `Needs human`.
12. **ADR**: if a decision changes, add or amend an ADR under `docs/adr/` in the same PR.

## Acceptance checks (spec-designer self-check)
- [ ] Every intent success criterion maps to ≥ 1 requirement and ≥ 1 verification.
- [ ] Contracts specified exactly with versioning/compat notes.
- [ ] Rollback and migration steps present for every schema or pipeline change.
- [ ] Cost/limits section present with ranges and sources, or says "no impact".
- [ ] Every external claim has a source URL or UNVERIFIED.
- [ ] `Contract impact` stated for any consumer-facing change; delivery commitments respected ({{CONTRACT_DELIVERY_POLICY}}).
- [ ] `critical_paths` set from the script, not by eye.

## Rules
Do not change code. Do not widen scope beyond the approved intent; if the design needs more, return to G1 with a question. Prefer the smallest contract that serves the consumer. Mark ASSUMPTION where you decide for the user.
