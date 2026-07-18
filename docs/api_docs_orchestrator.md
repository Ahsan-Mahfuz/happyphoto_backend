# API Documentation Orchestrator Prompt (Modular Codebase)

## Role

Act as a **Senior Technical Writer** and **Build Engineer**. You orchestrate documentation generation across a modular codebase. You treat the doc set as a build artifact: deterministic, diffable, and reproducible from source. You apply the per-module documentation contract uniformly while centralizing shared concerns so they are defined exactly once.

## Objective

In a **single invocation**, generate or refresh `docs/api/<module>.md` for **every module** discovered under `src/app/module/*`. The output mirrors the source module structure 1:1. No module is left undocumented; no doc file exists without a corresponding source module.

The per-module documentation contract is the one defined in `docs/prompts/api_docs_prompt.md` (the per-module prompt). This orchestrator applies that contract uniformly to each module, plus the cross-cutting rules below.

## Pre-Flight (Global)

Before touching any module, establish shared ground truth:

- **Read shared infrastructure**: `src/app/middleware/`, `src/app/builder/`, `src/app/routes/`, and any global config (`config/`, `.env.example`, `package.json`). These define cross-module contracts (auth scheme, error envelope, rate limiter, pagination, logging).
- **Generate or refresh `docs/api/_shared.md`** — the canonical reference for:
  - Authentication scheme (JWT / session / API key / OAuth2) and token lifecycle
  - Error response envelope (canonical shape, error code registry)
  - Pagination, filtering, sorting conventions
  - Common request/response headers (`Authorization`, `Idempotency-Key`, `X-Request-Id`, `ETag`, `Retry-After`)
  - Default rate limits and quota dimensions
  - Date/time, currency, and ID formats
  - **If `_shared.md` fails to generate, abort the entire run.** Every module doc depends on it; partial generation with a broken shared contract produces inconsistent docs.
- **Load previous manifest**: read `docs/api/_manifest.json` if it exists. This holds the last generation metadata and per-module source hashes.

## Phase 1 — Module Discovery

- Enumerate directories under `src/app/module/`. The directory list **is** the canonical module list. Do not hardcode module names — the prompt must work as modules are added or removed.
- For each module directory, compute a **source hash**: a content hash over all files under `src/app/module/<module>/` (excluding `node_modules`, `__tests__`, `*.test.*`, `*.spec.*`). Record file count and total LOC.
- Compare each module's current source hash to the previous manifest:
  - **Unchanged** → skip regeneration, preserve existing `docs/api/<module>.md` as-is. Log as `skipped`.
  - **Changed** → mark for full regeneration. Log as `regenerated`.
  - **New** (no previous hash) → mark for full regeneration. Log as `new`.
  - **Removed** (in previous manifest, no source dir now) → archive the existing doc to `docs/api/_archived/<module>.md` with a deprecation banner. Do not delete. Log as `archived`.

> A `--force` flag overrides the skip-if-unchanged behavior and regenerates all modules.

## Phase 2 — Shared Contract Generation

- Write `docs/api/_shared.md` first. All module docs in Phase 3 MUST cross-link to it (e.g., "See [\_shared.md §Authentication](./_shared.md#authentication)") instead of restating the content.
- If a module overrides a shared default (e.g., a stricter rate limit, a different auth scope), the module doc states the override and links to the baseline.

## Phase 3 — Per-Module Documentation (Parallel)

For every module marked for regeneration, apply the **per-module documentation contract** (`docs/prompts/api_docs_prompt.md`) to produce `docs/api/<module>.md`. Execution rules:

- **Parallelism**: modules are independent — process them concurrently. Each module reads only its own source tree plus `_shared.md`. No module writes to another module's doc.
- **Failure isolation**: if module X fails generation (e.g., undeterminable schema, source syntax error), record the failure in the manifest with the error and stack trace, then continue with the remaining modules. A single module failure must not abort the run.
- **Atomic writes**: write each doc to `docs/api/<module>.md.tmp` first, validate it (see Phase 5), then rename to the final path. Never leave a half-written doc file on disk.
- **Source traces**: every schema table and error code in the generated doc must carry an HTML comment tracing back to the source file:line (e.g., `<!-- source: src/app/module/order/validators.ts:42 -->`). This is what enables future drift detection.
- **Cross-module references**: if module A's routes call into module B's services, document the dependency in module A's "Dependencies" section with a link to `docs/api/<module-b>.md`. Do not duplicate module B's contract.

## Phase 4 — Background Job Aggregation

- During Phase 3, each module doc captures its own background jobs in §6.
- Additionally, produce `docs/api/_jobs.md` — a cross-module index of all background jobs and cron tasks, sorted by schedule. Columns: `| Job Name | Module | Schedule (cron) | Schedule (human) | Purpose | Monitoring |`. This gives ops a single view of everything running in the system.
- Each row links back to the module doc's job section.

## Phase 5 — Validation Gate

Before any doc is renamed from `.tmp` to final, run these checks. A doc that fails any check is moved to `docs/api/_failed/<module>.md` with a validation report, and the manifest records the failure.

1. **No placeholders**: no `TBD`, `TODO`, `???`, `FIXME`, `<missing>` in the body.
2. **Valid JSON**: every fenced JSON block parses with `JSON.parse`.
3. **Valid Mermaid**: every Mermaid block parses without syntax errors.
4. **Source traces present**: every schema table and error code section has at least one `<!-- source: -->` comment.
5. **Cross-links resolve**: every relative Markdown link and anchor points to an existing target.
6. **Shared-contract deduplication**: the doc does not redefine auth/error/pagination — it links to `_shared.md` instead.
7. **Module name match**: the H1 of the doc matches the directory name in `src/app/module/`.
8. **Route coverage**: the number of routes documented in the file matches the number of routes discovered by programmatic route extraction from the source. Mismatch = failure.

## Phase 6 — Manifest & Index Generation

Produce two artifacts after all modules finish:

### `docs/api/_manifest.json`

```json
{
  "generated_at": "2026-07-06T00:00:00Z",
  "source_commit": "<git SHA>",
  "source_branch": "<git branch>",
  "total_modules": 13,
  "total_routes_documented": 0,
  "total_jobs_documented": 0,
  "shared_contract_hash": "<sha256 of _shared.md>",
  "modules": [
    {
      "name": "order",
      "status": "regenerated | skipped | new | archived | failed",
      "source_hash": "<sha256>",
      "source_files": 14,
      "source_loc": 1820,
      "doc_path": "docs/api/order.md",
      "route_count": 12,
      "job_count": 2,
      "validation_passed": true,
      "errors": []
    }
  ]
}
```

### `docs/api/README.md` — Module Index

A table of all modules with links, one-line purposes, status badges, and route counts:

```markdown
# API Documentation Index

> Auto-generated from `src/app/module/*` on 2026-07-06. Do not edit by hand — regenerate via the orchestrator prompt.

## Modules

| Module | Routes | Jobs | Status | Last Generated | Doc                    |
| ------ | ------ | ---- | ------ | -------------- | ---------------------- |
| admin  | 18     | 0    | ✅     | 2026-07-06     | [admin.md](./admin.md) |
| auth   | 8      | 1    | ✅     | 2026-07-06     | [auth.md](./auth.md)   |
| ...    | ...    | ...  | ...    | ...            | ...                    |

## Shared Contracts

- [Authentication, Errors, Pagination, Headers](./_shared.md)

## Background Jobs

- [Cross-module job schedule](./_jobs.md)

## Regeneration

Run the orchestrator prompt against `src/app/module/*`. See `docs/prompts/api_docs_orchestrator.md`.
```

## Phase 7 — Console Summary

Print a one-screen summary at the end:

```
═══════════════════════════════════════════════════════
  API DOC GENERATION COMPLETE
═══════════════════════════════════════════════════════
  Modules total:      13
  Regenerated:        7    (admin, auth, order, payment, ...)
  Skipped (current):  4    (cart, chat, feedback, ...)
  New:                1    (property)
  Archived:           0
  Failed:             1    (review — see _failed/review.md)

  Routes documented:  127
  Jobs documented:    9
  Shared contract:    regenerated
  Total wall time:    42.3s
  Source commit:      a1b2c3d
═══════════════════════════════════════════════════════
```

## Guardrails (Orchestrator-Level)

- **Never hardcode the module list.** The list comes from directory enumeration. Adding a new module under `src/app/module/` and re-running the orchestrator must produce a new doc with zero prompt changes.
- **Never delete an existing doc.** Removed modules are archived to `docs/api/_archived/` with a banner explaining the module was removed and when.
- **Never let one module's failure abort the run.** Failures are isolated, recorded, and surfaced in the summary.
- **Never regenerate `_shared.md` mid-run.** It is generated once in Phase 2 and treated as immutable for the rest of the run. If it needs to change, the entire run restarts.
- **Never write outside `docs/api/`.** The orchestrator does not touch source files, tests, or config.
- **Idempotency**: running the orchestrator twice on unchanged source produces byte-identical doc files (modulo timestamps in the manifest). The `.tmp`-then-rename pattern ensures no partial state.
- **Concurrency safety**: if two orchestrator runs somehow overlap, the second detects an existing `_manifest.json` lock and aborts with a clear message.

## Output File Tree (after a full run)

```
docs/api/
├── README.md                    ← module index (Phase 6)
├── _shared.md                   ← shared contracts (Phase 2)
├── _jobs.md                     ← cross-module job schedule (Phase 4)
├── _manifest.json               ← generation metadata (Phase 6)
├── _archived/
│   └── <removed-module>.md      ← archived docs for removed modules
├── _failed/
│   └── <failed-module>.md       ← docs that failed validation, with report
├── admin.md
├── auth.md
├── cart.md
├── chat.md
├── feedback.md
├── manage.md
├── notification.md
├── order.md
├── payment.md
├── product.md
├── property.md
├── review.md
└── user.md
```

## Invocation

Run this orchestrator prompt against the repository root. It will discover modules, regenerate changed docs, validate, and emit the manifest + index. Re-run any time `src/app/module/*` changes — only the affected modules will regenerate.
