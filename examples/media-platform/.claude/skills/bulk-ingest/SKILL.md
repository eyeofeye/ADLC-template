---
name: bulk-ingest
description: "EXAMPLE. Read-only guide to a human-run bulk upload tool (local drive to the prod source bucket: manifest, rclone flags, resume, verification layers, report format) and the rule that agents never hold the token. Load when building or evaluating the ingest tool, or reading its reports."
---

<!-- Authored for this template. No ecc content. Provider/rclone behaviour must be checked against current documentation (UNVERIFIED). -->

# Bulk ingest (human-run; agents author and test only)

Originals sit on a local drive and must reach the prod source bucket ({{SOURCE_BUCKET}}-prod) before any backfill starts. Writing the prod bucket needs a prod write credential, and **no agent holds one**. Size your dataset and timing in {{COST_REFERENCE_DOC}} (ESTIMATE until measured).

## What agents may do
- Author `{{INGEST_TOOL_DIR}}` (manifest generator, rclone wrapper, verifier, report writer) as the **builder**; verify with the **eval-runner** on a small **dev set** (example: 50 files) against dev buckets; the tool is a critical path (G2, human merge).
- Read the **non-secret** outputs: `manifest.jsonl`, `ingest-report.jsonl`, `verify-report.json`.
- Never: read the drive, run the tool against prod, run `rclone` against a prod remote (deny rule), read the rclone config directory, ask for or look for the token, paste it anywhere. The token is object read/write on the prod source bucket only, created by a human, deleted after verification.

## Tool behaviour to implement and test
1. **Manifest first** (read-only pass over the drive): per file `legacy_ref`, assigned `video_id` (UUID), `bytes`, `sha256` into `manifest.jsonl`. Hash once so the drive is not read twice. Imported into the central DB through an admin endpoint (`videos.source=backfill`, `legacy_ref`, `source_bytes`, `source_sha256`); idempotent on `video_id`.
2. **Upload** per manifest row to `{{SOURCE_BUCKET}}-<env>/{video_id}/original.{ext}` with rclone against the S3 API (check the rclone provider setting and minimum version for your storage; `no_check_bucket = true` may be needed for an object-scoped token). Starting values: 64 MiB parts (`--s3-chunk-size`, `--s3-upload-cutoff`), `--s3-upload-concurrency` and parallel files tuned to the link (memory ≈ transfers × concurrency × chunk size), `--bwlimit` schedule. Reruns skip completed objects (resumable at file granularity); unfinished multipart uploads expire by the lifecycle rule. SHA-256 stored as object metadata (verify the flag with a spike).
3. **Verify:** (a) sha256 metadata; (b) 100% size and count reconciliation by listing; (c) re-download and hash of a random sample (PROPOSED, e.g. 5%) plus all small files; (d) `rclone check` on multipart MD5 metadata only if the provider preserves it (UNVERIFIED); (e) pipeline `ffprobe` at transcode start. **Do not use ETag equality**: multipart ETags are not the content MD5.
4. **Confirm:** the admin endpoint marks verified rows `uploaded`. Release to the pipeline only through the admin enqueue-by-listing job in tranches. The storage event rule is not enabled for backfill.
5. **Close-out (human):** delete the token; archive manifest and reports in the repo (no secrets).

## Reports (non-secret; format to implement)
`ingest-report.jsonl` one line per file: `video_id`, `legacy_ref`, `bytes`, `sha256`, `status` (`uploaded|skipped|failed`), `attempts`, `ts`. `verify-report.json`: counts (manifest, listed, missing, size mismatch, hash mismatch), sample size, list of `video_id` with problems. No keys, no signed URLs, no full local paths if they contain personal data.

## Eval cases (dev set)
`ingest verify` reports 0 missing and 0 mismatched; a deliberately truncated object is caught; a rerun skips completed objects; an interrupted run resumes; the manifest is stable on re-run (same `video_id` for the same file via `legacy_ref`; decide the re-run rule in the spec).

## Decide in the spec
Manifest stability rule, tool language/runtime, source-drive path conventions, throughput assumptions (measure first).
