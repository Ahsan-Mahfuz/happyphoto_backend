# Codebase Audit & Remediation Plan

**Project:** Fridge Fillers (multi-role food/grocery delivery backend)
**Stack:** Node.js · Express 5 · TypeScript · Mongoose/MongoDB · Socket.io · Stripe · Nodemailer
**Audited:** 2026-07-14
**Branch:** `developement`

---

## 0. How to read this document

Findings are grouped by severity. Each item has: **what**, **where**, **why it matters**, and **fix**.

| Severity    | Meaning                                                         |
| ----------- | --------------------------------------------------------------- |
| 🔴 Critical | Security hole or money-losing bug. Fix before any deployment.   |
| 🟠 High     | Correctness bug, data loss, or race condition under normal use. |
| 🟡 Medium   | Reliability / maintainability problem that will bite later.     |
| 🔵 Low      | Cleanup, consistency, hygiene.                                  |

Status legend for the execution phase: `[ ]` todo · `[x]` done · `[!]` needs your decision.

---

## 1. Baseline health (already verified)

- ✅ `tsc --noEmit` (typecheck) **passes** with zero errors.
- ⚠️ `eslint .` reports **33 errors, 8 warnings** — but **all** are in stray root-level scripts (`audit.js`, `generate_*.js`), not real source. Source code is lint-clean except one unused-var warning.
- ✅ Dependencies install; module structure is consistent (each domain has model/interface/controller/service/routes).

The architecture is sound. The problems are in **secrets hygiene, money-flow logic, transactional integrity, and a pile of AI-generated scaffolding junk** left in the repo.

---

## 2. 🔴 Critical

### 2.1 Real secrets committed to git in `.env.example`

- **Where:** `.env.example` (tracked in git), also live values in `.env` (correctly gitignored).
- **What:** `.env.example` contains a **real-format Stripe secret key** (`sk_test_51L0k3p…`), real JWT signing secrets, and a Stripe webhook secret — not placeholders.
- **Why:** Anyone with repo access (or if this is ever pushed public) can sign valid JWTs for **any user/role including ADMIN**, and call Stripe with your key. This is the single most dangerous issue.
- **Fix:**
  1. Replace every value in `.env.example` with obvious placeholders (`JWT_SECRET=replace-me`, `STRIPE_SECRET_KEY=sk_test_xxx`, etc.).
  2. **Rotate the leaked secrets** — you must regenerate the Stripe key (Stripe dashboard) and change `JWT_SECRET`/`JWT_REFRESH_SECRET`. _(This is a manual action only you can do — I cannot rotate them for you.)_
  3. Consider `git filter-repo`/BFG to purge them from history if the repo was ever shared.

### 2.2 Double-payout: earnings paid twice

- **Where:** `order.service.ts` `deliver()` → `PaymentService.processOrderPayouts()` **and** `payment.service.ts` `requestWithdrawal()` / `calculateTotalEarnings()`.
- **What:** On delivery, `processOrderPayouts` **auto-transfers** merchant/driver earnings to their Stripe Connect account. Separately, `requestWithdrawal` computes "available balance" from the **same** delivered-order earnings and lets them withdraw **again**. Withdrawals don't subtract what was already auto-transferred.
- **Why:** A merchant/driver can be paid their earnings on delivery, then withdraw the same amount — direct financial loss.
- **Fix (needs your product decision `[!]`):** Pick **one** payout model:
  - **A — auto-transfer only:** remove the manual withdrawal balance logic (or make it report Stripe balance only).
  - **B — manual withdrawal only:** remove `processOrderPayouts` from `deliver()`; accrue a ledger balance and pay out only on approved withdrawal.
  - Either way, introduce a **Payout/ledger record per transfer** so "available = earned − (transferred + pending withdrawals)" is provable.

### 2.3 JWT effectively never expires

- **Where:** `.env` / `.env.example`: `JWT_EXPIRES_IN=365d`, `JWT_REFRESH_EXPIRES_IN=365d`.
- **What:** Access tokens live a year; there is no revocation/blocklist. A leaked token is valid for 12 months.
- **Fix:** Access token ~15m–1h, refresh ~7–30d, and add a refresh endpoint (there currently is none — access token is just issued long-lived to compensate). At minimum shorten access-token lifetime.

### 2.4 Permissive/placeholder CORS

- **Where:** `src/util/corsOptions.ts`.
- **What:** `allowedOrigins = ["https://www.example.com"]` plus hardcoded `http://10.10.20.*` and `http://3.76.70*` prefixes. `startsWith("http://3.76.70")` also matches `3.76.700`, `3.76.70.evil.com`, etc.
- **Fix:** Drive allowed origins from env config; match full origins, not loose prefixes.

---

## 3. 🟠 High (correctness / data integrity)

### 3.1 Order placement is not atomic (stock corruption + TOCTOU)

- **Where:** `order.service.ts` `placeOrder()`.
- **What:** Stock is validated in one loop, then decremented in a later loop with individual `findByIdAndUpdate($inc)`. No transaction. Two concurrent orders can both pass validation and oversell. If order creation throws midway, stock already decremented for earlier items is **not rolled back**.
- **Fix:** Wrap the read-validate-decrement-create sequence in a Mongoose **session/transaction**, and make the decrement conditional (`updateOne({_id, quantity: {$gte: qty}}, {$inc:{quantity:-qty}})`) so oversell is impossible.

### 3.2 Webhook has no idempotency

- **Where:** `payment.webhook.ts`.
- **What:** Stripe retries webhooks; the same event can be processed multiple times. No `event.id` dedupe.
- **Fix:** Persist processed `event.id`s (a small collection with a unique index) and no-op on repeats. Also record webhook receipt before mutating.

### 3.3 `deliver()` proof-of-delivery not required / not validated

- **Where:** `order.service.ts` `deliver()`.
- **What:** `files?.proof_of_delivery` is optional; a driver can mark delivered with no proof. Payouts then fire.
- **Fix (`[!]` product call):** Decide whether proof is mandatory; if so, throw when missing.

### 3.4 `declineDelivery` is a no-op

- **Where:** `order.controller.ts` `declineDelivery` (returns success without touching any service).
- **What:** Endpoint pretends to work but does nothing — no record that a driver declined.
- **Fix:** Either implement (track declines / cooldown) or remove the route to avoid a misleading API.

### 3.5 Refund amount trust & partial-refund math

- **Where:** `payment.service.ts` `refund()`.
- **What:** `payload.amount` (dollars) is trusted from the admin request; no check it's ≤ original payment amount. `partially_refunded` vs `refunded` is inferred from cents comparison but cumulative partial refunds aren't tracked.
- **Fix:** Validate `amount` bounds; track cumulative refunded total on the Payment doc.

### 3.6 `submitDriverApplication` notifies a string `"admin"`

- **Where:** `user.service.ts` line ~448–454.
- **What:** `postNotification(..., "admin")` passes the literal string `"admin"` as `toId`. `postNotification` treats any truthy `toId` as a user id → it will try to create a `Notification` with `toId: "admin"` (invalid ObjectId → cast error swallowed) instead of an `AdminNotification`. The comment even admits this is wrong.
- **Fix:** Pass `null` to route it to `AdminNotification`, matching the intent.

### 3.7 `getNearbyStores` count vs. result field mismatch

- **Where:** `store.service.ts`.
- **What:** The `$nearSphere` result query applies `searchTerm` via QueryBuilder over `["storeName","storeDescription"]`, and the separate count uses the same. Reasonable, **but** the result query never calls `.sort()` (nearSphere already sorts by distance) while pagination meta assumes stable ordering — acceptable, just document it. Also `filterFields` are passed raw into the Mongo filter (see 4.4 injection note).

---

## 4. 🟡 Medium (reliability / security hardening)

### 4.1 `strictNullChecks: false`

- **Where:** `tsconfig.json`.
- **What:** Disables the single most valuable null-safety check; explains the heavy `any`/`as any` usage and hides real "possibly undefined" bugs.
- **Fix:** Turn on (`strict: true` already set, but `strictNullChecks:false` overrides it). Expect to fix a batch of resulting errors — do it incrementally.

### 4.2 Config validation is incomplete

- **Where:** `config/index.ts` `validateConfig`.
- **What:** Only checks `jwt.secret` and `database_url`. Missing Stripe keys, SMTP, refresh secret cause silent runtime failures later.
- **Fix:** Validate all required-at-boot env vars; fail fast with a clear message.

### 4.3 Rate limiting only on `/auth/login`

- **Where:** `auth.routes.ts` (limiter on login only), `limiter.ts`.
- **What:** `register`, `forgot-password`, `activation-code-resend`, `reset-password` have **no** rate limit → OTP brute-force and email-bombing. OTP is a 6-digit code with generous expiry; unlimited attempts on `activate-account`/`forget-pass-otp-verify` is brute-forceable.
- **Fix:** Apply limiter (tighter window) to all OTP/email-sending and OTP-verifying routes; consider per-account attempt counters.

### 4.4 Unsanitized query object passed to Mongo filters

- **Where:** `queryBuilder.ts` `filter()`, `store.service.ts` `countFilter`.
- **What:** Arbitrary `req.query` keys are spread directly into `.find()`. An attacker can inject operator objects (e.g. `?role[$ne]=USER`) to bypass intended filters (NoSQL injection).
- **Fix:** Whitelist allowed filter fields per module, or strip keys containing `$`/`.`. Add `express-mongo-sanitize`-style guarding.

### 4.5 `auth` middleware token parsing is fragile

- **Where:** `middleware/auth.ts`.
- **What:** `startsWith("Bearer")` matches `BearerXYZ`; `split(" ")[1].trim()` throws if header is exactly `"Bearer"`. The `isAccessible` optional-auth branch (`if (!tokenWithBearer && !isAccessible) return next()`) is confusing and unused across routes.
- **Fix:** Use `startsWith("Bearer ")`, guard the split, and either use or remove the optional-auth path.

### 4.6 Cron scheduled inside a service module

- **Where:** `auth.service.ts` schedules `cron.schedule(...)` at import time.
- **What:** Side effect on import; runs in every process (including any future worker), hard to test/disable.
- **Fix:** Move cron registration to a dedicated bootstrap invoked from `server.ts`.

### 4.7 `express.static("uploads")` serves user uploads unauthenticated

- **Where:** `app.ts`.
- **What:** Uploaded ID cards, driving licenses, trade licenses, proof-of-delivery are served at `/uploads/**` with **no auth** — PII/KYC documents are publicly guessable.
- **Fix:** Gate sensitive document access behind auth, or move KYC docs off the public static path.

### 4.8 Error handler leaks internal messages

- **Where:** `globalErrorHandler.ts`.
- **What:** For generic `Error`/`TypeError`, the raw `error.message` is returned to the client as `message`. Combined with `TypeError → 400`, internal details leak.
- **Fix:** Return generic messages for unexpected errors in production; keep details in logs only.

### 4.9 `deleteMyAccount` doesn't clean up related data

- **Where:** `user.service.ts`.
- **What:** Deletes `Auth` + `User` but leaves orders, carts, payments, products, reviews, notifications orphaned.
- **Fix:** Define a deletion strategy (soft-delete or cascade the owned collections).

---

## 5. 🔵 Low (cleanup / consistency)

### 5.1 Stray AI-generated scripts tracked in repo

- **Files:** `audit.js`, `generate_ledger.js`, `generate_manifest.js`, `generate_report.js`, `scratch_sync_indexes.ts`, `route_map.json` — these produce **all 33 eslint errors** and are not part of the app.
- **Fix:** Delete them (or move to an untracked `scratch/` and gitignore). This alone makes `eslint .` clean.

### 5.2 Commented-out dead code

- **Where:** `app.ts` (lines 10–16 duplicate `require` block), `user.service.ts` (line 3), scattered elsewhere.
- **Fix:** Remove.

### 5.3 Inconsistent `http-status` import style

- **Where:** 23 files use `require("http-status").default`, 15 use `.status`. **Both work** (verified), so this is cosmetic, not a bug.
- **Fix:** Standardize on one (prefer a single typed `import status from "http-status"`).

### 5.4 Single unused-var warning

- **Where:** `globalErrorHandler.ts:53` — `next` param unused. Rename to `_next` to satisfy the linter.

### 5.5 `postNotification` / `unlinkFile` use `console.*` instead of the logger

- **Where:** `util/postNotification.ts`, `util/unlinkFile.ts`.
- **Fix:** Use the existing `winston` logger for consistency.

### 5.6 Pervasive `any`

- **Where:** almost every service (`userData: any`, `payload: Record<string, any>`).
- **Fix:** Introduce real payload/DTO types (pairs well with 4.1). Large, incremental.

### 5.7 Project naming mismatch

- **Where:** `package.json` name "Fridge Fillers" vs repo `happyphoto` vs README. Decide the canonical product name.

---

## 6. Test coverage

- Only `product.test.ts` exists; no runner/script wired (`package.json` has no `test` script) and no CI. Critical money paths (orders, payments, payouts, webhooks) are untested.
- **Fix:** Add a test script + framework (Jest/Vitest) and cover at least: order placement/stock, payout math, webhook idempotency, auth/role guards.

---

## 7. Execution order (recommended)

**Phase 1 — Safe, high-value, no behavior risk (I can do now):**

1. `[ ]` Scrub `.env.example` to placeholders (5.1's sibling; **rotation is on you**).
2. `[ ]` Delete stray root scripts → eslint clean (5.1).
3. `[ ]` Remove dead/commented code (5.2), fix unused-var (5.4).
4. `[ ]` Fix `submitDriverApplication` admin notification bug (3.6).
5. `[ ]` Tighten CORS to config-driven, exact-origin (2.4).
6. `[ ]` Complete `validateConfig` (4.2).
7. `[ ]` Apply rate limiter to OTP/email routes (4.3).
8. `[ ]` Harden `auth` middleware token parsing (4.5).
9. `[ ]` Route uploads logging + logger consistency (5.5).

**Phase 2 — Correctness, needs care (I can do, will verify build):** 10. `[ ]` Atomic conditional stock decrement + transaction in `placeOrder` (3.1). 11. `[ ]` Webhook idempotency (3.2). 12. `[ ]` Query-filter whitelisting / NoSQL-injection guard (4.4). 13. `[ ]` Gate sensitive `/uploads` documents (4.7). 14. `[ ]` Generic error messages in prod (4.8).

**Phase 3 — Needs your decision `[!]` before I touch money/product logic:** 15. `[!]` Payout model — resolve double-payout (2.2). 16. `[!]` JWT lifetimes + refresh flow (2.3). 17. `[!]` Proof-of-delivery mandatory? (3.3) 18. `[!]` `declineDelivery` implement vs remove (3.4). 19. `[!]` Account-deletion cascade strategy (4.9). 20. `[!]` `strictNullChecks: true` migration (4.1) — larger refactor.

**Phase 4 — Longer term:** 21. `[ ]` Tests + CI (§6). 22. `[ ]` Kill `any` with real DTOs (5.6).

---

## 7a. What has been applied (this pass)

**Phase 1 + safe Phase 2 — DONE and verified (`tsc` clean, `eslint` 0 errors):**

- `[x]` Scrubbed `.env.example` to placeholders (2.1). **You must still rotate the real secrets — see below.**
- `[x]` Deleted stray scripts `audit.js`, `generate_ledger.js`, `generate_manifest.js`, `generate_report.js`, `scratch_sync_indexes.ts`, `route_map.json` → eslint went 33 errors → 0 (5.1).
- `[x]` Removed dead/commented code in `app.ts` and `user.service.ts` (5.2); fixed unused-var warning in `globalErrorHandler.ts` (5.4).
- `[x]` Fixed `submitDriverApplication` admin notification bug — now routes to `AdminNotification` (3.6).
- `[x]` CORS is now config-driven (`ALLOWED_ORIGINS` env) with exact-origin matching (2.4).
- `[x]` `validateConfig` now checks all boot-critical env vars and fails fast (4.2).
- `[x]` Rate limiter applied to all auth/OTP/email routes (4.3).
- `[x]` Hardened `auth` middleware token parsing (`"Bearer "` + empty-token guard) (4.5).
- `[x]` `postNotification` / `unlinkFile` now use the winston logger, not `console` (5.5).
- `[x]` NoSQL-injection guard added to `QueryBuilder.filter()` — drops `$`/`.` keys and object values (4.4).
- `[x]` Generic error messages returned for unrecognized errors in production (4.8).

**Phase 3 — DONE per your decisions (`tsc` + `eslint` clean):**

- `[x]` 2.2 Double-payout → chose **auto-transfer only**. Removed the manual-withdrawal feature: `requestWithdrawal`, `getMyPayouts`, `calculateTotalEarnings`, their controllers and the `/payment/request-withdrawal` + `/payment/my-payouts` routes. Auto-transfer on delivery (`processOrderPayouts`) is retained; `/my-earnings` and `/my-transactions` remain as read-only reports. (The now-unused `Payout` model file is left in place, harmless — delete if you want.)
- `[x]` 3.4 `declineDelivery` → **removed** the no-op route and controller.
- `[x]` Follow-on from the payout decision: removed the now-orphaned admin `approve-payout` / `reject-payout` endpoints (nothing creates payouts under auto-transfer), and fixed `getAllPayments` which was mis-wired to the (now always-empty) `Payout` collection — it now queries the real `Payment` model.
- `[!]` 2.3 JWT lifetimes → **left as-is** per your choice (still 365d — revisit later).
- `[!]` 3.3 Proof-of-delivery → **left optional** per your choice.

**Deliberately NOT auto-applied (carry infra/behavior risk):**

- `[!]` 2.2 double-payout, 2.3 JWT lifetimes, 3.3 proof-of-delivery, 3.4 declineDelivery, 4.9 account-deletion cascade, 4.1 strictNullChecks — Phase 3, listed above.
- `[!]` 3.1 atomic stock — needs a MongoDB transaction (replica set) and testable env; rewriting the order/money flow blind is risky. Flagged, not changed.
- `[!]` 3.2 webhook idempotency — needs a new collection/model; recommended next.
- `[!]` 4.7 gating `/uploads` — would change existing image URLs the frontend depends on; needs coordination.
- Note: `socketCors` is still `origin: "*"` — tighten if the socket client origins are known.

**Action required from you (I cannot do these):**

1. **Rotate secrets** that were in `.env.example`: regenerate the Stripe key in the Stripe dashboard, and set new `JWT_SECRET` / `JWT_REFRESH_SECRET` in your real `.env`. Also add `ALLOWED_ORIGINS=https://your-frontend-origin` to `.env`.
2. Decide the Phase 3 `[!]` questions so I can implement them safely.

---

## 8. Summary

The app compiles and is architecturally coherent — the danger is not "it's broken", it's **leaked secrets, a double-payout money bug, and non-atomic order/stock handling**. Fixing §2 and §3.1 is the difference between a demo and something you can safely run with real money. Everything in Phase 1 is safe to apply immediately; Phase 3 items change money/product behavior and need your sign-off first.
