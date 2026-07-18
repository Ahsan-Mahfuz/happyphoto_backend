# Master Audit Prompt — Full-System API Audit (No-Dependency, Completion-Enforced Edition)

## Role

Act as a Principal Software Architect and Senior QA Automation Engineer. You combine deep code-reading ability with adversarial testing instincts. You think like both the developer who wrote the system and the attacker trying to break it.

## Objective

Conduct a coverage-driven audit of **the entire codebase's API surface** — every route, in every file, in every module, with no exceptions. This is a whole-system audit, not a diff review scoped to one change. The goal is threefold:

1. Map **every** registered route in the codebase and its middleware chain, regardless of which feature or module it belongs to.
2. Verify functional integrity, security posture, and state consistency for **each route individually**, across the entire application.
3. Produce a single audit that gives equal, complete coverage to old code, new code, and everything in between — no module is "out of scope" just because it predates or postdates the Part 2 change.

**Scope realism note:** "100% coverage" means every discovered route **in the whole codebase** is exercised at least once at each applicable tier (Tier 1, Tier 2, Tier 3). It does not mean exhaustive fuzzing of every input combination — use equivalence-class partitioning and boundary-value analysis to keep the test matrix tractable. It **does** mean no route, no module, and no file is skipped, deferred, or summarized-away — whether or not it relates to Part 2.

---

## Hard Constraint: No Third-Party Packages

- Do **not** run `npm install`, `yarn add`, `pnpm add`, or modify `package.json` / lockfiles to add any new dependency (no `supertest`, `axios`, `jest`, `mocha`, `chai`, `nock`, etc.).
- Use **only Node.js built-ins**:
  - `node:test` (or the project's already-installed test runner if one already exists in `package.json` — check first; do not add a new one) for structuring test cases.
  - `node:assert` / `node:assert/strict` for assertions.
  - `node:http` / `node:https` (or the global `fetch`, available in modern Node) for issuing HTTP requests against the running server.
  - `node:crypto` for generating tokens, UUIDs, hashes, or tampered JWT signatures.
  - `node:child_process` only for local process/server lifecycle management (starting/stopping the audit server), not for shelling out to external tools that aren't already part of the repo.
- If the project already has a test framework or HTTP client installed as an existing dependency, you may use it — "no third-party packages" means **do not introduce new ones**, not "ignore what's already there."
- If a task is genuinely impossible without a new package, do not silently skip it and do not install anything — **stop, document the blocker in the report as "BLOCKED — requires dependency `<name>`, not installed per audit constraints,"** and move to the next test case.

---

## Anti-Incompleteness Protocol (mandatory — this audit was incomplete last time)

The single biggest failure mode of this audit is silently skipping routes, tiers, or phases. To prevent that:

1. **Build a persistent Progress Ledger first.** Before writing any test, create `docs/reports/audit_progress_ledger.json` listing every route discovered in Phase 1, each with four boolean/status fields: `tier1`, `tier2`, `tier3`, `state_consistency`. Initialize all as `"pending"`.
2. **Update the ledger after every single test case**, not after every route and not at the end. Valid statuses: `pending`, `pass`, `fail`, `blocked`.
3. **No route may be marked "done" with any field still `pending`.** A route is only complete when `tier1`, `tier2`, and `tier3` are each `pass`, `fail`, or `blocked` (never left `pending`).
4. **Before generating the final report, re-read the ledger and self-audit:** if any route has a `pending` field, you must go back and execute that missing test before proceeding — do not write the report around the gap.
5. **Explicitly print a completion summary** at the end of testing: `X/X routes fully tested, 0 pending` (or list the exceptions and why, per the BLOCKED rule above). If the count is not 100%, the audit is not finished — continue working, do not generate the final report yet.
6. **Do not compress or summarize test execution to save time.** Every route gets its own Tier 1 / Tier 2 / Tier 3 pass, logged individually in the Master Test Matrix — no "and similarly for the remaining routes" shortcuts.

---

## Pre-Flight Requirements

Do not skip these — running tests without them invalidates the audit.

1. **Environment Isolation:** Run against a dedicated audit environment (staging or ephemeral local instance). Never run destructive tests against production or shared dev data.
2. **Test Data Fixtures:** Create a known-good fixture set (users, tokens, parent resources) using only built-in tooling (`node:crypto` for tokens/UUIDs, direct DB inserts via the project's existing DB client). Record fixture IDs in the report so failures are reproducible.
3. **Baseline Snapshot:** Capture the current route inventory and DB row counts for affected tables (e.g., `orders`, `payments`) before testing. Compare against the same counts after testing to detect orphan rows.
4. **Teardown Plan:** Define how test-created resources will be cleaned up (cascade delete, transaction rollback, or a cleanup script written in plain Node). Document the strategy in the report.
5. **Rate / Concurrency Limits:** Note any rate-limit middleware and stay below it, OR explicitly document that you are stress-testing it.

---

## Execution Protocol

### Phase 1 — Dynamic Route Discovery (complete for the _whole_ codebase, not just Part 2)

- Scan **every** route definition source in the repository: `app.js`/`server.js`, `routes/`, `controllers/`, framework loaders, and any dynamic registrations (file-system routing, plugin loaders, auto-mounted routers) — across all modules, not only the order/payment/connect area described in Part 2.
- Do not stop at the first routes file found, and do not stop once the Part 2–related routes are found — recursively walk the **entire** project structure so no router mounted in a sub-directory or lazily required module is missed, regardless of which feature it belongs to.
- Treat Part 2–related routes as a subset that gets an extra regression check later (Phase 3), not as the primary target of Phase 1 discovery.
- For each endpoint, capture:
  - HTTP method(s) and full URL path (with param placeholders resolved to sample values)
  - Middleware chain in execution order (auth, validation, rate-limit, etc.)
  - Handler function reference (file:line)
  - Source of truth: was the route auto-registered or explicitly declared?
- Emit the inventory as a structured artifact: `route_map.json`, so downstream phases and the Progress Ledger can consume it programmatically.
- **Gate:** Phase 2 may not begin until `route_map.json` and `audit_progress_ledger.json` both exist and the route counts match exactly.

### Phase 2 — Multi-Vector Payload Testing (every route, all three tiers)

For **every** discovered route, perform 3-Tiered Validation using `node:assert` (or the project's existing assertion library if one is already installed — do not introduce a new one).

**Tier 1 — Positive Testing (Schema Compliance)**

- Send the ideal, correctly formatted payload.
- Assert: expected 2xx status, response schema matches the documented contract, response time within an agreed baseline (e.g., P95 < 500ms for non-aggregate endpoints).
- Capture the response as the golden contract for diffing in future audits.

**Tier 2 — Negative / Edge Testing (Mutation Fuzzing)**
Apply the following mutation classes systematically to every route that accepts input:

- Type Swaps: string→number, number→string, object→array, boolean→string `"true"`.
- Required-Field Omission: drop each mandatory field one at a time; assert 400 with a field-specific error message.
- Boundary Values: empty string, single char, max-length+1, null, NaN, negative integers, 0, `Number.MAX_SAFE_INTEGER+1`, Infinity, deeply nested objects, oversized payloads (>1MB) to probe buffer handling.
- Format Violations: malformed UUIDs, invalid ISO-8601 dates, bad email syntax, non-Base64 in binary fields.
- Duplicate / Conflicting Fields: e.g., send both `id` and `uuid` pointing to different resources.

**Tier 3 — Authorization / Security Testing**

- Anonymous Access: no `Authorization` header → expect 401.
- Expired / Malformed Token: tampered JWT, wrong signature, expired `exp`, `alg: none` attack (construct manually via `node:crypto`, no JWT library needed for the attack payload itself) → expect 401/403.
- IDOR / Horizontal Privilege Escalation: authenticated as User A, attempt to read/modify User B's resources → expect 403 or 404 (never 200).
- Vertical Privilege Escalation: standard user attempts admin-only routes → expect 403.
- Mass Assignment: include privileged fields (`role`, `isAdmin`, `balance`) in an update payload → verify they are filtered, not persisted.
- Injection Probes: SQLi (`' OR 1=1--`), NoSQLi (`{"$gt":""}`), path traversal (`../../etc/passwd`), SSRF-shaped URLs in any field that is later fetched.
- HTTP Method Override: try `X-HTTP-Method-Override: DELETE` on a GET route to detect middleware bypass.

**Update the Progress Ledger after each tier for each route before moving on.**

### Phase 3 — State Consistency Audit

- **Transactional Integrity:** For multi-step flows (order → payment → fulfillment), force a failure mid-flow (e.g., kill the payment stub) and verify the DB has no partial records or "ghost" entries. Assert that compensating transactions or rollbacks fire correctly.
- **Idempotency:** Replay POST/PUT requests with the same `Idempotency-Key` header (if supported). Assert the second response is a cached duplicate, not a new resource.
- **Legacy Regression:** Identify routes untouched by the Part 2 changes and run the **full** Tier 1, Tier 2, and Tier 3 suite against them — same depth as Part 2–touched routes, not a reduced sample. The Part 2 document defines which routes get an _additional_ targeted regression comparison against pre-change behavior; it does not reduce the testing owed to everything else. Failures here are regressions and must be escalated.
- **Concurrency:** For write endpoints, fire N parallel requests (via `Promise.all` + `fetch`/`node:http`, no load-testing library needed) against the same resource. Verify optimistic-locking (ETag / If-Match) or pessimistic locks prevent lost updates.

### Phase 4 — Failure Triage & Reproduction

For every failed assertion:

- Capture the exact request (method, URL, headers, body) and full response (status, headers, body).
- Capture the server-side stack trace from logs.
- Classify severity: Blocker / Critical / Major / Minor / Info.
- Propose a remediation with a concrete code-level suggestion (file + approximate fix), not just "validate input."
- Write a minimal reproduction script to `/repro/<route>_<testcase>.test.js` using only `node:test` and `node:assert`, so the failure can be re-run after the fix with `node --test`.

---

## Reporting

Generate the audit report at `@docs/reports/full_server_audit_[DATE].md` AND a machine-readable companion `full_server_audit_[DATE].json` (for diffing against future audits), AND keep `audit_progress_ledger.json` alongside them as proof of full coverage.

### Report Structure

1. **Executive Summary** — Overall health of the **whole codebase**, pass/fail/warn counts across all routes (not just Part 2–related ones), critical findings called out in the first paragraph, a separate regression verdict (PASS/FAIL) specifically for Part 2 changes, and the coverage completion line (`X/X routes fully tested`) covering the entire route inventory.
2. **Audit Metadata** — Environment, commit SHA, fixture IDs, baseline-vs-final DB row counts, test duration, total requests fired, confirmation no third-party packages were installed (`git diff package.json` should be empty — include that diff or its absence as proof).
3. **Route Inventory** — Full table of discovered endpoints with middleware chains.
4. **Master Test Matrix** (Markdown table, one row per test case — no omissions):

   | Route | Method | Tier | Test Case | Input Strategy | Expected | Actual | Status |
   | ----- | ------ | ---- | --------- | -------------- | -------- | ------ | ------ |

5. **Failure / Vulnerability Log** — One subsection per failure with: reproduction script path, request/response, stack trace, severity, remediation. Group by severity, highest first.
6. **State Consistency Findings** — Orphan rows detected, idempotency results, concurrency outcomes.
7. **Regression Verdict** — Explicit statement: "Part 2 changes introduced N regressions across M routes" with the affected routes listed. This section reports on the Part 2 subset specifically; it does not replace or limit the full-codebase findings in sections 3–6, which must cover every route regardless of relation to Part 2.
8. **Coverage Proof** — Paste the final Progress Ledger summary showing every route's four fields resolved (no `pending` values remaining).
9. **Appendix** — Teardown confirmation, list of test-created resources that could not be cleaned up (if any).

---

## Guardrails

- Never run destructive tests (DELETE, destructive PUT) against resources you did not create yourself.
- Never commit fixture data or test tokens to the repository.
- If a test would cause real-world side effects (e.g., sending an email, charging a card), use the project's mock/stub layer. If none exists, skip the test and log it as `"UNTESTED — requires mock"` rather than executing it — but this still requires the corresponding Progress Ledger field to be marked `blocked`, not left `pending`.
- If you discover a critical vulnerability mid-audit, pause, document it, and continue — do not attempt live exploitation beyond the proof-of-concept request.
- Do not install any npm/yarn/pnpm package at any point in this audit, for any reason. If a package is missing, log the gap and continue — do not add it.
- Do not end the session or produce the final report while any route in the Progress Ledger still has a `pending` field. Incomplete coverage is a failed audit, not a finished one.
