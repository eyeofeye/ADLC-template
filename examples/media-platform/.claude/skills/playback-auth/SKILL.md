---
name: playback-auth
description: "EXAMPLE. Playback authorization design: tenant-backend grant Edge Function, short-lived HMAC grant, manifest-signer worker rewriting segment URIs, WAF timed-HMAC rule on segments, CORS, internal-preview tenant, replay limits and the cache-key gate. Load when touching grants, signer, WAF rules, CORS, the tenant registry or playlists."
---

<!-- Authored for this template. WAF behaviour (Cloudflare timed HMAC in the original) must be checked against current vendor documentation (UNVERIFIED). No ecc content. -->

# Playback authorization (example)

Viewing requires login; segments must not be fetchable without authorization; **no DRM** (assumption). Tokens are bearer tokens and replayable until they expire: acceptable without DRM, never extend TTLs casually.

## Three steps
1. **Grant (tenant backend).** An Edge Function (`{{GRANT_FUNCTION_NAME}}`) in each tenant's Supabase project: validate the viewer JWT, check the video is visible **under RLS using the caller's JWT**, return `{ manifest_url, expires_at, grant_version }`. The grant is an HMAC-SHA256 with a **per-tenant secret** over `video_id`, `tenant_id`, `exp`; `exp` ≤ {{GRANT_TTL}} (example: 60 s). Shape, errors and CORS are part of {{CONTRACT_DIR}}: changes follow `client-contract-versioning`.
2. **Manifest-signer worker (platform).** Verifies the grant (signature, `exp`, `video_id`, `tenant_id` match the requested path, `grant_version` known), fetches playlists from the delivery bucket, rewrites **every** segment and init URI with a verify parameter (`?verify=<timestamp>-<mac>`) compatible with your WAF's timed-HMAC function. Take the exact MAC message and URI layout from the vendor docs when building; not restated here.
3. **WAF custom rule** on the media hostname blocks requests whose HMAC fails, so segment traffic never runs worker code. Segment token TTL: {{SEGMENT_TOKEN_TTL}} (PROPOSED). Check the plan tier the WAF feature requires. No public dev URL on the bucket; only the delivery bucket is behind the hostname (`r2-key-layout`).

## Rules
- Secrets: one per tenant, rotating independently; exist in function secrets **and** worker secrets; the registry stores **names only**. Never log a grant, MAC, secret or full signed URL (`SEC-TOKEN-*`, `SEC-LOG-*`).
- A not-visible and a not-existing `video_id` give the same response (no existence oracle).
- CORS: only the registered frontend origins from the tenant registry; a CORS mistake breaks the player in a frontend you cannot test, so contract tests cover preflight and `Origin` handling.
- Constant-time comparison for MACs; reject expired, malformed or wrong-tenant grants with a 4xx and no body detail.
- Playlists stored in object storage contain **no tokens and no absolute URLs** (`hls-conventions`).
- An `internal-preview` tenant (optional): staff preview playback, grant minted by the central app's server for staff; same signer and WAF path, so the path can be proven without any external tenant.
- Whether grant and segment secrets are the same per tenant is a design choice: decide in the spec; prefer separate if rotation cost allows.

## Gate: cache-key spike
Confirm the CDN cache key can ignore the verify parameter. If not, every viewer misses cache and hits origin storage (read operations are billed): fallback is worker-per-request auth with cookie and Cache API keyed by path (look up the per-request price; ESTIMATE). Do not ship the WAF path as the final design before this passes.

## Tests (eval-runner)
Valid grant plays; expired grant rejected; wrong tenant; unpublished video; tampered MAC; missing verify parameter on a segment blocked by the WAF; CORS allowed vs disallowed origin; secret rotation without downtime; synthetic canary covers grant → manifest → segment (`observability-conventions`).
