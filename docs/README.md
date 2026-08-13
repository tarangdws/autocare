# AutoFusion — Documentation

A multi-tenant car service and roadside assistance platform. Vehicle owners choose a workshop, book services from that workshop's catalog, or raise emergency towing requests. Workshops manage their own catalog and job queue. A platform operator onboards workshops and oversees all activity.

---

## Where to start

| If you are… | Read this |
|---|---|
| New to the project, want the big picture | [01 — Overview](./01-overview.md) |
| A developer who needs to change code | [02 — Architecture](./02-architecture.md) |
| Tracing how a request moves end to end | [03 — Flows](./03-flows.md) |
| A vehicle owner using the app | [04 — Client Guide](./04-user-guide-client.md) |
| A workshop owner or service advisor | [05 — Workshop Guide](./05-user-guide-shop.md) |
| The platform operator | [06 — Platform Admin Guide](./06-user-guide-admin.md) |
| Asking "what exactly is built?" | [07 — Feature Catalog](./07-features.md) |
| Evaluating fit for a business or client | [08 — Use Cases & Market Fit](./08-use-cases.md) |

For installation, environment variables and PostgreSQL setup, see the [root README](../README.md).

---

## Document index

### [01 — Overview](./01-overview.md)
The problem being solved, the three-sided model, the core domain concepts (workshop, catalog, booking, towing job, handover OTP), and a role capability matrix.

### [02 — Architecture](./02-architecture.md)
Technical structure: the stack, request lifecycle, authentication model, state management, data model with relationships, and where to hook in when extending the system.

### [03 — Flows](./03-flows.md)
Step-by-step sequence walkthroughs: signup and login, workshop selection, service booking, payment, OTP handover, towing dispatch, contact messaging, and workshop onboarding. Each flow maps UI action → API call → database change.

### [04 — Client Guide](./04-user-guide-client.md)
Everything a vehicle owner can do, in the order they would do it.

### [05 — Workshop Guide](./05-user-guide-shop.md)
Everything a workshop operator can do: profile, catalog management, job queue, dispatch, inbox.

### [06 — Platform Admin Guide](./06-user-guide-admin.md)
Workshop onboarding, platform-wide oversight, and record management.

### [07 — Feature Catalog](./07-features.md)
Complete inventory of what has been built, each entry marked **Working**, **Partial**, or **Broken**, plus what is deliberately absent.

### [08 — Use Cases & Market Fit](./08-use-cases.md)
Who this serves best, detailed personas, concrete deployment scenarios, adjacent industries where the model transfers, and an honest assessment of what must be finished before real customers touch it.

---

## Quick orientation

**Three roles, one users table.** Role is derived from two boolean flags (`is_staff`, `is_superuser`) rather than a separate role column.

**A "workshop" is an `admin_profiles` row.** It has a 1:1 relationship with a staff user. This is the tenant boundary — every service, booking, towing request and message belongs to exactly one workshop.

**Clients are bound to one workshop at a time.** A `select_shops` row records the choice. All catalog reads and job creation route through it. Switching workshops changes where future jobs go; existing jobs stay with their original workshop.

**Every job carries a 6-digit OTP.** Generated at creation, intended as physical handover proof. Entering it correctly marks the job complete.

**Statuses are shared between bookings and towing:** `pending` → `confirmed` → `processing` → `completed`, with `cancelled` as a terminal state. Towing effectively skips `confirmed`.

---

## Current status

This is a **functional prototype**, not a production system. The core flows work end to end and the data model is sound, but several features are wired incorrectly between frontend and backend, and the payment and OTP mechanisms are not trustworthy in their current form.

Before deploying for real customers, read the **Known Issues** section of the [root README](../README.md#known-issues) and the **Production readiness** section of [08 — Use Cases](./08-use-cases.md#production-readiness).
