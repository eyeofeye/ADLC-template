---
name: supabase-rls-patterns
description: "Baseline RLS and grant pattern for tenant-facing Supabase backends (public anon key, so RLS is the only data boundary), a published-rows policy shape, negative-test recipes, service-credential rules and pooler use. Load when specifying, building, testing or reviewing any Supabase table, policy, migration or Edge Function."
---

<!-- Authored for this template. Rule IDs point to the ecc-adapted `postgres-patterns` and `security-review` skills (affaan-m/ecc, commit d2ef268, MIT); no ecc text is copied here. -->

# Supabase RLS patterns (builder/spec view)

Review rules live in `postgres-patterns` (`DB-RLS-*`, `DB-GRANT-*`, `DB-MIG-*`) and `security-review` (`SEC-RLS-*`, `SEC-TOKEN-*`). This skill is the **how to build it** side. Skip it if you do not use Supabase, and replace `postgres-patterns` accordingly.

## Facts that drive everything
- Typically one Supabase project per app (and per tenant, if you isolate tenants by project), per environment. Tenant projects never read each other's data.
- A frontend written by someone else (or any browser client) holds the **public anon key**. **RLS is the only data boundary.** A missing policy or an over-broad grant is a data leak, not a bug.
- Decide explicitly whether `anon` may read anything. The default here: logged-in users only; `anon` gets no access to tenant data (confirm in the spec if a public catalogue is ever wanted).
- Writes to tenant tables come only from a server-side job with that tenant's service credential, which exists only as a server secret. The service role bypasses RLS: it must never be reachable from an end-user path.

## Baseline for a client-facing table
1. Create the table, `ENABLE ROW LEVEL SECURITY`, policies and grants **in the same migration**.
2. Start from deny: no policy = no access. Revoke default grants from `anon`; grant only what the contract promises to `authenticated`.
3. Read policy: authenticated users see **published** rows of **their own tenant** only. Writes: no policy for `authenticated`/`anon` (denied).
4. Wrap `auth.uid()`/`auth.jwt()` as `(select auth.uid())` and index the columns used in policies (`DB-RLS-3`).
5. Update the RLS behaviour table in {{CONTRACT_DIR}} and the CHANGELOG in the same PR; a visibility change is a contract change (`client-contract-versioning`).

Published-rows shape (PROPOSED; your spec fixes how "published" is represented):
```sql
alter table public.items enable row level security;
revoke all on public.items from anon, authenticated;
grant select on public.items to authenticated;
create policy items_read_published on public.items
  for select to authenticated using (published_at is not null);
-- no insert/update/delete policy: only the service credential (sync job) writes
```
Run `get_advisors` (security) on the dev project after the migration; every finding on a touched table is yours to fix.

## Grant-issuing Edge Function (RLS interaction)
Query the resource with the **caller's JWT** (anon key + `Authorization` header) so RLS decides visibility; never with the service role. A not-visible and a not-existing id return the same response (`DB-GRANT-2`). Edge Function limits and secret handling: verify against the vendor docs (UNVERIFIED until you do).

## Negative tests (mandatory for every RLS change; eval-runner runs them on dev)
| Case | Expected |
|---|---|
| Request with only the anon key (no user JWT) | no rows / denied |
| JWT issued by another tenant's project presented to this project | rejected (different project, different JWT secret) |
| Authenticated user selects an unpublished row (`published_at is null`) | not returned |
| Authenticated user INSERT / UPDATE / DELETE on the table | denied |
| Grant function for an unpublished and for a random UUID | identical status and body shape |
| Column or table added by the migration without RLS | caught by `get_advisors` / migration test |
Record each as pass/fail with the command in `eval-report.md`.

## Connections
Workers and Edge Functions talk to Supabase over PostgREST (HTTP) or the pooler, not direct Postgres connections from serverless code (`DB-CONN-1`). Set a pooler-saturation alert threshold in your observability spec.

## Migrations
Prod migrations are applied only by CI after G3; dev may be applied by MCP or CLI, but only from a committed migration file (`DB-MIG-1`). Backward-compatible steps (expand, then contract) because functions and jobs deploy separately (`DB-MIG-*`). Include rollback notes in the spec. No `supabase db reset`/`push` against a non-dev ref.
