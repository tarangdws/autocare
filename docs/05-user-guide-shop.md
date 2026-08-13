[← Back to index](./README.md)

# 05 — Workshop Guide

For workshop owners, managers and service advisors.

**Demo logins:** `autocare_main` / `shoppass` (AutoFusion Main Hub — 4 services) · `elite_motors` / `shoppass` (Elite Motors & Towing — 1 service)

---

## Contents

- [How your account works](#how-your-account-works)
- [Your dashboard](#your-dashboard)
- [Setting up your workshop profile](#setting-up-your-workshop-profile)
- [Managing your service catalog](#managing-your-service-catalog)
- [Processing service bookings](#processing-service-bookings)
- [Dispatching towing requests](#dispatching-towing-requests)
- [Your message inbox](#your-message-inbox)
- [Publishing articles](#publishing-articles)
- [The OTP and your role in it](#the-otp-and-your-role-in-it)
- [Payments and the paid flag](#payments-and-the-paid-flag)
- [Critical warnings](#critical-warnings)
- [Suggested daily routine](#suggested-daily-routine)

---

## How your account works

Your account is created by the platform administrator, not by self-signup. It comes with two linked things:

1. **A login** with staff privileges
2. **A workshop profile** — the business record customers see: name, manager, phone, city, address

**One login equals one workshop.** There is no way to add a second user to your workshop, so a service advisor and the owner share the same credentials. There is also no per-mechanic assignment — jobs belong to the workshop, not to a named technician.

### What you can see

You only ever see **your own** workshop's data. Bookings, towing requests, catalog items and messages are all filtered to your workshop on the server, so another workshop's jobs are not reachable from your account.

### How customers find you

Customers select a preferred workshop on their profile page from a flat list of everyone on the platform. That selection determines whose catalog they browse and whose queue their jobs land in.

**There is no discovery mechanism** — no search, no distance ranking, no filtering by the services you offer. If you are not the first workshop in the list, you rely on customers explicitly choosing you. New customers are auto-assigned to the *first-registered* workshop on the platform.

---

## Your dashboard

`/shop/dashboard` — your landing page.

**Header** — your workshop name, address, city and phone, straight from your profile.

**Four metric cards**

| Card | Shows |
|---|---|
| Service Orders | Total bookings your workshop has ever received |
| Towing Requests | Total towing jobs |
| Total Jobs Logged | Bookings + towing combined *(labelled with a customer icon, but it is a job count)* |
| Pending Orders | Bookings and towing jobs still awaiting your acknowledgement — **your action queue** |

**Two live tables** — your five most recent bookings and five most recent towing jobs. Each row has a **status dropdown you can change directly from here**, plus the customer's OTP shown as a code chip.

The dashboard loads once. Reload to see new jobs — nothing pushes updates to you.

> ⚠️ **Do not use the towing status dropdown on this page.** It destroys customer data. See [Critical warnings](#critical-warnings).

---

## Setting up your workshop profile

`/shop/profile` — top section.

| Field | Why it matters |
|---|---|
| **Shop name** | What customers see in their workshop dropdown. The main thing you are identified by. |
| Manager / owner name | Shown on your profile |
| Phone number | Customers see this on booking and towing detail pages. Keep it current — it is their main route to you. |
| City | Shown in the customer's selector |
| Shop address | Shown to customers for drop-off |

Save with **Update Profile Details**. Changes appear immediately for customers.

Fill this in properly before taking real work. Several customer-facing screens fall back to generic placeholder text when these fields are blank.

---

## Managing your service catalog

`/shop/profile` — lower section. **This is your published price list.** Customers can only book what is here.

### The catalog table

Each row shows the icon, title, description, price and an Active/Disabled pill, with edit and delete buttons. Inactive items are listed here but hidden from customers.

### Adding a service

Click **Add New Service** and fill the modal:

| Field | Notes |
|---|---|
| **Title** | What the customer sees. Be specific — *"Full Engine Oil & Filter Change"* beats *"Oil change"* |
| **Description** | What is included. Customers read this before booking, so it is your best tool for setting expectations |
| **Icon** | Choose from eight preset options |
| **Starting price (₹)** | Required. Presented to customers as the amount for the service |
| **Active** | Uncheck to hide from customers while keeping the record |

### Editing a service

The edit button reopens the same modal prefilled.

> **Careful with prices.** Because order totals are recalculated from your current catalog on every read, **editing a price changes the displayed total on every past booking that included that service** — including already-paid ones. If you are raising prices, consider creating a new service and deactivating the old one instead of editing in place.

> **Careful with icons.** The dropdown offers eight options. If a service's stored icon is not one of those eight, the dropdown shows the first option instead, and saving silently overwrites the original icon.

### Deleting versus deactivating

> ### ⚠️ Do not delete services. Deactivate them.
>
> Delete performs a permanent removal that **cascades into your booking history.** Every past booking that included that service loses it from its line items, and those bookings' totals drop accordingly.
>
> **Instead:** edit the service and uncheck **Active**. It disappears from the customer catalog, stays in your list, and your history stays intact.

### Practical catalog advice

- **Group related work into one service** rather than listing every micro-task. Customers select multiple services per booking, so a long flat list becomes hard to scan.
- **Describe what is included and what is not.** "Starting price" implies variability; the description is where you explain what drives it.
- **Deactivate seasonal services** rather than deleting them — AC servicing in winter, for example.

---

## Processing service bookings

`/shop/service-orders` — your main job queue.

### Filter tabs

All · Pending · In Progress · Completed · Cancelled, each with a count.

> **There is no "Confirmed" tab**, even though Confirmed is a valid status you can set. A booking you mark Confirmed disappears from every tab except All. Either treat Confirmed as a short transitional state, or skip it and go straight from Pending to In Progress.

### What each row shows

- Order number
- Customer name, phone and email
- Vehicle information and the services booked
- Requested date and time
- Payment status pill
- The customer's OTP, with a green "Verified" marker once used
- A **status dropdown**
- An **Edit** button

### Changing a status

Pick from the dropdown; it saves immediately. No confirmation step.

If the save fails, the dropdown keeps showing the value you picked until you reload — so if you see an error, reload before trusting the display.

### The edit modal

**Edit** opens a modal where you can change:

- Status
- Customer name, phone
- Vehicle information
- **Mark as Paid** checkbox

> The modal **cannot change the date or time** — the two fields you most often need for rescheduling. To reschedule, phone the customer and note it in your own system.

### A workable process

```
1. Pending    → check the queue, phone the customer to confirm the slot
2. Confirmed  → optional; skip if the missing tab makes it awkward
3. Processing → set when the vehicle arrives and work begins
4. Completed  → set when work is finished
                  ↓
5. Handover   → the customer verifies their OTP (see below)
6. Payment    → for cash jobs, tick Mark as Paid once you have the money
```

Note that step 5 can happen without you — the customer can mark the job complete from their own account at any point.

---

## Dispatching towing requests

`/shop/towing-orders` — your roadside assistance board.

### What each row shows

- Request number
- Customer name and a **click-to-call phone link**
- Vehicle details
- Pickup address, plus a **View GPS Map** link that opens Google Maps at the coordinates
- Handover OTP with a Verified marker
- Status badge and a status dropdown

Filter tabs: All · Pending · Processing · Completed · Cancelled.

### > ⚠️ Read this before touching a towing status

**Changing a towing job's status permanently erases the customer's name, phone number, vehicle details and pickup address.**

The status update overwrites those four columns with empty values. Only the GPS coordinates survive. There is no towing detail or edit screen on your side, so **there is no way to restore them.**

```
Before dispatch                          After you set "Driver En Route"
  John Doe                                 (blank)
  9876543210                               (blank)
  Honda City (2022) - Silver               (blank)
  SG Highway near Iscon Temple             (blank)
  23.022500, 72.571400                     23.022500, 72.571400  ← survives
```

**Until this is fixed, work around it:**

1. **Write the details down first** — name, phone, vehicle, address — before changing any status.
2. **Or leave the status alone entirely** and manage towing jobs on paper or WhatsApp, using the app only to receive the request.
3. **Tell your developer** to fix `PUT /api/shop/towing-orders/:id` — the fix is a few lines, shown in [03 — Flows](./03-flows.md#-the-towing-equivalent-is-broken).

### What towing gives you

- Customer contact and vehicle description
- A free-text pickup address
- GPS coordinates with a Maps link, when the customer's browser provided them
- A handover OTP
- A status field

### What it does not

- No price or payment — towing is free in the system; settle charges directly
- No driver assignment — you cannot record who went
- No ETA field
- No detail or edit view
- No live location feed

**A caution about coordinates:** when a customer's GPS fails, the app silently substitutes fixed coordinates in Ahmedabad (`23.022500, 72.571400`) and tells them it worked. If you see exactly those coordinates, **treat them as unverified** and phone the customer to confirm where they actually are.

---

## Your message inbox

`/shop/messages` — contact-form submissions from customers who selected your workshop.

Each message shows the sender's name, email, subject, body and timestamp, with a **Reply via Email** link that opens your own mail client.

> ### ⚠️ Two of the three actions on this page do not work
>
> | Action | Status |
> |---|---|
> | Reading a message | ✅ Works |
> | Marking it read | ❌ Fails silently — messages stay unread forever |
> | Deleting it | ❌ Always fails with an error |
> | Unread count badge | ❌ Never displays |
>
> The inbox is effectively **read-only and append-only.** It will grow indefinitely with no way to triage.

**Working around it:** treat the inbox as a notification feed, not a workflow tool. Read new messages, reply by email, and track follow-ups elsewhere. Since there is no unread indicator, check it on a schedule rather than waiting for a badge.

The fixes are small and documented in [03 — Flows](./03-flows.md#the-inbox-is-the-most-broken-screen-in-the-app).

---

## Publishing articles

`/blog` — as staff you see an **Add Article** button.

| Field | Notes |
|---|---|
| Title | A URL slug is generated automatically |
| Content | Full article body. Plain text — no rich formatting |
| Image URL | A link to a hosted image. There is no upload |
| Author | Defaults to your first name |

Published articles appear to everyone, including logged-out visitors. There is no editing or deleting from the UI once published (the backend supports both, but no button calls them), so **proofread before publishing.**

Articles are a light marketing surface — a place to demonstrate expertise. They are not tied to your workshop or catalog in any way.

---

## The OTP and your role in it

Every booking and towing job carries a 6-digit code, visible to you as a code chip in your queue.

**The intended design:** the customer holds the code. When they arrive to collect the vehicle, you ask for it and enter it. That entry is the record that the handover happened.

**How it actually works:** you can see the code but have **no way to enter it.** There is no verify button anywhere in the workshop portal. Only the customer can submit it, from their own account, at any time — including before you have started work.

**What this means in practice:**

- The OTP is not a control you hold. It cannot settle a handover dispute.
- A job can flip to Completed without your involvement.
- **Do not rely on the Completed status as your record that work is finished.** Use your own status changes for that.

**The fix** requires a workshop-side verify endpoint and a button in your queue, gated on the job being In Progress. See [03 — Flows](./03-flows.md#how-to-fix-it).

---

## Payments and the paid flag

### What you control

The **Mark as Paid** checkbox in the service order edit modal. That is the whole payment interface on your side.

### What happens for online payments

A customer who chooses Pay Online goes through a payment window and the booking is flagged paid.

> ⚠️ **The payment window is a simulation.** It does not contact any payment processor and no money moves. A "Paid" badge on an online booking is **not evidence you have been paid.**

**Until real payment processing is wired up, verify every payment independently** — bank transfer, UPI confirmation, or cash in hand — and use Mark as Paid only as your own bookkeeping flag.

### What is missing

- No amount recorded against a payment — only a boolean
- No payment date or reference
- No audit trail of who ticked the box
- No refunds
- No partial payments or deposits
- No payment surface for towing at all

---

## Critical warnings

The four things most likely to cause you real problems, in order.

### 1. 🔴 Towing status changes erase customer data

Changing any towing job's status — from either the dashboard or the towing board — permanently blanks the customer's name, phone, vehicle details and pickup address, with no recovery path.

**Until fixed:** record the details before changing status, or don't change towing statuses at all.

### 2. 🔴 Deleting a service rewrites your history

A deleted catalog item is stripped from every past booking that included it, and those bookings' totals drop.

**Instead:** uncheck **Active**.

### 3. 🟠 Editing a price changes past invoices

Order totals are computed from your live catalog, so a price change propagates backwards through your booking history.

**Instead:** create a new service and deactivate the old one.

### 4. 🟠 "Paid" does not mean paid

Online payment is a simulation. Verify money independently.

### Also worth knowing

- The message inbox cannot mark read or delete — treat it as a read-only feed
- The Confirmed status has no filter tab, so those bookings hide under All
- You have no way to enter a customer's OTP
- Nothing auto-refreshes — reload to see new jobs
- A failed status change leaves the wrong value on screen until you reload
- Your session expires after 7 days with no warning; pages go blank
- The edit modal cannot change a booking's date or time
- No mobile navigation menu on narrow screens

---

## Suggested daily routine

**Morning**

1. Open `/shop/dashboard` and check **Pending Orders** — your action queue.
2. Go to `/shop/service-orders`, filter **Pending**, and phone each customer to confirm their slot.
3. Move confirmed jobs to **In Progress** as vehicles arrive.

**Through the day**

4. Check `/shop/towing-orders` for new requests. Phone the customer immediately — the click-to-call link is there for this. **Write their details down before touching the status.**
5. Update booking statuses as work progresses.

**On handover**

6. Set the booking to **Completed**.
7. For cash jobs, open the edit modal and tick **Mark as Paid** once you have the money.
8. Note that the customer may or may not verify their OTP — do not wait on it.

**Weekly**

9. Check `/shop/messages` for customer enquiries — there is no unread badge to prompt you.
10. Review your catalog: are prices current? Should anything seasonal be deactivated?
11. Consider publishing an article.

---

**Next:** [06 — Platform Admin Guide](./06-user-guide-admin.md), or [07 — Feature Catalog](./07-features.md) for the full build-status inventory.
