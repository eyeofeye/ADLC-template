---
name: security-review
description: "Security checklist for review-security (and used by builder/spec-designer): data boundary and RLS, access tokens/grants, object storage, secrets, Next.js route handlers, workers/edge functions, logging, dependencies, CI and MCP permissions. Load when reviewing a diff for security or writing a security-relevant spec."
---

<!-- Attribution: checklist structure and many items adapted from ecc skills/security-review/SKILL.md, skills/security-review/cloud-infrastructure-security.md and agents/security-reviewer.md (affaan-m/ecc, commit d2ef268, MIT, Copyright (c) 2026 Affaan Mustafa). Token, storage, RLS, contract and MCP rules are authored. See THIRD_PARTY_NOTICES.md. -->

# Security review checklist

Reference stack in scope: Next.js web app on a serverless host, Supabase (RLS, edge functions), edge workers/queues/object storage, `{{CONTRACT_DIR}}`, CI workflows, Claude Code agent config ({{STACK_SUMMARY}}). Adjust for your stack; add domain rules in `{{PROJECT_SKILLS}}`. Consumer frontends owned by others are not reviewed: only your side of the contract.

Severity: blocker / major / minor (see `review-findings-format`). Mapping from ecc: CRITICAL=blocker, HIGH=major, MEDIUM/LOW=minor.

## SEC-SEC Secrets and keys
- SEC-SEC-1 blocker: no secret, token, service-role key, signing secret, storage key or error-tracker auth token in source, fixtures, logs, CI output or `NEXT_PUBLIC_*` variables. The public database anon key and public URLs are fine.
- SEC-SEC-2 blocker: service-role keys and signing secrets live only in server secrets (worker/edge function/hosting server env or the CI `production` Environment); never in client bundles or browser-reachable responses.
- SEC-SEC-3 major: new env vars validated at startup (missing or blank fails closed). Secrets not passed on command lines.
- SEC-SEC-4 blocker: any human-held operator credential (for example a bulk-import token) never appears in the repo, CI, `.mcp.json` or agent-readable files.

## SEC-RLS Data boundary (public anon key means RLS is the only boundary)
- SEC-RLS-1 blocker: a new/changed table or policy that lets `anon`/`authenticated` read another tenant's data or unpublished rows, or write where it should not. Cross-check with `review-database` (RLS owner for SQL; here only the trust-boundary view). Dedup by rule ID.
- SEC-RLS-2 blocker: any end-user path using the service role.
- SEC-RLS-3 major: new RLS behaviour without negative tests in the eval plan.

## SEC-TOKEN Access tokens and grants (skip if you issue none)
- SEC-TOKEN-1 blocker: grants/tokens are signed with a per-tenant secret (e.g. HMAC-SHA256); verification is constant-time; expiry and a version claim are checked; unknown/expired/other-tenant tokens fail closed.
- SEC-TOKEN-2 blocker: a token binds the resource id and the tenant id; a token for one resource cannot fetch another.
- SEC-TOKEN-3 blocker: every URL handed to a client that grants access to protected content carries a verifiable signature; no unsigned path to protected content; edge/WAF rules that enforce this are not bypassed or loosened without the spec saying so.
- SEC-TOKEN-4 major: responses for not-visible and not-existing resources are indistinguishable; errors carry no internal detail; rate limiting (429) exists on token endpoints (edge/WAF or function-level).
- SEC-TOKEN-5 major: CORS on token endpoints and protected hosts allows only the configured allowed origins; no `*` with credentials.

## SEC-STORE Object storage
- SEC-STORE-1 blocker: buckets holding originals or private data stay private (no custom domain, no public dev URL, no public ACL, never referenced from client-visible data); only the delivery bucket is exposed.
- SEC-STORE-2 major: presigned upload URLs: short expiry, bound to the object key and content type, server-side authorisation of the uploader, CORS limited to the app origin.
- SEC-STORE-3 major: temporary credentials minted for workers are scoped to the read prefix and the write prefix of one job; no long-lived keys in containers.
- SEC-STORE-4 major: object keys are built only from server-generated ids; user-provided names never become keys or paths (path traversal).

## SEC-WEB Web app, workers and edge functions
- SEC-WEB-1 blocker: every route handler and server action authenticates the caller and authorises the specific resource before side effects (presign, complete, publish, admin import).
- SEC-WEB-2 blocker: no `dangerouslySetInnerHTML`/`innerHTML` with unsanitised data; React auto-escaping not bypassed.
- SEC-WEB-3 major: state-changing cookie-session endpoints are protected against CSRF (SameSite cookies as configured by the auth helper, origin check or token); verify what the chosen auth helper already provides before flagging.
- SEC-WEB-4 major: untrusted input validated with a schema at every boundary (request bodies, queue messages, event payloads, import rows); allowlist, not blocklist.
- SEC-WEB-5 blocker: no `fetch(userProvidedUrl)` or shell/`child_process` with user-derived arguments; external binaries invoked with an argv array, never a shell string, and input keys from server-generated ids only (SSRF/command injection).
- SEC-WEB-6 major: security headers (CSP without `unsafe-inline`/`unsafe-eval` by default, `frame-ancestors`, `object-src 'none'`) on the web app; changes that loosen them need justification.
- SEC-WEB-7 major: file-upload constraints enforced server-side: allowed extensions/content-types, a size ceiling agreed in the spec, part count within limits.

## SEC-LOG Data exposure and logging
- SEC-LOG-1 major: no tokens, grants, signatures, emails, JWTs or signed URLs in logs, error-tracker events, error messages or traces; tracker PII settings stay minimal; correlation tags only.
- SEC-LOG-2 major: client-facing errors are generic; detail only in server logs.

## SEC-DEP Dependencies and CI
- SEC-DEP-1 major: new/updated dependencies justified; lockfile committed and `pnpm audit` (or equivalent) high/critical findings on touched packages are findings; unpinned `latest`, install scripts from unknown packages, and third-party GitHub Actions pinned by tag instead of SHA are flagged (minor unless secrets are in scope).
- SEC-DEP-2 blocker: workflow changes that expose `production` Environment secrets to PRs from forks or to agent jobs, or that let an agent-triggered job write to prod without G3.

## SEC-AGENT Agent and MCP configuration (see agent-security-hardening)
- SEC-AGENT-1 blocker: any change to `.mcp.json`, `.claude/**`, hooks, CODEOWNERS, token scopes that gives an agent a prod write capability, removes a deny rule, or widens a path-guard.
- SEC-AGENT-2 major: logs, issues, PR text, error-tracker events and alert bodies are treated as untrusted data in agent prompts; no inbound webhook feeds an agent.

## Infrastructure items adapted from ecc's cloud skill
Least-privilege tokens apply to your provider API tokens (hosting, database, edge, GitHub): scope per project, prod read-only for agents. MFA on owner accounts is a human runbook item, not a diff finding.

## Dropped from ecc
Solana/blockchain, payments/balance-lock patterns, bcrypt/password handling (assumes a managed auth provider owns credentials), Express `express-rate-limit`, XXE and generic deserialization (raise only if the diff adds one), AWS/Terraform/CloudWatch snippets, "alert the project owner / rotate secrets / verify remediation" emergency steps (reviewers are read-only and cannot contact anyone: a leaked-secret blocker is written up and the reviewer states "rotate before merge" in the Fix line).

## Verification evidence to request from eval-runner (not run by the reviewer)
Negative tests: unauthenticated, cross-tenant, unpublished, expired token, wrong-resource token, protected URL without signature, CORS from a non-allowed origin.
