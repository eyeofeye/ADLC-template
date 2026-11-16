---
name: pointer-sync-contract
description: "EXAMPLE. Contract for publishing items to tenant backends: central-DB outbox, cron drain, queue consumer, version-gated idempotent upsert into each tenant's Supabase, DLQ and nightly reconcile. Load when touching publications, outbox, sync workers, pointer tables or adding a tenant."
---

<!-- Authored for this template. No ecc content. Queue limits and pricing: look up in current vendor docs (UNVERIFIED). -->

# Pointer sync contract (example)

Goal: a tenant's `videos` table lists exactly the videos published to that tenant, eventually (target lag: {{SYNC_LAG_TARGET}}), with no direct read of the central DB by tenant backends or frontends. The central DB is the source of truth.

## Flow
```
publish (central app, one transaction) -> publications + outbox rows
  -> cron worker `outbox-drain` -> queue `pointer-sync`  (one message per (video, tenant))
  -> `pointer-sync` consumer worker -> upsert into tenant database (tenant service credential)
  -> mark outbox delivered
  failures: retries -> DLQ -> dlq-reporter -> error tracker ; nightly reconcile compares (video_id, version) sets
```

## Central DB
- `publications(video_id, tenant_id, state, published_at)`; `outbox(id, video_id, tenant_id, payload jsonb, version, created_at, delivered_at, attempts)`.
- **Publishing writes `publications` and `outbox` in one transaction.** No outbox row without a publication, no publication without an outbox row.
- `videos.version int` increases on every change that tenants must see (publish, metadata edit, unpublish).

## Message
`{ video_id, tenant_id, version }`: IDs only, far below the queue message size limit (look it up). The consumer reads the current row from the central DB; never trust the message body for content.

## Upsert into the tenant (idempotent, version-gated)
- Target: `videos(video_id pk, title, duration_s, hls_master_key, renditions jsonb, ladder_version, version int, published_at, synced_at)`; `hls_master_key` is a **relative key** (`r2-key-layout`).
- Gate: apply only if `excluded.version > videos.version`; an older or equal message is a no-op success. Re-delivery, reordering and duplicates must converge to the same row.
- Unpublish and delete follow the same version rule (tombstone via `published_at`/state; decide in the spec), never a blind delete.
- Credential: one per-tenant service credential, **only** in worker secrets, resolved via the tenant registry (`{{TENANT_REGISTRY_FILE}}`: tenant id, secret *names*, media host, allowed origins, contract version). A new tenant = one registry row + one secret (added by `client-backend-scaffolder`).
- The conditional `WHERE` is a SQL-level construct. Whether PostgREST's upsert can express it must be checked (UNVERIFIED; a plain upsert probably cannot): expect a small SQL function (RPC) in each tenant backend, which is a contract surface and a critical path.

## Failure handling
- Consumer: ack only after the upsert and the delivery mark; transient errors retry (use a project cap below the platform maximum); permanent errors (4xx other than rate limit, schema mismatch) go straight to the DLQ with `video_id`, `tenant_id`, error class; no payload secrets (see `cost-guardrails` for retry classes).
- DLQ non-empty is an alert (P1 if attempts at cap, `observability-conventions`).
- Drain must be safe to run twice concurrently: claim rows (`delivered_at is null`); the consumer is idempotent anyway.
- **Reconcile (nightly):** list `(video_id, version)` per tenant from central publications and from the tenant DB, report drift to the error tracker; non-zero drift alerts. Reconcile repairs by enqueueing, never by editing the tenant DB directly.

## Tests (eval-runner, dev)
Duplicate message = one row, unchanged; older version after newer = ignored; message for unpublished = no row; consumer killed mid-batch = retried to the same end state; 2 tenants, one down = other unaffected, DLQ gets the failing one; reconcile detects a deleted tenant row and repairs it; contract test against a tenant dev backend.

## Bulk publish
A large catalogue publishes through the same outbox in batches; rate-limit the drain, do not bypass it.

## Decide in the spec
`publications.state` values and tombstone representation; RPC vs other mechanism for the version gate; per-tenant retry cap; drain claim mechanism.
