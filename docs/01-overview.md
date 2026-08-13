[← Back to index](./README.md)

# 01 — Overview

## The problem

Independent car workshops mostly run on phone calls and paper. A customer calls, someone writes the job on a pad, the car arrives, work happens, money changes hands, and nothing is recorded in a way anyone can query later. This creates familiar problems:

- **No visibility for the customer.** Once the car is dropped off, the owner has no idea what stage the work is at without calling and asking.
- **No queue for the workshop.** Jobs live in someone's head or on a whiteboard. Nothing tells you how many jobs are pending versus in progress.
- **Disputed handovers.** "I never authorised that" and "the car was collected on Tuesday" are hard to settle without a record.
- **No price transparency up front.** The customer often learns the cost at the end.
- **Emergency towing is chaotic.** A stranded driver has to describe their location over a phone call, often badly.

For a multi-location operator or a network of affiliated garages, these problems multiply. There is no single place to see how much work is flowing through which location.

## What AutoCare Elite does

It puts the whole cycle — discovery, quoting, booking, tracking, handover, payment — into one system with three participants:

```
        ┌────────────────────────────────────────────────────────┐
        │                    PLATFORM ADMIN                      │
        │  Onboards workshops · Oversees all platform activity   │
        └──────────────────────┬─────────────────────────────────┘
                               │ creates
                               ▼
        ┌────────────────────────────────────────────────────────┐
        │                      WORKSHOP                          │
        │  Publishes a service catalog with prices               │
        │  Receives bookings and towing requests                 │
        │  Moves jobs through the status pipeline                │
        │  Reads customer messages                               │
        └──────────────────────┬─────────────────────────────────┘
                               │ serves
                               ▼
        ┌────────────────────────────────────────────────────────┐
        │                       CLIENT                            │
        │  Picks a workshop · Browses its catalog with prices     │
        │  Books services · Requests emergency towing             │
        │  Tracks status · Pays · Confirms handover with OTP      │
        └────────────────────────────────────────────────────────┘
```

Each participant gets their own portal with their own dashboard, and the data is scoped so a workshop only ever sees its own jobs.

## Core domain concepts

Understanding these five concepts is enough to understand the whole system.

### Workshop

The tenant. Stored as an `admin_profiles` row with a 1:1 link to a user account carrying `is_staff = true`. Holds the business name, manager name, phone, city and address.

Everything else in the system hangs off a workshop: its service catalog, the bookings placed with it, the towing requests dispatched to it, and the contact messages sent to it. This is the isolation boundary — workshop A can never query workshop B's jobs.

### Service offering (catalog item)

One line in a workshop's published price list. Has a title, a description, a Font Awesome icon class, a starting price, and an active/inactive flag.

Two important properties:

- **Inactive items stay visible to the workshop but disappear from the client-facing catalog.** This is how you retire a service without deleting history.
- **The price is a "starts at" figure, not a fixed quote.** The system treats it as the amount to charge, but the naming acknowledges that real automotive work varies.

### Booking

A scheduled visit. Carries the customer's name, phone and email (captured at booking time, not read live from the account), the vehicle description, a preferred date and time, optional notes, a status, a payment method, a paid flag, and a handover OTP.

A booking references **one or more** catalog items through a join table, so a single visit can bundle an oil change, a wheel alignment and an AC service. The order total is the sum of those items' prices.

### Towing job

An emergency roadside request. Carries the contact name and phone, a vehicle description, a free-text pickup address, and optional GPS latitude/longitude captured from the browser. Also carries a status and a handover OTP.

Towing is deliberately lighter than a booking: no catalog items, no scheduling, no price. It is a "come get my car now" signal.

### Handover OTP

A 6-digit numeric code generated when a booking or towing job is created. Stored on the record alongside an `otp_verified` boolean.

**Intended design:** the code proves a physical handover happened. The customer holds the code; the mechanic or driver asks for it and enters it; entering it correctly marks the job complete. This creates an audit trail that the car actually changed hands.

**As currently built:** the code is shown to the customer, and only the customer can submit it. Workshops have no interface to enter it. See [07 — Feature Catalog](./07-features.md#otp-handover-verification) for what this means in practice and how to fix it.

## The job status pipeline

Bookings and towing jobs share one set of status strings:

```
┌─────────┐    ┌───────────┐    ┌────────────┐    ┌───────────┐
│ pending │───▶│ confirmed │───▶│ processing │───▶│ completed │
└────┬────┘    └─────┬─────┘    └─────┬──────┘    └───────────┘
     │               │                │
     └───────────────┴────────────────┴──────────▶ ┌───────────┐
                                                   │ cancelled │
                                                   └───────────┘
```

| Status | Meaning for a booking | Meaning for a towing job |
|---|---|---|
| `pending` | Received, workshop has not yet acknowledged | Received, no driver assigned |
| `confirmed` | Workshop has accepted the slot | *(not used — towing skips this)* |
| `processing` | Work is underway | Driver is en route |
| `completed` | Work finished, handover verified | Vehicle collected, handover verified |
| `cancelled` | Called off by client or workshop | Called off |

**Who can move a job:**

- **Workshops** set any status freely from a dropdown. There is no state machine enforcing order — any status can jump to any other.
- **Clients** can cancel (within a status window) and can mark a job complete by entering the OTP.

The client-facing UI relabels some statuses to be friendlier: towing `pending` reads "Looking for Driver" and `processing` reads "Driver En Route".

## Role capability matrix

| Capability | Client | Workshop | Platform Admin |
|---|---|---|---|
| Register self | ✅ | ❌ *(created by admin)* | ❌ *(seeded)* |
| Choose preferred workshop | ✅ | — | — |
| Browse a workshop's catalog | ✅ | ✅ *(own)* | ❌ |
| Create a service booking | ✅ | ❌ | ❌ |
| Create a towing request | ✅ | ❌ | ❌ |
| View own jobs | ✅ | ✅ *(own workshop's)* | ✅ *(all)* |
| Change a job's status | ❌ | ✅ | ❌ |
| Cancel a job | ✅ *(own)* | ✅ *(via status)* | ❌ |
| Complete a job via OTP | ✅ | ❌ | ❌ |
| Pay for a booking | ✅ | ❌ | ❌ |
| Mark a booking paid manually | ❌ | ✅ | ❌ |
| Manage a service catalog | ❌ | ✅ *(own)* | ❌ |
| Edit workshop profile | ❌ | ✅ *(own)* | ❌ |
| Send a contact message | ✅ | ❌ | ❌ |
| Read contact messages | ❌ | ✅ *(own)* | ❌ |
| Publish blog posts | ❌ | ✅ | ✅ |
| Onboard a new workshop | ❌ | ❌ | ✅ |
| Delete any record | ❌ | ✅ *(catalog only)* | ✅ *(bookings, towing, workshops)* |
| See platform-wide totals | ❌ | ❌ | ✅ |

## What has been built

A quick inventory. Full detail with working/partial/broken status is in [07 — Feature Catalog](./07-features.md).

**Authentication and accounts**
Self-service client signup, username/password login with bcrypt hashing, 7-day JWT sessions, role-based routing on both client and server, session hydration on page load.

**Client portal — 8 screens**
Dashboard with counts and recent activity · profile editor with workshop selection · service catalog browser · multi-service booking form with live total and GPS-free scheduling · booking detail with invoice line items, OTP display, payment and cancellation · service order list with status filter tabs · towing request form with browser geolocation capture · towing order list · towing detail with a Google Maps deep link.

**Workshop portal — 5 screens**
Dashboard with job counts and inline status controls · profile editor · full CRUD service catalog with an add/edit modal · service order queue with filter tabs and a detail edit modal · towing dispatch board with click-to-call and GPS map links · customer message inbox.

**Platform admin portal — 5 screens**
Dashboard with platform totals and recent activity feeds · workshop directory · workshop onboarding form that provisions both a user account and a profile · global booking registry with filters · global towing registry with filters and GPS display.

**Public marketing surface — 8 screens**
Landing page with hero and feature cards · about · services info · contact form · blog list with an inline authoring modal for staff · login · signup · password reset request.

**Cross-cutting**
Role-aware navigation · a shared status badge component that maps status strings to colour, icon and label · OTP entry modal · payment modal · Stripe PaymentIntent creation on the server · a seed script that provisions a complete demo environment (4 users, 2 workshops, 5 services, 2 blog posts, 1 booking, 1 towing job).

**Total surface:** 26 pages, 5 shared components, 5 API route modules, 9 database tables, roughly 50 endpoints.

## What is deliberately not built

Being explicit about the boundaries matters as much as listing features:

- **No mechanic/technician role.** Workshops are a single account. There is no way to assign a job to a specific person or track who did the work.
- **No driver role for towing.** Towing is dispatched to a workshop, not to a named driver with their own login and location feed.
- **No live tracking.** Despite UI copy that says "live" and "real-time", there is no polling, WebSocket or push. Data refreshes only on page load.
- **No notifications.** No email, no SMS, no in-app alerts. Password reset is a stub that sends nothing.
- **No inventory or parts.** Services have a price; there is no concept of parts consumed, stock, or supplier.
- **No invoicing documents.** Line items render on screen; nothing generates a PDF invoice or receipt.
- **No reviews or ratings.** Clients cannot rate a workshop.
- **No workshop discovery.** A client picks from a flat list of all workshops. There is no search, no distance sorting, no filtering by service type — despite GPS being captured for towing.
- **No scheduling intelligence.** The booking form accepts any date and time. There is no capacity model, no bay availability, no double-booking prevention.
- **No multi-user workshops.** One workshop equals one login. A service advisor and the owner would share credentials.
- **No audit log.** Status changes and paid-flag toggles leave no trace of who changed what, when.

---

**Next:** [02 — Architecture](./02-architecture.md) for the technical structure, or [03 — Flows](./03-flows.md) to trace a request end to end.
