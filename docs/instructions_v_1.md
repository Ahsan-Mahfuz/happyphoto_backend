You are a senior full-stack architect. Your task is to perform an exhaustive analysis of a multivendor food delivery platform and produce a comprehensive implementation plan as a single Markdown file. Do not skip anything.

---

## CONTEXT & CONSTRAINTS

- Architecture: REST API for everything EXCEPT real-time chat and driver location updates (those use Socket.IO only)
- Philosophy: No over-engineering. If a simple solution works, use it. Avoid unnecessary abstraction layers, microservices split, or premature optimization. Focus on correctness, edge case handling, and smooth operation.
- The platform has 5 roles: USER, PROPERTY_HOST, DRIVER, MERCHANT, ADMIN
- PROPERTY_HOST is the most unique and defining role of this platform. Its full concept is described in the attached file: @docs\Property_host_role.md — read it first and treat it as the source of truth. Do not assume anything about this role; derive everything from that document.

---

## STEP 0 — READ PROPERTY_HOST ROLE DEFINITION FIRST

Read Property_host_role.md in full before doing anything else.
Summarize your understanding of the PROPERTY_HOST role at the top of the output plan so I can verify you understood it correctly. Everything downstream — schema design, API design, business logic, permissions — must reflect this role accurately.

---

## STEP 1 — ANALYZE THE FIGMA DESIGNS

Fetch and deeply analyze both Figma links:

1. https://www.figma.com/design/4RTwFj2j4rr4e8p2xoYPUb/Happypphoto-%7C%7C-Food-Delivery-App?node-id=0-1&p=f&t=PhBxJAo8IhgriKrb-0
2. https://www.figma.com/design/4RTwFj2j4rr4e8p2xoYPUb/Happypphoto-%7C%7C-Food-Delivery-App?node-id=764-27498&t=PhBxJAo8IhgriKrb-0

For each screen / component you find, extract and document:

- Screen name and which user role it belongs to
- All UI elements visible (buttons, inputs, lists, cards, modals, bottom sheets, etc.)
- Navigation flows and transitions implied by the layout
- Data fields shown (what data is being displayed or collected)
- Business logic implied by the UI (e.g., a "Place Order" button implies cart → order creation → payment → confirmation)
- Any design tokens: colors, typography, spacing, icon sets
- Mobile-first / responsive considerations

List EVERY screen, EVERY component, EVERY flow. Miss nothing.

---

## STEP 2 — ANALYZE THE EXISTING BACKEND PROJECT

Read and analyze the entire backend project. Examine:

- Project structure and architecture
- Tech stack: language, framework, ORM, database, auth strategy, caching, etc.
- All existing models/entities: fields, types, relationships, constraints
- All existing API endpoints: method, path, auth guards, request/response shape
- Authentication and authorization: JWT/session, role-based guards
- Business logic already implemented
- What is complete, what is partial, what is entirely missing
- Existing integrations: payment, notifications, maps/geolocation, etc.
- Config files, environment variables, deployment setup

---

## STEP 3 — MAP FIGMA → BACKEND

For every screen and flow from Step 1, map it against the backend:

- Which existing endpoints serve it?
- What is missing entirely?
- What exists but needs modification (wrong fields, missing validation, wrong shape)?
- What new endpoints are needed?
- What new models or schema changes are required?

---

## STEP 4 — PRODUCE THE IMPLEMENTATION PLAN

Write an exhaustive, production-grade implementation plan in Markdown. Structure it exactly as follows:

---

# [Project Name] — Full Implementation Plan

## 0. PROPERTY_HOST Role — Verified Understanding

Write a clear summary of what the PROPERTY_HOST role does, based solely on Property_host_role.md. This acts as a confirmation checkpoint before the rest of the plan is read.

## 1. Project Overview

- Platform description and what makes it unique (the PROPERTY_HOST concept)
- Confirmed tech stack from the codebase
- All 5 roles and their core responsibilities

## 2. Design System & UI Tokens

- Color palette (from Figma)
- Typography scale
- Spacing system
- Component decisions
- Icon set

## 3. Database Schema

For every model (existing and new):

- Table/collection name
- All fields with types, constraints, defaults, enums
- Relationships (FK, join tables, embedded docs)
- Indexes for performance
  Note: Flag any schema changes needed to correctly support the PROPERTY_HOST role.

## 4. Authentication & Authorization

- Auth flow for each of the 5 roles
- Token strategy (access + refresh)
- Role-based access control matrix per endpoint
- Social auth if shown in Figma

## 5. API Specification — REST

Group by domain. For EVERY endpoint (existing + new):

- Method + Path
- Auth: role(s) allowed
- Request schema (body / params / query)
- Response schema
- Business logic summary
- Edge cases and validation rules
- HTTP status codes

Domains: Auth, Users, PROPERTY_HOST, Merchants, Menu/Products, Orders, Payments, Delivery/Drivers, Reviews, Notifications, Admin.

## 6. Real-Time — Socket.IO (Restricted Scope)

Only two features use Socket.IO:

### 6.1 Chat

- Which roles can chat with whom
- Room/channel design
- Events: message sent, delivered, read
- Message persistence (stored in DB via REST, Socket.IO is just delivery)

### 6.2 Driver Location Updates

- Events: location broadcast, subscription, unsubscribe
- How the client polls last known location via REST; Socket.IO only for live updates
- Fallback if Socket.IO disconnects

Everything else in the platform is REST. Do not suggest Socket.IO for anything outside these two areas.

## 7. Feature Implementation — By Role

For EVERY screen identified in the Figma for each role:

- Screen name
- Required REST endpoints
- Request/response flow
- State and edge cases

### 7.1 USER

### 7.2 PROPERTY_HOST ← most detailed section; derive entirely from Property_host_role.md + Figma

### 7.3 DRIVER

### 7.4 MERCHANT

### 7.5 ADMIN

## 8. Core Business Logic

Document every significant process end-to-end, simply and clearly:

### 8.1 Order Lifecycle

- All states and transitions
- Who triggers each transition
- Side effects (notifications, payment, driver assignment)
- How PROPERTY_HOST affects or participates in order flow (if at all)

### 8.2 Payment Flow

- Initiation, processing, capture, refund
- Multivendor split (if applicable)
- Merchant and driver payouts

### 8.3 Driver Assignment & Delivery

- Assignment logic (keep it simple — no over-engineering)
- REST-based status updates; Socket.IO only for live location
- Proof of delivery

### 8.4 Multivendor Cart & Checkout

- Cart with items from multiple merchants
- Fee calculation: delivery, platform, tax
- Checkout flow

### 8.5 PROPERTY_HOST Business Logic

- Full end-to-end flow unique to this role
- How it interacts with other roles (USER, MERCHANT, DRIVER, ADMIN)
- Every state, transition, rule, and edge case

### 8.6 Notifications

- Every trigger event
- Channel: push / SMS / email / in-app
- Who receives what and when
- All delivered via REST calls to notification service; no Socket.IO

### 8.7 Reviews & Ratings

- Who reviews whom
- When reviews unlock (e.g., after delivery confirmed)
- Rating aggregation

## 9. File Uploads & Media

- Every upload point in the app (avatars, food photos, documents, proof of delivery, PROPERTY_HOST-specific uploads if any)
- Storage strategy
- Validation rules (size, type, dimensions)

## 10. Third-Party Integrations

- Payment gateway (from Figma/codebase)
- Maps & geolocation
- Push notifications
- SMS / email
- Any others

## 11. What Is Already Implemented

Per-feature status table:
| Feature | Status | Notes |
|---------|--------|-------|
| ... | ✅ Complete / ⚠️ Partial / ❌ Missing | ... |

## 12. What Needs to Be Built — Prioritized Backlog

- P0: Blockers
- P1: Core MVP features
- P2: Secondary features
- P3: Polish / nice-to-have

Each item:

- Feature name
- Affected roles
- Complexity: S / M / L / XL
- Dependencies

## 13. Recommended Build Order (Sprint Plan)

Sprint-by-sprint sequence based on dependencies and priorities. Keep it pragmatic — optimize for getting something working end-to-end early.

## 14. Non-Functional Requirements (Practical)

- Security checklist (auth, input validation, rate limiting, sensitive data)
- Error handling standards (error shapes, logging)
- Performance: only where it genuinely matters for this scale
- No premature optimization — flag only real bottlenecks

---

Output this as a single, complete `.md` file. Be exhaustive — this is the document developers will build from. Do not summarize, skip screens, or omit endpoints. Where Figma or codebase is ambiguous, note it and propose a concrete resolution.

---

My backend is built with nodejs, express, typescript, mongoose, mongo db.
