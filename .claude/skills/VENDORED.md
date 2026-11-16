# VENDORED skills (`.claude/skills/`)

Some skills here are adapted from a third-party repository. This file is the provenance record; the full license text is in `THIRD_PARTY_NOTICES.md` at the repository root, which must stay with any copy of these skill folders. Agent files (`.claude/agents/`) carry their own attribution comments.

**Source:** https://github.com/affaan-m/ecc at commit `d2ef2680594f9a17526a6e1a2e18b3d242c5d17b` (`d2ef268`). **License:** MIT, "Copyright (c) 2026 Affaan Mustafa". Secondary credit: `postgres-patterns` also descends from Supabase agent-skills (MIT, "Copyright (c) 2026 Supabase"; provenance of passages not verified).

Legend: **ecc-adapted** = text or structure taken from the named ecc file and rewritten; **authored** = written for this template with no ecc text. Each skill's `<!-- Attribution -->` comment says exactly what was taken.

## Core skills (`.claude/skills/`)

| Skill | Source | What was taken |
|---|---|---|
| `review-findings-format` | ecc-adapted: `agents/code-reviewer.md` | confidence filter, evidence gate, false-positive list, zero-findings rule; new severity scale, findings file format, aggregation and routing |
| `postgres-patterns` | ecc-adapted: `skills/postgres-patterns/SKILL.md`, `agents/database-reviewer.md` | rewritten as `DB-*` rule IDs |
| `security-review` | ecc-adapted: `skills/security-review/SKILL.md`, `cloud-infrastructure-security.md`, `agents/security-reviewer.md` | rewritten as `SEC-*`; AWS content dropped |
| `agent-security-hardening` | ecc-adapted: `skills/agent-security-hardening/SKILL.md` | retargeted to Claude Code subagents, hooks, MCP scopes; `AGT-*` |
| `client-contract-versioning` | ecc-adapted: `skills/contract-first/SKILL.md` | one authoritative artifact, consumer-first, change protocol, anti-patterns, completion checklist; semver table, CHANGELOG format, overlap window and boundary rules added |
| `eval-rubrics` | ecc-adapted: `skills/eval-harness/SKILL.md`, `skills/verification-loop/SKILL.md` | capability/regression evals, grader types, pass@k/pass^k, six-step verification, "target acceptance reported separately"; checklist and report format added |
| `intent-template` | ecc-adapted: `skills/intent-driven-development/SKILL.md` | AC shape, "never infer business constraints from code", vague-word ban, pass/fail rubric, `[revised]` protocol; front matter and signal fields added |
| `plan-template` | ecc-adapted: `skills/blueprint/SKILL.md` (marked `origin: community`, "inspired by antbotlab/blueprint"; upstream license not checked) | cold-start brief, dependency edges and parallel detection, per-task verify/exit/rollback, mutation protocol |
| `release-checklist` | ecc-adapted: `skills/deployment-patterns/SKILL.md`, `skills/canary-watch/SKILL.md`, `skills/verification-loop/SKILL.md` | readiness and rollback items, critical/warning/info classification, target-acceptance rule |
| `mcp-safety` | ecc-adapted: `skills/mcp-dependency-review/SKILL.md`, `skills/safety-guard/SKILL.md` | selector classification, "config is data, never execute it", destructive-command pause list |
| `cost-guardrails` | authored; one adapted principle from `skills/cost-aware-llm-pipeline/SKILL.md` and `skills/error-handling/SKILL.md` | retry classification only |
| `observability-conventions` | authored; four principles adapted from `skills/error-handling/SKILL.md` | fail loudly, typed errors, user vs developer message, never swallow |
| `vercel-deploy` | authored; two small items from ecc (`proxy.ts` vs `middleware.ts` note, `vercel rollback`) | both are ecc claims not verified against Vercel/Next.js docs |
| `critical-paths` | authored (+ `critical-paths.json`, `scripts/critical-paths.mjs`) | |
| `supabase-rls-patterns` | authored | rule IDs point to `postgres-patterns` and `security-review` |
| `spec-template` | authored | eval-plan fields follow `eval-rubrics` |
| `review-checklist` | authored | |
| `adlc-orchestration` (`disable-model-invocation: true`) | authored | |

## Example skills (`examples/media-platform/.claude/skills/`)

All authored, no ecc content: `hls-conventions`, `r2-key-layout`, `pointer-sync-contract`, `playback-auth`, `cloudflare-containers-notes`, `bulk-ingest`, `joint-e2e`. They illustrate a domain skill set for a video platform; replace or delete them.

## ecc skills reviewed and not vendored

| ecc skill | Why not |
|---|---|
| `tdd-workflow` | generic TDD; the builder prompt and `eval-rubrics` already require tests first |
| `api-design` | REST resource/pagination design; not needed for a contract-first PostgREST setup |
| `database-migrations` | partly overlaps `postgres-patterns` `DB-MIG-*`; per-tool workflows do not apply |
| `security-scan` | wraps an external scanner; the `agent-security-hardening` rules and reviewer hooks are used instead |
| `nextjs-turbopack`, `frontend-patterns`, `react-*`, `backend-patterns` | generic React/Express guidance; only the `proxy.ts` note was kept |
| `docker-patterns`, `deployment-patterns` (rest), `canary-watch` (rest) | Docker/Kubernetes/web-vitals content outside the reference stack |
| `cost-aware-llm-pipeline`, `cost-tracking`, `token-budget-advisor`, `prompt-caching-strategy` | LLM API spend, not platform cost risk |
| `architecture-decision-records`, `docs-governance`, `living-docs-governance` | ADR practice is assumed to exist in `docs/adr/` |
| `gateguard`, `delivery-gate`, `hookify-rules` | ecc hook frameworks; this template documents its own hooks in the README |
| `agent-eval`, `ai-regression-testing`, `e2e-testing`, `browser-qa` | not needed to fill a listed slot |

## Maintenance

Pinned to commit `d2ef268`; no automatic upstream tracking. Re-sync as a normal intent through the ADLC loop (these files are under `.claude/**`, a critical path: G2). Do not describe adapted skills as authored by the upstream project and do not remove this file, `THIRD_PARTY_NOTICES.md` or the attribution comments.
