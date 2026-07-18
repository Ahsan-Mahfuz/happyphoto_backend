You are starting a fresh session but continuing prior work on a multivendor food delivery platform. This is a max-effort, extended-thinking run — use that budget deliberately: work through each phase in the explicit order given, verify your own coverage before producing any output, and do not shortcut or sample for brevity. If something is ambiguous, reason through the available evidence rather than guessing silently.

## PHASE 0 — Load Context

1. Read the existing implementation plan at: `c:\Users\thakursaad\projects\happyphoto\docs\implementation_plan.md`
2. Read the PROPERTY_HOST role definition at: `c:\Users\thakursaad\projects\happyphoto\docs\Property_host_role.md`
3. Read/index the backend project in this workspace (models, endpoints, auth implementation, tech stack)
4. List `c:\Users\thakursaad\projects\happyphoto\images` — organized into role subfolders (specifically `/images/customer`, `/images/property-host`, `/images/dasher`, `/images/merchant-dashboard`, `/images/admin-dashboard`). Confirm the actual folder names and count files in each.

Before continuing, internally confirm you can state: the backend's tech stack, what the old plan currently claims, what PROPERTY_HOST is per the role doc, and exact image counts per folder. Do not proceed until this is solid.

---

## CRITICAL CONTEXT ON THE OLD PLAN

The existing plan was generated WITHOUT visual access to Figma — the fetch failed and returned only the project title. This means:

- Backend/codebase-derived sections (tech stack, existing models, existing endpoints, auth implementation, what's already built) are likely accurate. Re-verify against the live codebase, but treat them as a reliable starting point.
- Figma-derived sections (design tokens, screen inventory, per-role screen breakdown, UI-implied business logic, anything describing what a specific screen contains) were GUESSED, not observed. Discard and fully re-derive these from the real screens now provided. The images are the single source of truth, overriding any conflicting assumption in the old draft.

---

## NEW GROUND TRUTH

1. **Real screens are available**, organized by role in `/images/<role>/`. Role is already known from the folder — your job per image is screen name/purpose, every UI element, every data field, and any text hinting at backend logic (status labels, button actions, validation/error states).

2. **Authentication screens are excluded** — auth is already fully implemented. Don't expect or invent auth screens. Confirm the existing auth implementation correctly supports all 5 roles and note any gap.

3. **Payment is Stripe Card only.** No wallets, no COD, no other gateway — unless an image shows explicit evidence otherwise, in which case flag it as a conflict rather than silently choosing one.

4. **Payouts use Stripe Connect only**, for MERCHANT and DRIVER. Default to Stripe Connect Express unless the codebase implies otherwise. Since one order can span multiple merchants plus one driver, use "separate charges and transfers": charge the customer once, hold funds on the platform account, then create individual Transfer objects to each merchant's and the driver's connected account on order completion, net of commission. Document onboarding, transfer trigger point, commission deduction, and refund handling for already-transferred funds.

5. **The order flow screen is missing.** Before inventing one, mine ALL other images (user order tracking, merchant incoming-orders, driver job screens, admin order views) for order-status text or UI hints. Use what you find. Only where nothing is found, default to: placed → confirmed → preparing → ready_for_pickup → out_for_delivery → delivered → completed, with cancelled/refunded as exceptions — adjusted to match any labels actually found.

6. **DRIVER, "Dasher", and "Chopper" are the same role.** Backend enum is DRIVER. "Dasher"/"Chopper" are display labels only — not separate roles, permissions, or enum values. No separate logic, models, or endpoints. Document this explicitly.

7. **For PROPERTY_HOST screens**, cross-check every image in `/images/property-host` against Property_host_role.md, line by line. Flag any mismatch — this is the most important role to get right.

---

## PHASE 1 — Systematic Image Review → Verification Checkpoint

Work through this in order, using your full reasoning budget:

a. Enumerate every file in every `/images/<role>/` folder. Record the exact count per folder.
b. View every image, one at a time, per role folder. For each: note screen name/purpose, UI elements, data fields, status/action text.
c. Cross-reference every property-host image against Property_host_role.md.
d. Across ALL role folders (not just driver/merchant/admin), search specifically for order-status text or hints, since the order flow screen is missing.
e. Before writing your output, self-verify: does the count of images you actually reviewed match the count from step (a) for every folder? Did every property-host image get checked against the doc? Did the order-status search cover every folder, not just the obvious ones?

Then output:

- Confirmation of what was loaded in Phase 0
- A table: image filename → role (from folder) → screen name/purpose, grouped by role, with reviewed-count vs. found-count per folder shown explicitly
- Confirmation of the DRIVER/Dasher/Chopper unification
- Confirmation of the Stripe Card + Stripe Connect (separate charges and transfers) scope
- Proposed order lifecycle states, noting whether each came from image evidence or the fallback default
- Any images that were ambiguous, unreadable, or conflicted with Property_host_role.md or the old plan — flagged explicitly

Stop here. Do not proceed to Phase 2 until I confirm.

---

## PHASE 2 — Full Plan Rewrite (only after my confirmation)

Update the existing implementation plan, applying every rule above throughout the entire document:

- Keep and re-verify backend/codebase-derived sections
- Fully re-derive and overwrite all Figma-derived sections using the real images
- Simplify payment/payout sections to Stripe Card + Stripe Connect — remove any generic "payment gateway" abstraction from the old draft
- Update database schema, API spec, per-role screens, and business logic accordingly
- Update the prioritized backlog (P0–P3) and sprint plan to reflect what's now confirmed vs. still assumed

Before finalizing, self-verify: every screen from the Phase 1 table maps to at least one feature or endpoint somewhere in the document; every one of the 14 original sections is present and updated, not just appended to; Socket.IO is referenced only for chat and driver location, nowhere else; the Stripe transfer/refund logic from rule 4 appears in the payment section, not just summarized.

At the top of the rewritten document, add a **"What Changed From v1"** section — a brief bullet summary of what was corrected, removed, or newly derived. This is for my review — keep it short.

Maintain the no-over-engineering principle throughout: correctness and clean edge-case handling over abstraction. REST for everything except chat and driver location updates (Socket.IO only for those two).

Output the final result as a single complete `.md` file.
