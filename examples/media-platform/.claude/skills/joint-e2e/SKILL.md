---
name: joint-e2e
description: "EXAMPLE. Joint end-to-end test matrix: black-box Playwright runs against an external frontend team's deployed URLs, the cases, run schedule, results format, and the rule that frontend code is never read or changed. Load when planning, writing or running joint E2E runs."
---

<!-- Authored for this template. Playwright is a suggestion; the ecc e2e-testing skill is not vendored (page-object patterns assume you own the app under test). -->

# Joint E2E, black-box (example)

You own the tenant backends and the media platform; the **frontend is not yours**. This suite proves the two sides work together without reading, editing or running frontend code. eval-runner runs it; the frontend team supplies deployed URLs and test accounts through a human (never committed; referenced by env var **names**).

## Runs
Plan your runs and windows in {{JOINT_E2E_SCHEDULE_DOC}} (owner-controlled): e.g. one run per tenant against the production media path, one with all tenants, and a last run with a full-catalogue sample plus manual Safari/iOS device checks. Integration against the dev backend can start earlier.

## Cases (per tenant)
| Case | Expect |
|---|---|
| login | viewer signs in; session works |
| list | only published videos of this tenant |
| play | grant issued, manifest loads, first segment plays (hls.js on Chromium/Firefox) |
| seek | seek to mid and end works, no stall |
| ABR switch | throttle bandwidth: rendition changes down and up across the ladder |
| expired grant | a grant older than its TTL is rejected by the grant/signer path; what the player does next is recorded, not asserted (frontend is not yours) |
| wrong tenant | grant/JWT from another tenant is rejected |
| unpublished video | same response as a non-existent id |
| CORS origins | allowed origin works; a non-registered origin is blocked |

Safari macOS and a real iPhone use native HLS and **cannot be automated here**: record them as a manual checklist with date, device, OS and result, and report "NOT tested by automation" for those in `eval-report.md`.

## Rules
- Read-only black box: browser automation against URLs; no frontend repo access, no frontend code in prompts, no frontend project settings. If a failure looks frontend-side, report evidence (HAR, console, network, screenshot) and stop; a human tells the frontend team.
- Accounts are test accounts; no real viewer data; no prod writes beyond what viewing causes. Do not load-test prod.
- Secrets (test credentials) come from env var names provided at run time; never write them into reports, traces or HARs (scrub `Authorization`, `verify=` query values).

## Results format
A section `Joint E2E run #n` in `eval-report.md`: table `tenant × case → PASS | FAIL | NOT TESTED`, run date, frontend URL host (no query strings), contract version (`VERSION`), build identifiers the frontend team provides, evidence paths, and a "Not tested" list. A FAIL on playback of a published video is reported to the owner as release-relevant; the owner decides.

## Decide in the spec
Playwright project layout and how bandwidth throttling for ABR is done; who owns the frontend repo/projects and their availability for the run dates.
