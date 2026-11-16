---
name: r2-key-layout
description: "EXAMPLE. Two-bucket object-storage layout per environment (private originals, public-via-signer delivery), exact keys, commit marker, immutability, lifecycle rules and credential scoping. Load when writing anything that reads or writes object storage, the upload flow, the pipeline, the signer, bulk ingest, or reviewing storage access."
---

<!-- Authored for this template. No ecc content. Provider behaviour (Cloudflare R2 in the original) must be checked against current vendor documentation (UNVERIFIED). -->

# Object-storage key layout (example: Cloudflare R2)

## Buckets per environment
```
{{SOURCE_BUCKET}}-<env>     private. No custom domain, no public dev URL, never exposed to a client.
  {video_id}/original.{ext}          direct multipart upload (upload app) or bulk ingest
{{DELIVERY_BUCKET}}-<env}   the ONLY bucket behind {{MEDIA_HOST}} (WAF signature rule, CORS for consumer origins)
  {video_id}/master.m3u8             written LAST = commit marker
  {video_id}/v1080|v720|v360/index.m3u8, init.mp4, seg_00001.m4s ...
  {video_id}/poster.jpg              optional
```
`video_id` is a **server-generated UUID**; uploaders and tools never choose keys except an ingest tool assigning the UUID from its manifest. Never put titles, tenant ids or user data in keys. Tenant pointer tables store the **relative HLS key** (`{video_id}/master.m3u8`), never a URL.

## Rules
1. **Commit marker:** `master.m3u8` is written after every rung playlist, init and segment exists. A video with a master is complete; a video without one is in progress or failed and must not be published.
2. **Immutable:** objects under `{video_id}/` in the delivery bucket are not overwritten once the master exists. A re-transcode writes a new `ladder_version` path **only through the pipeline** (decide the path scheme in the first spec that needs it).
3. **Originals:** retained, standard storage class, never auto-deleted; deletion is a human takedown action. The pipeline never modifies or deletes source-bucket objects.
4. **One event rule:** a single `object-create` rule on the source bucket (check that CompleteMultipartUpload triggers it on your provider); the delivery bucket has no rule. Backfill objects are released by enqueue-by-listing, not by the event rule.
5. **Idempotent writes:** keys are deterministic from `video_id` + rung + index, so a retry overwrites the same objects.
6. **Ingest metadata:** originals carry the source SHA-256 as object metadata (verify the exact provider flag with a spike).

## Lifecycle (check the provider's syntax)
| Bucket | Rule |
|---|---|
| source | abort incomplete multipart uploads after a short window (e.g. 1 day; provider default may be longer) |
| source | no expiry; an infrequent-access class after N days is an option, decided after any backfill |
| delivery | no expiry |
Object versioning for overwrite protection: UNVERIFIED.

## Credential scoping (who may touch what)
| Actor | Scope |
|---|---|
| Upload app (hosting env) | S3 key for the source bucket only; presigned `UploadPart` URLs (presigning needs the S3 endpoint and SigV4; a worker binding may not presign: check) |
| Transcode container | temp credentials: read `source/{video_id}`, write `delivery/{video_id}`; one credential per bucket may be the provider's limit (UNVERIFIED) |
| manifest-signer worker | read delivery bucket only |
| Bulk ingest operator | human-held token, object read/write on the prod source bucket, deleted after verify; **never in an agent environment** |
| Agents | no storage credentials; dev buckets via `{{INFRA_DEV_MCP}}` only, prod via `{{INFRA_PROD_RO_MCP}}` |

## Review hooks
`SEC-STORE-*` in `security-review` (no public originals, CORS only on the upload origin for the source bucket, no public dev URL), `CODE-JOB-*` in review-code (master last, idempotency).
