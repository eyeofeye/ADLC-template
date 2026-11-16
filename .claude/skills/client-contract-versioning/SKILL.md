---
name: client-contract-versioning
description: "Rules for changing {{CONTRACT_DIR}} (the only handoff to an external consumer such as a separate frontend team): contract-first workflow, semver rules and what counts as breaking, CHANGELOG, overlap window, compat checks and the never-touch-the-consumer rule. Load before specifying, building or reviewing anything an external consumer can observe."
---

<!-- Attribution: the contract-first workflow (one authoritative artifact, consumer-first design, change protocol, anti-patterns, completion checklist) is adapted from ecc skills/contract-first/SKILL.md (affaan-m/ecc, commit d2ef268, MIT, Copyright (c) 2026 Affaan Mustafa). Semver rules and the boundary are authored. See THIRD_PARTY_NOTICES.md. -->

# Contract versioning

Optional skill: use it when part of the system is built by **another team** that only sees a published contract. Where a consumer holds a public key (for example a public database anon key), the data-access policy is the only data boundary. Replace `{{CONTRACT_DIR}}` (suggested: `packages/contract`) with your path, and keep it a critical path.

## The artifact
`{{CONTRACT_DIR}}/`: `VERSION` (semver), `CHANGELOG.md`, one OpenAPI file per API surface, generated types, a table of data-access (RLS) behaviour, mock responses. One authoritative copy: no second description in a wiki, mock or serializer that can drift.

## What the consumer can observe (so what is "the contract")
Request/response shapes, required vs optional fields, nullability, enums, error codes and statuses, **row visibility** (which rows a logged-in user sees), token/grant semantics (TTL, claims, version), CORS allowed origins, URL forms. Database columns and internal classes are not contract unless observable.

## Change protocol (never implement first)
1. State the consumer need and the compatibility impact in `spec.md` → `Contract impact: none | PATCH | MINOR | MAJOR`.
2. Change the artifact first; regenerate types/mocks.
3. Implement provider changes; contract tests validate real serialized responses (success, each documented error, empty and null cases, unauthorized), not only TypeScript types (`as unknown as` hides drift).
4. Bump `VERSION` and write a `CHANGELOG.md` entry **in the same PR** (reviewer rejects an undeclared breaking change).
5. A human delivers the release to the consumer after G3 (channel: {{CONTRACT_DELIVERY_CHANNEL}}); agents never contact them.

## Semver
| Bump | Meaning |
|---|---|
| MAJOR | removal, rename, type change, **visibility change**, token/grant semantic change → new endpoint/schema version and an **overlap window** with the previous major (length agreed with the consumer: {{CONTRACT_OVERLAP_WINDOW}}); record each consumer's served version |
| MINOR | additive or optional (new optional field, new error code the client can ignore, new endpoint) |
| PATCH | fix or documentation, behaviour unchanged for compliant clients |
Pre-1.0 (0.x) still gets a CHANGELOG entry and a bump; breaking changes are allowed but must be listed.

## CHANGELOG entry (format fixed here)
```
## <version> - <YYYY-MM-DD>
### Breaking   (MAJOR only: what, why, migration, overlap window end date)
### Added
### Changed
### Fixed
### RLS behaviour   (any visibility change, referencing the table row)
```

## Enforcement
eval-runner: contract tests against the dev backend (any OpenAPI-driven runner qualifies), backward-compat diff of OpenAPI and generated types against the last released tag (no breaking diff without a MAJOR bump), RLS negative tests (`supabase-rls-patterns`). Reviewer blocks unversioned contract changes. release-manager tags the release after G3.

## Boundary (hard rules)
- **Never read, edit, or run anything in a consumer's repo or hosting project**; no secrets, DB access, MCP access or repo access for the consumer team. The GitHub token is scoped to this repo.
- Scaffolding agents stamp new backends at the current contract version and never touch consumer code.
- Joint end-to-end tests with the consumer are black-box.
- If you freeze MAJOR changes before a launch date, record the freeze date here: {{CONTRACT_FREEZE_POLICY}}.

## Anti-patterns
Contract written after the implementation; DB shape leaked as API; renaming a field "privately"; two sources of truth; compile-time types as the only proof; a visibility tweak shipped as a PATCH.

## Completion checklist
- [ ] `Contract impact` stated; artifact changed first; types/mocks regenerated
- [ ] Provider responses validated against the artifact, error and null paths included
- [ ] Backward-compat diff clean or MAJOR + overlap window planned
- [ ] `VERSION` and `CHANGELOG.md` updated; visibility table updated if visibility changed
- [ ] Mocks still valid; CORS and integration notes still true
