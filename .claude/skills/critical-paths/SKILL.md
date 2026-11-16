---
name: critical-paths
description: "The list of critical paths that need a human merge (G2), and a script that tells you whether a set of files touches one. Load when planning (set critical: yes/no per task), building (do not edit paths you do not own), spec-ing, or reviewing (verdict human-required)."
---

<!-- Authored for this template. No third-party content. -->

# Critical paths (G2)

A change that touches any path below is a **critical-path change**: it may be reviewed by agents but is merged only by a human (G2), and `reviewer` returns `human-required` (never `approve`). CODEOWNERS is the enforcement; this skill and CI use the same list.

## The list (`critical-paths.json` in this skill directory is the single source)

The shipped defaults are a **starting point**; edit `critical-paths.json` and the table below to match {{PROJECT_NAME}}, and keep `CODEOWNERS` identical (see `--codeowners`). Add every path you would not let an agent merge alone (see {{CRITICAL_PATHS}} in the README).

| Pattern | Why |
|---|---|
| `supabase/**/migrations/**`, `supabase/**/functions/**`, `**/rls/**` | Data boundary: schema, RLS and server functions |
| `**/auth/**` | Authentication and session code |
| `workers/**` | Background workers and queue consumers |
| `packages/contract/**` | Versioned contract that external consumers depend on (change to match {{CONTRACT_DIR}}) |
| `.claude/**`, `.mcp.json` | Agents, hooks, skills, permissions: agents must not loosen their own rules |
| `.github/workflows/**`, `**/wrangler.*`, `vercel.json` | The only prod-write path and deploy config |
| `CODEOWNERS` (repo root; any depth matches) | The enforcement file itself |

Matching is gitignore-style: a pattern without `/` matches at any depth, `**` crosses directories.

## Use

```bash
# files changed on this branch vs main
node .claude/skills/critical-paths/scripts/critical-paths.mjs --json
# explicit files (planner, before a plan exists)
node .claude/skills/critical-paths/scripts/critical-paths.mjs src/lib/auth/session.ts docs/changes/x/spec.md
# drift check against CODEOWNERS (CI; exit 1 on drift)
node .claude/skills/critical-paths/scripts/critical-paths.mjs --codeowners CODEOWNERS
```

`--json` prints `{ "critical": bool, "files": [{ "file", "patterns" }] }`. Needs Node 18+ and no dependencies.

## Rules per role

- **planner:** set `critical: yes` on every task whose `files` match; run the script on the planned file list, do not eyeball.
- **builder and domain builders:** you may edit critical paths on a feature branch (that is the job) but never merge: a PR touching them waits for G2. The hooks block edits to `.claude/**`, `.mcp.json`, `.github/**` for agents that do not own them.
- **spec-designer:** list `touches:` paths; any critical match means the spec's risk class is `critical`.
- **reviewer:** CI re-derives the list from the diff and overrides the agent; the verdict must be `human-required` when it is non-empty (blocker => `reject`).
- **review-* agents:** report `critical_paths_touched` hints only; they do not decide.

## Setup
Create `CODEOWNERS` with exactly the patterns in the JSON and an owner handle, then run `--codeowners` in CI. Until then the JSON is the only copy.
