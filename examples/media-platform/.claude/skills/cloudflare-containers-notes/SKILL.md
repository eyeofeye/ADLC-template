---
name: cloudflare-containers-notes
description: "EXAMPLE. Cloudflare Containers orchestration pattern (worker/queue/durable object), SIGTERM and preemption behaviour, and the idempotency recipe for an ffmpeg job, with a facts table you must fill and re-verify from vendor docs. Load when touching the orchestrator, container image, queue consumers or transcode retries."
---

<!-- Authored for this template. The facts table lists topics to look up; it deliberately carries no vendor numbers, because platform limits change. No ecc content. -->

# Cloudflare Containers notes (example)

## Facts to look up and record (with source URL and look-up date; never rely on memory)
| Topic | Where to look |
|---|---|
| Containers availability and status (GA or beta) | https://developers.cloudflare.com/changelog/product/containers/ |
| Architecture, instance types, limits (vCPU, memory, disk, outbound request-body limit) | https://developers.cloudflare.com/containers/platform-details/limits/ |
| Stop behaviour: SIGTERM grace period, then SIGKILL; autoscaling; cold start | https://developers.cloudflare.com/containers/faq/ |
| Pricing (active time, egress, logs) | https://developers.cloudflare.com/containers/pricing/ |
| Object-storage event notifications (which operations, filters, overlapping rules) | https://developers.cloudflare.com/r2/buckets/event-notifications/ |
| Queue consumer wall time and message size | https://developers.cloudflare.com/queues/platform/limits/ |
Record the values you find in {{COST_REFERENCE_DOC}}. Not known until measured: encode wall time per video; account instance limits at your planned concurrency; whether container-to-storage writes count as egress; whether two buckets need two credentials.

## Orchestration pattern
Source-bucket object-create event → queue → orchestrator worker → container, **one Durable Object per `video_id`** so duplicate events collapse. Prefer the default scheduling policy and a fixed instance type to avoid beta surface. The consumer **acks quickly**; the container reports completion by callback/exit monitor (do not hold a queue invocation for the whole encode: consumer wall time is limited); the DO persists attempt state and uses an **alarm** for timeout/retry. Image build/deploy is a CI job (wrangler + Docker), not an MCP action; keep the ffmpeg image portable so a fallback runner can consume the same queue.

## Idempotency recipe (the container can be stopped at any time)
1. Job input is `{video_id, source key, ladder_version, temp credentials}`; everything else derives from it.
2. Start by recording a run row `(video_id, attempt, started_at)`; stop if the attempt cap is reached (`cost-guardrails`).
3. Probe the source (`ffprobe`); fail fast on unreadable input.
4. Write output to **deterministic keys** (`r2-key-layout`); a retry overwrites the same objects. Use multipart for any single PUT near the request-body limit.
5. Write `master.m3u8` **last**; only then set `videos.status = ready` and the HLS key.
6. On SIGTERM: stop ffmpeg, do **not** write `master.m3u8`, exit non-zero within the grace period; the DO alarm retries from scratch.
7. A duplicate event for a `ready` video is a no-op; a video already running is ignored by the DO.
8. Temp credentials: read `source/{video_id}`, write `delivery/{video_id}` only; never log them.

## Sizing check
Estimate source size plus output size against the instance disk limit before choosing an instance type (ESTIMATE until measured). Backfill concurrency is bounded by the concurrency cap (`max_instances`).
