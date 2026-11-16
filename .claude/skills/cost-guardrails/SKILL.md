---
name: cost-guardrails
description: "Cost-runaway guardrails for background jobs and platform changes: concurrency caps, queue retries, dead-letter queues, per-item attempt caps, retry classification (transient vs permanent), alerts, and how to state cost in a spec (ranges with sources, never invented prices). Load when writing a spec with cost impact, or changing retries, concurrency, queues or compute settings."
---

<!-- Attribution: the retry classification (retry only transient errors, fail fast on permanent ones, exponential backoff with jitter, bounded attempts) is adapted from ecc skills/cost-aware-llm-pipeline/SKILL.md section 3 and skills/error-handling/SKILL.md "Retry with Exponential Backoff" (affaan-m/ecc, commit d2ef268, MIT, Copyright (c) 2026 Affaan Mustafa). The rest is authored. See THIRD_PARTY_NOTICES.md. -->

# Cost guardrails

## How to state cost in a spec
- A `Cost/limits` section is mandatory: either "no impact" or a **range** with the source URL and the date it was looked up. Never invent a price or benchmark; mark anything not sourced ESTIMATE, ARITHMETIC or UNVERIFIED.
- Per-run cost drivers (wall time, bytes transferred, operations) stay unmeasured until a spike measures them; until then every cost figure is a bracket, not a forecast.
- Keep project reference figures (unit prices, per-item cost) in {{COST_REFERENCE_DOC}} with source and date, not in this skill.

## Runaway guards (all required when a spec adds background work)
1. A **concurrency cap** on every worker pool, container fleet or function (`{{CONCURRENCY_SETTING}}`).
2. Queue **`max_retries`** (platform maximum is a vendor fact: look it up) and a **dead-letter queue** on every queue.
3. A **per-item attempt cap** recorded in a run table; at the cap the item goes `failed` and alerts.
4. **Backfills released in tranches**, inside the concurrency budget; event triggers are not enabled for a backfill.
5. **Alerts** on cost run-rate above a multiple of the projection ({{COST_ALERT_THRESHOLD}}) from provider billing/analytics and per-run cost. Hard provider spend limits can interrupt production traffic: apply them to dev accounts only unless the owner decides otherwise.
6. Dev environments have the same guards with lower numbers; agents testing on dev must not enqueue the full production-sized dataset.

## Retry classification (adapted from ecc)
- **Retry** only transient failures: network errors, timeouts, 429/5xx, preempted workers/SIGTERM. Exponential backoff with jitter, bounded attempts.
- **Fail fast** on permanent failures: auth/permission errors, 4xx validation, unreadable input, schema mismatch. Send to the DLQ with the error class; retrying only burns money.
- Never retry a non-idempotent step; make it idempotent first.

## Per-run evidence
A run table (`item_id, attempt, started_at, ended_at, exit_code, wall_s, instance_type`) feeds cost evals; eval-runner reports measured deltas in `eval-report.md`.

## Review cost
Four sub-review agents per change add agent spend. Measure it before adding more agents per change. Agent runs are bounded by `maxTurns`.
