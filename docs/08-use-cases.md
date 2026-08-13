[← Back to index](./README.md)

# 08 — Use Cases & Market Fit

Who this project actually serves, what it would take to serve them, and where the same architecture transfers to adjacent problems.

---

## Contents

- [What the platform is fundamentally good at](#what-the-platform-is-fundamentally-good-at)
- [Primary personas](#primary-personas)
- [Deployment scenarios](#deployment-scenarios)
- [Who this is a poor fit for](#who-this-is-a-poor-fit-for)
- [Adjacent industries](#adjacent-industries)
- [Value as a codebase, not a product](#value-as-a-codebase-not-a-product)
- [Production readiness](#production-readiness)
- [Competitive positioning](#competitive-positioning)
- [Where to take it next](#where-to-take-it-next)

---

## What the platform is fundamentally good at

Strip away the automotive framing and the reusable core is this:

> **A multi-tenant appointment and dispatch system where each tenant publishes a priced service catalog, customers book against it, jobs move through a shared status pipeline, and completion is confirmed by a code exchanged at handover.**

Five properties define the fit:

1. **Tenant isolation is real.** Every query scopes by a shop ID derived from the auth token, not the request. A tenant genuinely cannot reach another tenant's data. This is the hardest part of a multi-tenant system to retrofit and it is already correct.

2. **Catalogs are per-tenant and self-managed.** Each workshop publishes its own services at its own prices. There is no central catalog to negotiate — a new tenant is productive as soon as they add their own items.

3. **Two job types share one pipeline.** Scheduled work (bookings) and on-demand work (towing) coexist with different data shapes but the same statuses and the same dashboards. That pattern generalises to almost any "appointments plus emergencies" business.

4. **Bundling is native.** A booking references many catalog items through a join table, so multi-item orders work without special-casing.

5. **Handover verification is designed in.** The OTP concept — a code that proves a physical exchange happened — is the right abstraction for any service where custody of something transfers. *(The implementation is inverted; see [07 — Feature Catalog](#). The concept is sound.)*

**What it is not:** a marketplace. There is no discovery, search, ranking, reviews, or commission model. Customers pick a workshop from a flat list. This makes it a good fit for **directed** relationships — a network you control, or a chain of your own branches — and a poor fit for open two-sided marketplaces where discovery *is* the product.

---

## Primary personas

### 1. The multi-branch workshop chain — strongest fit

**Who:** A garage business with 3–15 locations, currently running each branch on phone calls, WhatsApp and paper job cards, with no consolidated view of the operation.

**Their pain:**
- The head office cannot see how much work is flowing through which branch without asking
- Each branch prices differently and inconsistently
- Customers who used one branch have no record at another
- No way to compare branch throughput

**Why this platform fits:**
- Each branch is a tenant with its own catalog and job queue — matching how they already operate
- The platform admin role maps exactly onto the head office
- Global registries give consolidated oversight
- The absence of discovery does not matter: customers already know which branch they use

**What they need built:** the P0 and P1 fixes, real payments, and per-branch reporting. **Roughly 6–10 weeks** of focused work.

**Why they are the strongest fit:** they are a single buyer with a single decision-maker, the tenant model already matches their org chart, and they do not need the marketplace features that are missing.

### 2. The single independent workshop — fastest to value

**Who:** A one-location garage with 2–8 bays, ~15–40 jobs a week, currently on a paper diary or a whiteboard.

**Their pain:**
- Double-bookings and lost job cards
- Customers phoning repeatedly to ask "is it ready?"
- No price list customers can see before arriving
- Disputes about what was authorised

**Why this platform fits:** they use one workshop account and ignore the platform admin role entirely. They get a public price list, a digital job queue, a status pipeline customers can check, and a customer contact history.

**What they need built:** the P0/P1 fixes plus **capacity-aware scheduling** — the single most important missing feature for this persona, since accepting any date and time recreates the double-booking problem the diary already had. **Roughly 4–6 weeks.**

**Caveat:** the value is real but modest for a single shop. Off-the-shelf garage management software exists. This wins when they want their own branded customer-facing booking page rather than a vendor's.

### 3. The roadside assistance operator — best-differentiated fit

**Who:** A towing and recovery business, possibly with an insurance or fleet contract, dispatching 10–50 jobs a day.

**Their pain:**
- Locations described badly over the phone
- No record of which job went where or when
- Handover disputes about condition and collection time

**Why this platform fits:** the towing flow is genuinely useful — browser GPS capture, a Maps deep link, click-to-call, a status board, and a handover code. The lightweight data shape matches how emergencies actually work: name, phone, vehicle, where, now.

**What they need built:** more than the others, because the towing side is the least finished:
- Fix the status handler that erases customer data (**blocking**)
- Fix the GPS fallback that lies about success (**blocking**)
- A driver role with individual logins and location reporting
- ETA tracking
- Payment for towing (there is none today)
- A towing detail and edit view on the operator side

**Roughly 10–14 weeks.** But this is where the platform is *most differentiated* — GPS capture plus handover verification is a combination generic booking software does not offer.

### 4. The franchise or affiliate network operator — highest ceiling

**Who:** A brand licensing its name to independently owned garages — 20–100 locations — needing consistent customer experience without owning the shops.

**Their pain:**
- No standardised customer-facing experience across affiliates
- No visibility into affiliate volume
- Onboarding and offboarding affiliates is manual
- Brand risk from inconsistent service

**Why this platform fits:** the three-tier model maps precisely — brand as platform admin, affiliate as tenant, customer as client. Onboarding is a form. Isolation means affiliates cannot see each other's business.

**What they need built:** the most of any persona:
- All P0/P1 fixes
- **Discovery** — customers must find their nearest affiliate, which today they cannot
- Commission and billing (nothing exists)
- Per-affiliate reporting and SLA tracking
- Affiliate suspension (only deletion exists)
- Reviews and quality scoring
- Multi-user accounts per affiliate

**Roughly 5–8 months.** But this is the persona with the highest revenue ceiling and the one the architecture was clearly designed toward.

### 5. The fleet operator — adjacent but plausible

**Who:** A company running 20–200 vehicles — logistics, cab aggregator, rental, corporate pool — needing maintenance across multiple approved garages.

**Their pain:**
- No central maintenance history per vehicle
- No way to track which garage did what
- Downtime is invisible until a vehicle fails to show up

**Why it partly fits:** approved garages become tenants; the fleet manager books against them; the status pipeline tracks vehicles in the shop.

**Why it partly doesn't:** the data model is **person-centric, not vehicle-centric.** `vehicle_info` is a free-text string on each booking. There is no vehicle entity, no registration number, no service history per vehicle — which is precisely what a fleet operator needs most.

**What they need built:** a `vehicles` table with bookings referencing it, per-vehicle service history, service-interval reminders, cost reporting by vehicle, and driver-level accounts. **Roughly 3–5 months**, and it is a genuine data-model change rather than a feature addition.

---

## Deployment scenarios

### Scenario A — Single workshop, own-brand booking page

```
One workshop account · platform admin unused · customers book directly
Custom domain, workshop branding
```

**Effort:** 4–6 weeks · **Best for:** an independent garage that wants a booking page rather than a vendor portal · **Watch out for:** scheduling with no capacity model

### Scenario B — Regional chain, 5 branches

```
Head office = platform admin · each branch = tenant
Customers select their branch · consolidated oversight
```

**Effort:** 6–10 weeks · **Best for:** the strongest-fit persona · **Watch out for:** branch-level reporting must be built; the dashboard is currently non-functional

### Scenario C — Roadside assistance, dispatch-first

```
Towing is the primary flow · service bookings secondary
Driver app added on top
```

**Effort:** 10–14 weeks · **Best for:** the most differentiated use of the platform · **Watch out for:** towing is the least finished area; two blocking bugs must go first

### Scenario D — Franchise network, 30+ affiliates

```
Brand = platform admin · affiliates = tenants
Discovery, commissions and quality scoring all added
```

**Effort:** 5–8 months · **Best for:** the highest ceiling · **Watch out for:** discovery and billing are entirely absent — these are the core of the model

### Scenario E — Internal fleet maintenance

```
Fleet manager books against approved garages
Vehicle-centric data model added
```

**Effort:** 3–5 months · **Best for:** a captive-demand deployment with no marketing needed · **Watch out for:** requires a data-model change, not just features

---

## Who this is a poor fit for

Being clear about this saves wasted effort.

| Not a fit | Why |
|---|---|
| **Open two-sided marketplaces** | Discovery *is* the product. This has none — no search, no ranking, no reviews, no distance sorting. Adding it means building the hardest part from scratch. |
| **Businesses needing real-time tracking** | UI copy promises "live" but nothing polls or pushes. A customer-facing live-ETA product needs a different architecture. |
| **Anything requiring parts and inventory** | No parts, stock, suppliers or purchase orders. Automotive repair genuinely needs these; adding them is a major subsystem. |
| **Regulated or compliance-heavy work** | No audit log, no document storage, no signature capture, no immutable records. Anything requiring a defensible paper trail fails here. |
| **High-volume operations (500+ jobs/day)** | Dashboards fetch all rows and aggregate in JavaScript; there are no indexes on foreign keys; admin pages render every record. All fixable, but it is real work. |
| **Multi-country or multi-currency** | ₹ is hardcoded throughout, dates and phone formats assume India, no i18n layer. |
| **Businesses needing per-staff accountability** | One login per workshop. No mechanics, no assignment, no per-technician productivity. |
| **Subscription or membership models** | Payments are one-off per booking. No recurring billing, plans or entitlements. |

---

## Adjacent industries

The core pattern — *multi-tenant, per-tenant priced catalog, bookings plus emergencies, status pipeline, handover code* — transfers well. Roughly ordered by how little needs to change.

### Very close fit (mostly relabelling)

**Two-wheeler and commercial vehicle service** — Identical model. Change copy and catalog defaults. *Days of work.*

**Appliance and electronics repair** — Workshops become service centres; towing becomes pickup-and-drop. The handover OTP is arguably *more* valuable here, since the item leaves the customer's possession. *1–2 weeks.*

**Computer and mobile repair** — Same shape. Pickup requests replace towing. Custody verification matters. *1–2 weeks.*

**Home appliance servicing (AC, washing machine, geyser)** — Technician visits a location instead of the customer visiting a workshop. The GPS capture already built for towing becomes the *primary* location mechanism rather than the emergency one. *2–3 weeks.*

### Close fit (moderate changes)

**Plumbing, electrical and handyman services** — Emergency plus scheduled is exactly this model. Needs technician-level accounts and en-route status. *4–6 weeks.*

**Pest control and cleaning services** — Catalog of priced services, scheduled visits, per-visit completion confirmation. Needs recurring bookings. *4–6 weeks.*

**Medical equipment servicing** — Multi-tenant service providers, scheduled maintenance, handover verification. Needs compliance documentation. *6–8 weeks.*

**Agricultural equipment repair** — Field service with on-site visits; the towing flow becomes the mobile-mechanic dispatch. *4–6 weeks.*

### Plausible with real work

**Veterinary and pet grooming** — Bookings plus emergencies; handover verification for custody of an animal is meaningful. Needs a patient/pet entity — the same gap fleet management has. *2–3 months.*

**Salon and spa chains** — Multi-tenant priced catalogs and bookings fit, but this domain needs capacity-aware scheduling and per-stylist assignment, both absent. Also no emergency flow to justify half the platform. *3–4 months, and better-served by existing software.*

**Equipment rental with delivery** — Catalog and handover verification fit well; the towing flow becomes delivery dispatch. Needs availability windows and return tracking. *3–4 months.*

### The transferable insight

The **highest-leverage reuse is the "scheduled work plus emergency dispatch" duality.** Most booking software handles only appointments. Businesses that also handle urgent, location-based, unscheduled work — repair trades, field service, recovery, on-site maintenance — are underserved, and this codebase already models both in one system with shared dashboards.

The **second insight is the handover code.** Any business where physical custody of something transfers — a vehicle, a laptop, an appliance, an animal — benefits from a verifiable handover record. Once implemented correctly, that is a differentiator, not a checkbox.

---

## Value as a codebase, not a product

Beyond deployment, the repository has value in three other ways.

### As a learning reference

It demonstrates, in readable code with no framework magic:

- Multi-tenant data isolation done correctly — scope from the token, never the request
- JWT auth with role flags in the payload, and its trade-off (role changes need a re-login)
- Raw parameterised SQL with joins and `json_agg` aggregation instead of an ORM
- React Context for auth without a state-management library
- Role-based routing on both client and server
- Payment intent creation and the shape of a payment flow

Because there is no ORM and no abstraction layer, **every SQL query is visible at its call site.** For someone learning how a full-stack app actually talks to a database, that is more instructive than a well-abstracted codebase.

### As a teaching case study in what goes wrong

Unusually valuable, because the bugs are *typical* rather than exotic:

- **Contract drift** — 12 features broken purely because a frontend key or path stopped matching the backend. A textbook argument for typed clients, shared schemas, or contract tests.
- **Partial-update destruction** — the towing handler that nulls four columns, sitting next to a service handler that does it correctly. A perfect before/after.
- **Authorisation vs authentication** — the IDOR issues show exactly how "the user is logged in" gets mistaken for "the user owns this record".
- **Trusting the client** — payment verification that never verifies illustrates why server-side confirmation is non-negotiable.
- **Failing silently vs loudly** — the GPS fallback that reports success on failure is a memorable lesson in why silent fallbacks are worse than errors.
- **Snapshot vs live data** — customer details are snapshotted (right) while totals are recomputed (wrong), in the same table. A clean illustration of when to denormalise.

### As a starter template

For anyone building a multi-tenant booking or dispatch product, the scaffolding is worth weeks:

- Working auth with three roles, both tiers of enforcement
- A tenant isolation pattern that is correct and consistent
- 9-table schema covering users, tenants, catalogs, orders, line items and messages
- ~50 endpoints across five routers with a consistent error contract
- 26 pages covering three portals plus a marketing surface
- A seed script producing a complete demo environment in one command
- Tailwind visual conventions established across all screens

**Fork it, apply the P0 fixes, relabel the domain, and you have a working multi-tenant service-booking product** — considerably faster than starting from scratch, provided you read [07 — Feature Catalog](./07-features.md) first so the known bugs do not become inherited ones.

---

## Production readiness

### Honest assessment

**This is a functional prototype.** The architecture is sound, the data model is mostly right, the flows work end to end, and the tenant isolation is real. It is a credible foundation.

**It is not deployable to paying customers as-is.** Three categories of blocker:

| Category | Blockers |
|---|---|
| **Actively destructive** | Towing status changes erase customer data · provider delete removes the wrong account · catalog delete rewrites booking history |
| **Security** | IDOR on all client detail endpoints · payment forgeable in one request · cross-tenant catalog writes · demo credentials shipped · hardcoded JWT fallback |
| **Trust-breaking** | Payment is simulated · OTP is not a real handover proof · GPS lies about success |

### Readiness by area

| Area | State | Notes |
|---|---|---|
| Data model | 🟢 Good | Sound design; needs `total_cost`, a vehicle entity, and FK indexes |
| Auth & roles | 🟢 Good | Correct pattern; needs 401 handling and a real secret |
| Tenant isolation | 🟡 Mostly | Correct in `/api/shop/*`; two catalog queries miss the scope |
| Client portal | 🟡 Mostly | All flows work; button gating and guest access need fixing |
| Workshop portal | 🔴 Blocked | Towing handler destroys data; inbox two-thirds broken |
| Admin portal | 🔴 Blocked | Onboarding 404s; delete destroys wrong records; dashboard non-functional |
| Payments | 🔴 Not real | Server-side intents exist; client is a simulation; verification verifies nothing |
| OTP handover | 🔴 Inverted | Mechanism exists but the wrong party controls it |
| Notifications | ⚫ Absent | No email or SMS anywhere; password reset is a stub |
| Reporting | ⚫ Absent | Dashboard broken; revenue not computable |
| Mobile | 🔴 Blocked | No navigation below `lg` |
| Testing | ⚫ Absent | No tests in either package |
| Ops | ⚫ Absent | No migrations, CI, structured logging, or monitoring |

### Roadmap to production

**Phase 1 — Stop the bleeding · 1 week**
Fix the towing status handler, provider delete, and catalog soft-delete. Add ownership checks to every client detail endpoint. Scope catalog writes by workshop. Remove demo credentials and the JWT fallback. Restrict CORS.
*Outcome: safe to demo with real data.*

**Phase 2 — Make it work · 1–2 weeks**
All nine P1 one-line contract fixes. Remove the GPS fallback. Gate the verify and pay buttons by status. Add a 401 response interceptor.
*Outcome: every screen does what it appears to do.*

**Phase 3 — Make it trustworthy · 3–4 weeks**
Real Stripe Elements plus webhook. Move OTP verification to the workshop side with expiry and rate limiting. Add `total_cost` and per-item price snapshots. Wrap multi-step writes in transactions. Add FK indexes.
*Outcome: money and handovers can be relied on.*

**Phase 4 — Make it usable · 3–4 weeks**
Mobile navigation. Pagination and search. Real password reset with email. Booking confirmation notifications. Capacity-aware scheduling. Fix the platform dashboard.
*Outcome: usable daily by non-technical staff.*

**Phase 5 — Make it maintainable · 2–3 weeks**
Migration system. Test suite covering the auth and booking paths. Request validation. Structured logging. Extract the duplicated components. Choose Prisma or raw SQL and delete the other.
*Outcome: safe for a team to extend.*

**Total: 10–14 weeks** for one experienced full-stack developer to reach a defensible production release for the single-workshop or chain scenarios. Franchise or fleet deployments add months on top for discovery, billing, or the vehicle-centric model.

---

## Competitive positioning

### Against off-the-shelf garage management software

**Where this wins:** you own the code and the data; the customer-facing surface is yours to brand; per-tenant catalogs with no central negotiation; towing and emergency dispatch built in, which most garage software lacks; no per-seat licensing.

**Where it loses:** no inventory or parts; no accounting integration; no statutory reporting; no mobile app; no support contract; needs 10–14 weeks of work before it is comparable.

**Verdict:** choose this when the customer-facing booking experience is the differentiator and you want to own it. Buy off-the-shelf when back-office depth — parts, accounting, compliance — matters more.

### Against generic booking platforms (Calendly-style, salon software)

**Where this wins:** genuine multi-tenancy with isolation; two job types in one pipeline; handover verification; a domain-shaped data model rather than generic "appointments".

**Where it loses:** no capacity-aware scheduling, which generic tools do far better; no calendar sync; no reminders; no payment maturity.

**Verdict:** this is a service-operations system with booking in it, not a scheduling tool. Do not position it against calendar products.

### Against building from scratch

**Where this wins:** working three-role auth; a correct tenant isolation pattern; 9 tables and ~50 endpoints; 26 pages across three portals; a one-command demo environment. Realistically **6–10 weeks saved**.

**Where it loses:** you inherit 12 broken contracts and several security holes, and you must read the code carefully enough to understand them — which costs 1–2 weeks. The absence of tests means you refactor without a safety net.

**Verdict:** worth forking if the domain matches and you read [07 — Feature Catalog](./07-features.md) before writing any code. Not worth it if your model diverges substantially — for example if you need marketplace discovery, since that is the biggest missing piece.

---

## Where to take it next

Four directions, by ambition.

### 1. Finish it as a product for one strong persona
**Pick the multi-branch chain.** Single buyer, tenant model already matches their org chart, no discovery needed. 6–10 weeks to a sellable product. **Lowest risk, fastest revenue.**

### 2. Pivot toward roadside assistance
The towing flow is the most differentiated thing here. Add a driver app with live location, ETAs, and payment. 10–14 weeks. **Highest differentiation** — the market for GPS-based dispatch with handover verification is less crowded than garage booking.

### 3. Generalise into a field-service platform
Abstract "workshop" to "service provider" and "vehicle" to "asset". The scheduled-plus-emergency duality is the reusable core, and it serves appliance repair, plumbing, IT support and equipment maintenance equally. 3–4 months. **Largest addressable market, most execution risk.**

### 4. Keep it as a reference implementation
Fix the P0 items so nobody copies a security hole, then use it as a teaching codebase and starter template. The combination of a sound architecture with textbook, well-documented bugs is genuinely rare and pedagogically valuable. **Lowest effort, no revenue, real value.**

### Two features that unlock the most, whichever path you choose

**Capacity-aware scheduling.** Accepting any date and time is the single biggest gap for every persona. Bay counts, working hours, and slot availability turn a request form into a real booking system.

**A vehicle entity.** `vehicle_info` as free text blocks service history, maintenance reminders, per-vehicle cost tracking and fleet use — four valuable features gated behind one table.

---

[← Back to index](./README.md) · [07 — Feature Catalog](./07-features.md) · [Root README](../README.md)
