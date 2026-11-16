---
name: vercel-deploy
description: "How a Next.js app is built and deployed on Vercel in this pipeline: preview vs production (CI after G3), what the agent Vercel tools may do, platform limits that shape upload design, env var rules, and the Next.js proxy.ts naming note. Load when touching the web app, vercel.json, env vars, or reviewing deploy-related changes. Replace if you deploy elsewhere."
---

<!-- Attribution: the proxy.ts/middleware.ts note is taken from ecc skills/nextjs-turbopack/SKILL.md and the `vercel rollback` command from ecc skills/deployment-patterns/SKILL.md (affaan-m/ecc, commit d2ef268, MIT, Copyright (c) 2026 Affaan Mustafa); both are ecc claims not verified against Vercel/Next.js docs. The rest is authored. See .claude/skills/VENDORED.md and THIRD_PARTY_NOTICES.md. -->

# Vercel deploy

Scope: the Vercel project(s) for {{PROJECT_NAME}}'s web app (Root Directory `{{WEB_APP_DIR}}`). Projects owned by external consumers are not yours: never read, deploy or configure them.

## Environments
| Env | How it deploys | Who |
|---|---|---|
| Preview | PR Git integration creates a preview for each PR | automatic; builder only reads status and logs |
| Production | CI `deploy-prod-*` in the `production` Environment (`vercel deploy --prod`) after **G3** | CI with the only prod Vercel token; Git production auto-deploy must be disabled (setting name UNVERIFIED: check Vercel docs) |

Agents never deploy to production and hold no Vercel prod token. The Vercel MCP carries the connecting user's account access, so use a bot identity with minimal team roles, and restrict each agent's `tools:` allow-list (builder: `list_deployments`, `get_deployment`, `get_runtime_logs`, `get_runtime_errors`, `list_projects`, `get_project`; the deploy tool is not granted).

## Shape rules from platform limits
- **Never proxy large payloads (e.g. media files) through a serverless function.** Function request body and duration limits depend on the plan (look them up: UNVERIFIED until you do). Use browser → object storage direct upload via presigned URLs; the app only creates the session, signs parts and completes the upload.
- The app holds an object-storage key scoped to the upload bucket only, in hosting env (`SEC-STORE-*`).
- Presigning uses the storage's S3-compatible endpoint (SigV4); a platform binding may not be able to presign (check your provider).

## Env vars
- Names are defined in the first web-app spec and documented in `.env.example` (no values); validate all required vars at startup and fail the build or boot if missing.
- Anything secret is **server-only**: never `NEXT_PUBLIC_*` (`SEC-SEC-1`). Agents see names, never values; prod values live only as hosting project env set by a human and CI `production` Environment secrets.
- Preview and production use different databases and buckets (dev vs prod); never point a preview at prod.

## Next.js notes
- In Next.js 16 the middleware file is `proxy.ts`; before 16 it is `middleware.ts`. The rename follows the Next.js version, not the bundler. Do not flag either name as wrong without checking the repo's Next.js version (ecc claim, check Next.js docs).
- Auth and upload paths are critical paths (`critical-paths`).
- Errors: error-tracker SDK per `observability-conventions`.

## Rollback (recommendation only; release-manager cannot deploy)
Promote the previous deployment (`vercel rollback` per ecc `deployment-patterns`, not verified against Vercel docs) via the production workflow, with the previous deployment id recorded in `docs/releases/<v>/verification.md`.
