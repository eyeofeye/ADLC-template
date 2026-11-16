---
name: postgres-patterns
description: "Postgres and Supabase patterns for review-database: RLS, indexes, migrations, outbox/queue SQL, pooled connections, and the access-grant query path. Load when reviewing SQL, migrations, schemas, RLS or Edge Function queries."
---

<!-- Attribution: adapted from ecc skills/postgres-patterns/SKILL.md and agents/database-reviewer.md (affaan-m/ecc, commit d2ef268, MIT, Copyright (c) 2026 Affaan Mustafa), which state they are "Based on Supabase Agent Skills (credit: Supabase team)". Supabase agent-skills is MIT, Copyright (c) 2026 Supabase (which exact passages originate there was not verified). Adapted and trimmed; see THIRD_PARTY_NOTICES.md. -->

# Postgres patterns

Scope: your database projects (`{{DB_PATHS}}`), edge/server functions that query them, outbox/sync queries. Reviewers do not connect to databases: use the diff, the migration files, the eval-report and (dev only) the read-only Supabase tools `list_tables`, `list_migrations`, `get_advisors`.

## Rules (IDs are cited in findings)

**RLS (the only data boundary when the anon key is public and frontends are not yours)**
- DB-RLS-1 blocker: every table in an exposed schema has RLS enabled in the same migration that creates it. `get_advisors` security findings on touched tables are findings.
- DB-RLS-2 blocker: policies exist for each operation a client can reach; unpublished/other-tenant rows are invisible; a policy of `USING (true)` on a client-facing table is a blocker unless the spec says public.
- DB-RLS-3 major: policy expressions use `(select auth.uid())` (wrapped, evaluated once), not bare `auth.uid()` per row; policy columns are indexed.
- DB-RLS-4 blocker: no service-role access reachable from an end-user path; grant-issuing functions query with the caller's JWT so RLS applies.
- DB-RLS-5 major: `SECURITY DEFINER` functions set a fixed `search_path` and are not exposed to `anon`/`authenticated` unless intended; views over RLS tables use caller rights (`security_invoker`) where supported (verify against the Supabase docs; advisor-backed when flagged).
- DB-RLS-6 major: RLS change without negative tests (unauthenticated, cross-tenant user, unpublished row) in the eval plan.
- DB-GRANT-1 major: no `GRANT ALL` to application roles; no broad grants on new tables.

**Migrations**
- DB-MIG-1 blocker: each change is a committed migration file; the dev project's applied set equals the repo set (`list_migrations`). No `apply_migration`-only changes.
- DB-MIG-2 major: backward compatible while the previous contract major is in its overlap window: expand, backfill, contract; no column drop/rename/type change that breaks the served contract version without a MAJOR bump (check `{{CONTRACT_DIR}}/VERSION`).
- DB-MIG-3 major: destructive statements (`DROP`, `TRUNCATE`, unbounded `DELETE/UPDATE`) carry a rollback note and a row-count guard; long locks are avoided (large `ALTER`, index builds on big tables; whether the migration runner allows `CREATE INDEX CONCURRENTLY` is UNVERIFIED, so ask for evidence).
- DB-MIG-4 minor: idempotent where cheap (`IF NOT EXISTS`) without hiding drift.

**Schema and types**
- DB-SCH-1 major: PK/FK/NOT NULL/CHECK defined; FK `ON DELETE` is explicit; status columns are enums or CHECKed.
- DB-SCH-2 minor: `text` over `varchar(n)` without reason, `timestamptz` over `timestamp`, `numeric` for money, `bigint` for counters; `lowercase_snake_case` names. Random UUID PKs are fine at small scale; note only for high-volume tables.
- DB-SCH-3 major: identifiers used as external keys (storage paths, URLs) are server-generated and never user-supplied.

**Indexes and queries**
- DB-IDX-1 major: foreign keys and every column used in `WHERE`/`JOIN`/RLS policy has an index (equality columns first, then range). `get_advisors` performance findings (unindexed FK) on touched tables are findings.
- DB-IDX-2 minor: partial index for hot subsets (e.g. outbox rows `status = 'pending'`), `INCLUDE` for covering reads only with a measured need.
- DB-Q-1 major: no `SELECT *` in application code on wide tables or in the contract surface; list endpoints use cursor pagination (`WHERE id > $last ORDER BY id LIMIT n`), not `OFFSET`.
- DB-Q-2 major: no N+1 on user paths (lookups and list endpoints are single queries); fixed-cardinality loops are fine.
- DB-Q-3 blocker: no SQL built by string concatenation; parameters via the client library or placeholders.
- DB-Q-4 major: batch writes (multi-row insert/`COPY`/upsert), never one insert per row in a loop (bulk import, bulk publish).
- DB-Q-5 major: sync upserts are idempotent and version-gated (`INSERT ... ON CONFLICT ... DO UPDATE ... WHERE excluded.version > t.version`).
- DB-Q-6 major: outbox/queue drain uses `FOR UPDATE SKIP LOCKED` (or an equivalent proven single-consumer design), short transactions, consistent lock order; no external call (object storage, queue send, HTTP) inside an open transaction.

**Connections**
- DB-CONN-1 major: edge functions and workers use the pooled connection or PostgREST, not a new direct connection per request; timeouts set (`statement_timeout`, idle-in-transaction) in config reviewed under G2. Pooler mode specifics are UNVERIFIED here; confirm against Supabase docs before asserting.

**Grant-issuing functions (database/RLS aspects only; token cryptography belongs to review-security)**
- DB-GRANT-2 blocker: the visibility check is an RLS-subject read of the resource id for the caller; a not-visible and a not-existing resource return the same response (no existence oracle).
- DB-GRANT-3 major: one indexed query per request; the grant version is read from a single place; the response is returned only after the visibility check.

## Anti-pattern probes (run by eval-runner on dev when a finding asks; reviewers never run them)
Unindexed foreign keys; top queries by mean time; dead-tuple counts on queue/outbox/run tables. Ask via "Needs eval evidence".

## Not used here (dropped from ecc)
JSONB/GIN and full-text search patterns, BRIN time-series, `ALTER SYSTEM` tuning and `pg_stat_statements` setup (managed Supabase; prod access is read-only and not given to reviewers), ClickHouse references, psql diagnostics (no DB credentials for reviewers).
