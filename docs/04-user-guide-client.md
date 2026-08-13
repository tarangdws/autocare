[← Back to index](./README.md)

# 04 — Client Guide

For vehicle owners. Everything you can do, in the order you would normally do it.

**Demo login:** `john_doe` / `userpass`

---

## Contents

- [Getting started](#getting-started)
- [Your dashboard](#your-dashboard)
- [Choosing your workshop](#choosing-your-workshop)
- [Browsing services](#browsing-services)
- [Booking a service](#booking-a-service)
- [Tracking your booking](#tracking-your-booking)
- [Paying](#paying)
- [Completing a job with your OTP](#completing-a-job-with-your-otp)
- [Cancelling](#cancelling)
- [Requesting emergency towing](#requesting-emergency-towing)
- [Tracking a towing request](#tracking-a-towing-request)
- [Contacting your workshop](#contacting-your-workshop)
- [Reading the blog](#reading-the-blog)
- [Things that will surprise you](#things-that-will-surprise-you)

---

## Getting started

### Create an account

Go to **Sign up** and provide a username, email and password. First and last name are optional but worth filling in — they prefill your booking forms later.

You are logged in immediately and landed on your dashboard. There is no email verification step.

**Your account is automatically linked to a workshop** — the first one registered on the platform — so you have a catalog to browse right away. You can change this at any time.

### Log in

Enter your username (not your email) and password. There is a show/hide toggle on the password field.

Your session lasts **7 days**. After that you will need to log in again.

### Forgot your password

The **Forgot password** page accepts your email and shows a confirmation message.

> **This does not currently work.** The message is shown regardless, but no email is sent and no reset link is generated. If you are locked out, an administrator must reset your password directly. See [07 — Feature Catalog](./07-features.md#password-reset).

---

## Your dashboard

`/dashboard` — your landing page after login.

**Four summary cards**

| Card | Shows |
|---|---|
| Total Orders | All your bookings plus all your towing requests |
| Service Orders | Count of your service bookings |
| Active Services | Bookings currently `confirmed` or `processing` |
| Towing Orders | Count of your towing requests |

**Two activity tables** — your three most recent service bookings and your three most recent towing requests, each with an OTP button and a link to the full detail page.

**Two shortcut buttons** — New Service Booking (goes to the service catalog) and Request Towing.

> Note: one card is labelled "Completed Services" in the UI but actually shows your *total* booking count, not completed ones. A known labelling bug.

The dashboard loads once when you open it. It does not refresh on its own — reload the page to see updates.

---

## Choosing your workshop

`/profile`

This is the most important setting in the app, because **it decides which workshop receives everything you do**.

### What you can edit

- First name, last name, email
- **Preferred Authorized Service Hub** — a dropdown of every workshop on the platform, shown as `Shop Name (City - Address)`

Once selected, a panel below shows that workshop's full details — name, city, address, phone.

### What your selection controls

| Action | Effect of your selection |
|---|---|
| Browsing services | You see this workshop's catalog |
| Booking a service | The booking goes to this workshop |
| Requesting towing | This workshop is dispatched |
| Sending a contact message | This workshop receives it |

**Switching workshops affects future jobs only.** Existing bookings and towing requests stay with the workshop they were created for.

### Two limitations

**You cannot clear your selection.** Choosing the blank placeholder option shows a success message but changes nothing — the app keeps your previous workshop.

**Your name/email and your workshop choice save as two separate operations.** If the second one fails you will see an error, but your name change has already been saved. Reload the page to see what actually persisted.

---

## Browsing services

`/services-info`

A card grid of every active service your chosen workshop offers. Each card shows:

- An icon representing the service type
- The service title
- A description of what is included
- **Starting price in ₹**
- A **Book This Service** link that takes you to the booking form with that service pre-selected

The page header shows which workshop's catalog you are viewing.

> If you are **not logged in**, this page will appear empty and show placeholder workshop details. The catalog requires a login. Sign in first. This is a known issue — see [07 — Feature Catalog](./07-features.md#public-pages-for-guests).

Services your workshop has marked inactive do not appear here.

---

## Booking a service

`/book-service`

Three numbered sections on one page.

### 1. Select your services

Clickable tiles, one per available service. Tap to toggle; selected tiles show a checkmark.

**You can select multiple services in one booking** — for example an oil change plus a wheel alignment plus an AC service. An **Estimated Total** figure updates live as you toggle.

One service is always pre-selected: either the one you arrived from, or the first in the list. **You cannot deselect down to zero** — at least one must stay selected.

### 2. Your details and schedule

| Field | Notes |
|---|---|
| Your name | Prefilled from your profile |
| Phone number | Required |
| Email | Prefilled from your profile |
| **Vehicle information** | Free text. Be specific — *"Honda City (2022) - Silver, GJ01AB1234"* is much more useful to a mechanic than *"my car"* |
| Preferred date | Defaults to tomorrow |
| Preferred time | Defaults to 10:00 |
| Additional notes | Optional. Use this for symptoms, noises, or anything the mechanic should know |

**Your preferred date and time are a request, not a confirmed slot.** The app has no capacity model — it will accept any date and time, and does not check whether the workshop is open or already booked. The workshop confirms by changing your booking's status.

You can also enter a date in the past; nothing prevents it.

### 3. Payment method

| Option | What happens |
|---|---|
| **Cash / Pay at Workshop** | Booking is created; you go straight to the detail page. Pay in person. |
| **Pay Online** | Booking is created, then a payment window opens. See [Paying](#paying). |

### After you submit

Your booking is created with status **Pending** and a **6-digit OTP** is generated. You land on the booking detail page where the OTP is displayed prominently.

---

## Tracking your booking

Two places to look.

### The list — `/service-orders`

Every booking you have ever made, newest first, with **filter tabs**: All · Pending · Confirmed · In Progress · Completed · Cancelled. Each tab shows a count.

Table columns: order number, vehicle and the services included, which workshop, your requested schedule, payment status, current status, an OTP button, and a Details link.

There is no search or pagination — all your bookings render in one table.

### The detail page — `/bookings/:id`

- **Security Passcode panel** — your 6-digit OTP in large type
- **Cancel button** — only when the status allows it
- **Vehicle and Schedule** — what you submitted
- **Workshop details** — name, address, phone
- **Payment card** — method, paid status, and a Pay Online button if unpaid
- **Services table** — each service with its price, and the total
- **Verify Completion OTP button**

### What the statuses mean

| Badge | Meaning |
|---|---|
| **Pending Confirmation** | Received; the workshop has not yet acknowledged it |
| **Confirmed** | The workshop has accepted your slot |
| **In Progress** | Work is underway |
| **Completed** | Finished and handover verified |
| **Cancelled** | Called off |

**Nothing updates automatically.** Reload the page to see whether the workshop has moved your job along. Despite UI text mentioning "real-time milestones", there is no live updating.

---

## Paying

Two entry points: choose **Pay Online** at booking time, or click **Pay Online with Stripe** on the booking detail page later.

A payment window opens showing the amount and card fields.

> ### ⚠️ Payment is currently a simulation
>
> The card fields are pre-filled with test values and are never transmitted anywhere. Clicking Pay waits about a second and then marks the booking as paid without contacting any payment processor. **No money moves.**
>
> This is a prototype placeholder, not a working payment integration. Do not treat a "Paid" badge as evidence that a customer has paid. See [07 — Feature Catalog](./07-features.md#online-payment).

### One consequence worth knowing

**Paying changes your OTP.** The system generates a new code when a booking is marked paid. If you noted your original code down, it will no longer work. Reopen the booking detail page to see the current code.

### Cash bookings

Choosing Cash creates the booking with `is_paid = false`. Nothing else happens automatically — the workshop marks it paid on their side after you pay in person.

---

## Completing a job with your OTP

Every booking and towing request carries a 6-digit code, shown on its detail page and as a button in your order lists.

**The intended purpose:** proof that the vehicle physically changed hands. You give the code to the mechanic; they enter it; the job closes with a record that the handover happened.

**How it works today:** you enter the code yourself.

1. Click **Verify Completion OTP** (bookings) or **Verify Handover OTP** (towing)
2. The modal shows your code and gives you an input box
3. Type the 6 digits and submit
4. The job's status changes to **Completed**

> ### ⚠️ This does not currently work as a handover proof
>
> You are shown the code and given the button that consumes it, so nothing about entering it demonstrates that a mechanic was present. The workshop can see your code but has no way to enter it.
>
> **Practically: do not verify the OTP until the work is genuinely finished and you have your vehicle back.** There is no undo — the job is marked completed and the verified flag stays set even if the status is changed back.
>
> Also note the button appears even for **cancelled** and **pending** bookings, where verifying makes no sense. Ignore it in those states.
>
> See [03 — Flows](./03-flows.md#flow-7--otp-handover) for the full picture and the intended fix.

---

## Cancelling

On a booking or towing detail page, click **Cancel** and confirm.

**When the button appears:**

| Type | Cancellable while status is |
|---|---|
| Booking | Pending, Confirmed |
| Towing | Pending, Processing (Driver En Route) |

A cancelled job is not deleted — it stays in your history with a Cancelled badge, and still appears under the Cancelled filter tab.

**A booking already In Progress cannot be cancelled from the app.** Contact the workshop directly.

There is no cancellation policy, fee, or reason field.

---

## Requesting emergency towing

`/towing-request`

For breakdowns and accidents — a simpler, faster form than a service booking.

### The form

| Field | Notes |
|---|---|
| Your name | Prefilled from your profile |
| Phone number | **The most important field** — how the driver reaches you |
| Vehicle details | Make, model, colour, registration. Helps the driver identify your car |
| Pickup address | Free text. Be as precise as you can — landmarks help |
| Latitude / Longitude | Optional. Filled by the GPS button or typed manually |

### The GPS button

**Use My Current GPS Location** asks your browser for permission and fills the coordinate fields. On success you get a green confirmation showing the coordinates.

> ### ⚠️ Important: check the coordinates before submitting
>
> If your browser denies the request or times out, the app **silently fills in fixed coordinates for Ahmedabad, Gujarat** and shows the same green "GPS location locked" confirmation as a real fix. There is no visible difference between a working GPS reading and a failed one.
>
> **If you are not in Ahmedabad and you see `23.022500, 72.571400`, the GPS did not work.** Clear those fields and write your location as precisely as you can in the pickup address instead.
>
> This is a serious bug — see [03 — Flows](./03-flows.md#flow-9--emergency-towing).

GPS also requires an HTTPS connection in most browsers. On plain HTTP it will fail, and you will get the fallback coordinates.

### After submitting

The request is created with status **Looking for Driver** and a handover OTP. You land on the towing detail page.

**Towing is free in this system** — no price, no payment. Whatever you agree with the workshop happens outside the app.

---

## Tracking a towing request

### The list — `/towing-orders`

Filter tabs: All · Looking for Driver · Driver En Route · Completed · Cancelled.

Columns: request number, vehicle, pickup location, dispatch workshop, status, handover OTP, Details link.

### The detail page — `/towing/:id`

- **Handover Passcode panel** — your 6-digit OTP
- **Cancel button** when the status allows
- **Contact and vehicle details** — what you submitted
- **Location card** — your pickup address plus a **View on Google Maps** link if coordinates were captured
- **Dispatch workshop** — name and phone
- **Verify Handover OTP button**

### Status meanings

| Badge | Meaning |
|---|---|
| **Looking for Driver** | Received; no driver assigned yet |
| **Driver En Route** | A driver is on the way |
| **Completed** | Vehicle collected, handover verified |
| **Cancelled** | Called off |

**No live tracking.** You cannot see where the truck is. Reload to check whether the status has changed, and call the workshop for anything time-sensitive.

> ### ⚠️ A bug that affects you directly
>
> When a workshop changes your towing status, the current system **erases your name, phone number and pickup address** from the record. The workshop is left with only your GPS coordinates.
>
> If you have an active towing request, **call the workshop directly** rather than relying on them having your details. See [03 — Flows](./03-flows.md#-the-towing-equivalent-is-broken).

---

## Contacting your workshop

`/contact`

Fill in name, email, subject and message. It goes to your selected workshop's inbox, where staff see it flagged as unread.

The page also shows your workshop's address and phone, plus an emergency towing hotline number.

> **Two caveats.** You must be logged in — the form silently fails otherwise, despite the page being publicly reachable. And the workshop's inbox currently cannot mark messages as read or delete them, so expect a reply by email or phone rather than in the app. The **Reply via Email** action on their side opens their own mail client.

Your name and email fields may not prefill on a fresh page load. Fill them in manually.

---

## Reading the blog

`/blog`

Car maintenance articles — seasonal tips, when to replace brakes, and so on. Each entry shows a cover image, title, author and date.

Full article text renders in the card; there is no separate article page. Two articles ship with the demo data.

If you are logged in as workshop staff or an administrator, an **Add Article** button appears with an inline authoring form.

---

## Things that will surprise you

Consolidated so you are not caught out.

| Behaviour | What to do |
|---|---|
| Nothing auto-refreshes, despite "live" and "real-time" wording | Reload the page |
| Password reset does nothing | Ask an administrator to reset it |
| Paying changes your OTP | Reopen the booking to get the current code |
| Payment doesn't actually charge you | Treat "Paid" as a status flag, not a receipt |
| GPS failure silently substitutes Ahmedabad coordinates | Verify the numbers; clear them if you're elsewhere |
| Verifying the OTP is irreversible | Only do it once you have your vehicle back |
| The verify button appears on cancelled bookings | Ignore it there |
| Your session expires after 7 days with no warning | Pages go blank; log in again |
| Service catalog and contact form need a login | Sign in first |
| A cancelled booking can still show a Pay button | Ignore it |
| Order totals reflect *current* catalog prices | Note the amount at booking time |
| No mobile navigation menu on narrow screens | Use a wider window or landscape |
| Towing has no payment | Settle it with the workshop directly |
| Your workshop can change your booking's customer details | Check the detail page if something looks off |

---

**Next:** [05 — Workshop Guide](./05-user-guide-shop.md) for the other side of these flows, or [07 — Feature Catalog](./07-features.md) for what's built versus broken.
