[← Back to index](./README.md)

# 03 — Flows

End-to-end walkthroughs. Each flow shows the UI action, the API call it triggers, and the resulting database change, so you can trace behaviour in either direction — from a symptom back to a handler, or from a handler forward to what the user sees.

## Contents

- [Flow 1 — Client signup](#flow-1--client-signup)
- [Flow 2 — Login and session](#flow-2--login-and-session)
- [Flow 3 — Choosing a workshop](#flow-3--choosing-a-workshop)
- [Flow 4 — Service booking](#flow-4--service-booking)
- [Flow 5 — Payment](#flow-5--payment)
- [Flow 6 — Workshop processes a job](#flow-6--workshop-processes-a-job)
- [Flow 7 — OTP handover](#flow-7--otp-handover)
- [Flow 8 — Cancellation](#flow-8--cancellation)
- [Flow 9 — Emergency towing](#flow-9--emergency-towing)
- [Flow 10 — Catalog management](#flow-10--catalog-management)
- [Flow 11 — Contact message](#flow-11--contact-message)
- [Flow 12 — Workshop onboarding](#flow-12--workshop-onboarding)
- [Data lifecycle summary](#data-lifecycle-summary)

---

## Flow 1 — Client signup

A new vehicle owner creates an account.

```
USER                    FRONTEND                 API                      DATABASE
 │
 │ Opens /signup
 │ Fills username, email,
 │ password, first/last name
 │ Clicks "Create account"
 │──────────────────────▶│
 │                       │ POST /auth/signup
 │                       │ { username, email, password,
 │                       │   first_name, last_name }
 │                       │───────────────────────▶│
 │                       │                        │ Validate: username, email,
 │                       │                        │ password all required
 │                       │                        │
 │                       │                        │ SELECT id FROM users
 │                       │                        │ WHERE username=$1 OR email=$2
 │                       │                        │───────────────────────▶│
 │                       │                        │◀───────────────────────│
 │                       │                        │ if exists → 400
 │                       │                        │
 │                       │                        │ bcrypt.hash(password, 10)
 │                       │                        │
 │                       │                        │ INSERT INTO users
 │                       │                        │ (is_staff=false,
 │                       │                        │  is_superuser=false)
 │                       │                        │───────────────────────▶│
 │                       │                        │
 │                       │                        │ SELECT id FROM admin_profiles
 │                       │                        │ ORDER BY id ASC LIMIT 1
 │                       │                        │───────────────────────▶│
 │                       │                        │◀───── first workshop ──│
 │                       │                        │
 │                       │                        │ INSERT INTO select_shops
 │                       │                        │ (user_id, select_shop_id)
 │                       │                        │───────────────────────▶│
 │                       │                        │
 │                       │                        │ jwt.sign({id, username,
 │                       │                        │   email, is_staff,
 │                       │                        │   is_superuser}, 7d)
 │                       │◀── 201 {token, user} ──│
 │                       │
 │                       │ login(token, user)
 │                       │ localStorage['autocare_token'] = token
 │                       │ navigate('/dashboard')
 │◀──────────────────────│
 │ Sees client dashboard
```

**Key behaviour:** signup auto-links the new user to the **lowest-ID workshop**. This means a fresh account immediately has a catalog to browse rather than an empty screen. The user can change it later on `/profile`.

**Gaps:** no email verification, no password strength rule, no confirm-password field, and no duplicate-email check separate from username (both collapse into one 400 message).

---

## Flow 2 — Login and session

```
USER                    FRONTEND                 API                      DATABASE
 │
 │ /login → username + password
 │──────────────────────▶│
 │                       │ POST /auth/login
 │                       │───────────────────────▶│
 │                       │                        │ SELECT * FROM users
 │                       │                        │ WHERE username=$1
 │                       │                        │───────────────────────▶│
 │                       │                        │◀───────────────────────│
 │                       │                        │ bcrypt.compare(...)
 │                       │                        │ fail → 400 "Invalid
 │                       │                        │        username or password"
 │                       │                        │ jwt.sign(payload, 7d)
 │                       │◀── 200 {token, user} ──│
 │                       │
 │                       │ login(token, user)
 │                       │
 │                       │ Role-based redirect:
 │                       │   is_superuser → /admin/dashboard
 │                       │   is_staff     → /shop/dashboard
 │                       │   else         → /dashboard
 │◀──────────────────────│
```

### Session hydration on every page load

```
Page load / refresh
      │
      ▼
AuthProvider mounts
      │  token = localStorage.getItem('autocare_token')   ← lazy initial state
      │  loading = true
      ▼
useEffect([token])
      │
      ├── no token ──▶ user = null, profile = null, loading = false
      │                └─▶ ProtectedRoute redirects to /login
      │
      └── token present
              │ GET /auth/me  (Bearer attached by interceptor)
              │       │
              │       │ SELECT id, username, email, first_name,
              │       │        last_name, is_staff, is_superuser
              │       │ FROM users WHERE id = <token.id>
              │       │
              │       ├── is_staff → SELECT * FROM admin_profiles
              │       │              WHERE user_id = $1
              │       │              (their own workshop)
              │       │
              │       └── else    → SELECT ap.* FROM select_shops ss
              │                     JOIN admin_profiles ap
              │                       ON ss.select_shop_id = ap.id
              │                     WHERE ss.user_id = $1
              │                     (their chosen workshop)
              │
              ├── 200 ──▶ setUser, setProfile, loading = false
              └── error ─▶ logout()   ← the only automatic logout path
```

**Note the asymmetry:** a failed `/auth/me` logs the user out, but a 401 on any *other* endpoint does not. There is no response interceptor, so an expired token mid-session produces silently empty pages. See [02 — Architecture](./02-architecture.md#known-gap-no-response-interceptor).

---

## Flow 3 — Choosing a workshop

This flow determines where every future job goes, so it runs before booking anything.

```
USER                    FRONTEND                 API                      DATABASE
 │
 │ Opens /profile
 │──────────────────────▶│ GET /client/profile
 │                       │───────────────────────▶│
 │                       │                        │ SELECT user fields
 │                       │                        │ SELECT * FROM admin_profiles
 │                       │                        │   ORDER BY shop_name ASC
 │                       │                        │ SELECT select_shop_id
 │                       │                        │   FROM select_shops
 │                       │                        │   WHERE user_id = $1
 │                       │◀─ {user, shops,        │
 │                       │    selected_shop_id} ──│
 │◀── form + dropdown ───│
 │
 │ Edits name/email,
 │ picks a workshop
 │ Clicks Save
 │──────────────────────▶│
 │                       │ ① POST /client/profile
 │                       │   {first_name, last_name, email}
 │                       │───────────────────────▶│ UPDATE users SET ...
 │                       │◀───────────────────────│
 │                       │
 │                       │ ② POST /client/select-shop
 │                       │   {select_shop_id}
 │                       │───────────────────────▶│ SELECT id FROM select_shops
 │                       │                        │ WHERE user_id = $1
 │                       │                        │   exists → UPDATE
 │                       │                        │   else   → INSERT
 │                       │◀───────────────────────│
 │                       │
 │                       │ refreshUser()   ← re-hydrates AuthContext.profile
 │◀── "Updated" banner ──│
```

**Two non-obvious behaviours:**

**The save is two separate requests with no transaction.** If the profile update succeeds and the shop selection fails, the user sees an error banner but their name change has already persisted.

**You cannot clear a selection.** The second call is wrapped in `if (selectedShopId)`, and the backend rejects a falsy value with 400. Selecting the blank placeholder option silently skips the call while still showing "updated successfully".

### Why the selection matters

```
select_shops row
      │
      ├──▶ GET /portal/services     which catalog the client sees
      │                             (falls back to lowest-ID workshop if unset)
      │
      ├──▶ POST /portal/book-service     which workshop the booking goes to
      │                                  (NO fallback → shop_id = null)
      │
      ├──▶ POST /portal/towing           which workshop is dispatched
      │                                  (NO fallback → shop_id = null)
      │
      └──▶ POST /portal/contact          which workshop receives the message
                                         (NO fallback → shop_id = null)
```

**The fallback asymmetry is a live bug.** Reading the catalog has a fallback; creating jobs does not. A client whose `select_shops` row is missing or points at a deleted workshop (`ON DELETE SET NULL`) will see a catalog and be able to book — and the booking lands with `shop_id = null`, invisible to every workshop dashboard. Nothing warns the user or the operator.

---

## Flow 4 — Service booking

The primary revenue flow.

### Step 1 — Browse the catalog

```
Client opens /services-info
      │
      │ GET /portal/services
      │       │
      │       │ SELECT select_shop_id FROM select_shops WHERE user_id = $1
      │       │   └── null? → SELECT id FROM admin_profiles ORDER BY id LIMIT 1
      │       │
      │       │ SELECT * FROM admin_profiles WHERE id = <shopId>
      │       │ SELECT * FROM service_offerings
      │       │   WHERE shop_id = <shopId> AND is_active = true
      │       │   ORDER BY id DESC
      │       │
      │       └── { services: [...], shop: {...} }
      │
      └── Renders a card grid: icon, title, description, ₹price
          Each card links to /book-service?serviceId=<id>
```

Only `is_active = true` items appear. This is how a workshop retires a service without breaking history.

### Step 2 — Fill the booking form

`/book-service` loads the same catalog, then:

```
Initial state
  ├── selectedServiceIds = [?serviceId] if the query param is present,
  │                        else [firstService.id]
  ├── customer_name  ← prefilled from user.first_name + last_name
  ├── customer_email ← prefilled from user.email
  ├── preferred_date ← tomorrow (now + 86400000), ISO date
  ├── preferred_time ← '10:00'
  └── payment_method ← 'cash'

User interaction
  ├── Toggles service tiles → live "Estimated Total" recomputes
  │     total = Σ parseFloat(service.price_starts_at)
  ├── Enters vehicle_info (free text, e.g. "Honda City (2022) - Silver")
  ├── Adjusts date / time
  ├── Optional additional_notes
  └── Picks cash or online
```

Note: you cannot deselect the last remaining service — the toggle is guarded by `if (selectedServiceIds.length > 1)`. Combined with auto-selecting the first service, an empty selection is unreachable, which makes the "select at least one service" validation dead code.

### Step 3 — Submit

```
FRONTEND                          API                              DATABASE
   │
   │ POST /portal/book-service
   │ { customer_name, customer_phone, customer_email,
   │   vehicle_info, preferred_date, preferred_time,
   │   additional_notes, payment_method,
   │   service_ids: [1, 3] }
   │────────────────────────────────▶│
   │                                 │ Validate all required fields present
   │                                 │ and service_ids.length > 0 → else 400
   │                                 │
   │                                 │ SELECT select_shop_id
   │                                 │ FROM select_shops WHERE user_id = $1
   │                                 │ (no fallback — may be null)
   │                                 │
   │                                 │ otp = generateOtp()
   │                                 │   Math.floor(100000 + random*900000)
   │                                 │
   │                                 │ INSERT INTO service_bookings
   │                                 │   status = 'pending'
   │                                 │   otp = <otp>
   │                                 │   otp_verified = false
   │                                 │   is_paid = false
   │                                 │ RETURNING *
   │                                 │──────────────────────────────▶│
   │                                 │◀──────────── booking ─────────│
   │                                 │
   │                                 │ FOR EACH service_id:          ← loop,
   │                                 │   INSERT INTO                    no
   │                                 │     service_booking_items        transaction
   │                                 │   SELECT price_starts_at
   │                                 │     FROM service_offerings
   │                                 │   totalCost += price
   │                                 │──────────────────────────────▶│
   │                                 │
   │                                 │ if payment_method === 'online'
   │                                 │    && totalCost > 0:
   │                                 │   stripe.paymentIntents.create({
   │                                 │     amount: round(total * 100),
   │                                 │     currency: 'inr',
   │                                 │     receipt_email })
   │                                 │   UPDATE service_bookings SET
   │                                 │     stripe_payment_intent_id
   │                                 │   ── on Stripe error ──▶
   │                                 │      fabricate pi_mock_<id>_<ts>
   │                                 │
   │◀── 201 { message, booking,      │
   │         otp, stripe } ──────────│
   │
   ├── payment_method === 'cash'
   │     └──▶ navigate(`/bookings/${booking.id}`)
   │
   └── payment_method === 'online'
         └──▶ open StripePaymentModal → Flow 5
```

**Three things to flag here:**

1. **No transaction.** The booking row and its line items are inserted in separate statements. A failure partway through leaves a booking with some or no services attached.
2. **The Stripe fallback fabricates success.** Any Stripe error — bad key, network failure, outage — produces a `pi_mock_*` ID and the flow continues as if payment were set up. A failure should surface, not be papered over.
3. **`totalCost` is computed but never stored.** It is returned in the response and recomputed on every subsequent read. See [02 — Architecture](./02-architecture.md#two-schema-decisions-worth-understanding).

### Resulting database state

```
service_bookings
  id: 5, user_id: 4, shop_id: 1
  customer_name: 'John Doe', customer_phone: '9876543210'
  vehicle_info: 'Honda City (2022) - Silver'
  preferred_date: 2026-08-14, preferred_time: 10:00:00
  status: 'pending', otp: '784920', otp_verified: false
  payment_method: 'cash', is_paid: false

service_booking_items
  (5, 1)   ← Full Engine Oil & Filter Change  ₹1499
  (5, 3)   ← Wheel Alignment & Tire Balancing ₹999
                                       total = ₹2498 (computed on read)
```

---

## Flow 5 — Payment

**Important: this flow does not currently move money.** Documented as built, with the gap marked.

```
USER                  StripePaymentModal              API                    DATABASE
 │
 │ Modal opens with the booking + amount
 │
 │ Card fields are PREFILLED and never read:
 │   cardNumber = '4242 •••• •••• 4242'
 │   expDate    = '12/28'
 │   cvc        = '123'
 │ Badge: "Stripe Test Mode"
 │
 │ Clicks "Pay ₹2498"
 │────────────────────────▶│
 │                         │ // Simulate Stripe API checkout call
 │                         │ setTimeout(1200ms)
 │                         │
 │                         │ ⚠️ No Stripe.js. No confirmCardPayment.
 │                         │ ⚠️ client_secret from the booking response
 │                         │    is never used.
 │                         │ ⚠️ The three card fields are never transmitted.
 │                         │
 │                         │ onPaymentSuccess(
 │                         │   booking.stripe_payment_intent_id
 │                         │   || `pi_mock_${booking.id}` )
 │                         │        │
 │                         │        │ POST /portal/payment/verify
 │                         │        │ { payment_intent_id, booking_id }
 │                         │        │──────────────────▶│
 │                         │        │                   │ SELECT * FROM
 │                         │        │                   │ service_bookings
 │                         │        │                   │ WHERE id = $1
 │                         │        │                   │
 │                         │        │                   │ ⚠️ NO Stripe API call
 │                         │        │                   │ ⚠️ NO ownership check
 │                         │        │                   │
 │                         │        │                   │ otp = generateOtp()
 │                         │        │                   │
 │                         │        │                   │ UPDATE service_bookings
 │                         │        │                   │ SET is_paid = true,
 │                         │        │                   │     otp = <NEW otp>
 │                         │        │                   │──────────────────▶│
 │                         │        │◀─ {message,       │
 │                         │        │    booking_id,    │
 │                         │        │    otp} ──────────│
 │                         │        │
 │                         │        └─▶ navigate(`/bookings/${id}`)
 │                         │
 │                         │ onClose()  ← ⚠️ ALSO navigates
 │◀────────────────────────│            → two navigations per payment
```

### Three defects in this flow

**1. Payment can be forged.** `payment/verify` sets `is_paid = true` after looking up the booking by ID. It never asks Stripe whether the intent succeeded, and never checks that the booking belongs to the caller. One request marks any booking paid.

**2. Paying silently invalidates the OTP.** The handler regenerates `otp` as a side effect. A customer who noted their code at booking time finds it no longer works after paying. The new code is returned in the response, but no screen draws attention to the change.

**3. Double navigation.** `handlePay` calls `onPaymentSuccess` (which navigates) and then `onClose` (which also navigates). If `createdBooking` is null, the second lands on `/bookings/undefined`.

### The unused second payment path

`POST /portal/bookings/:id/pay` exists server-side and does more than the one in use — it recomputes the total, rejects already-paid bookings, creates or refreshes a PaymentIntent, and returns `{ stripe, amount }`. **No frontend page calls it.** It is the better foundation for a real integration.

### What a correct implementation looks like

```
Client                        Stripe                       Backend
  │ POST /portal/book-service ──────────────────────────────▶│
  │◀───────────── { client_secret } ─────────────────────────│
  │
  │ Stripe Elements collects real card details
  │ stripe.confirmCardPayment(client_secret) ──▶│
  │◀────────── { paymentIntent.status } ────────│
  │
  │ POST /portal/payment/verify { payment_intent_id } ──────▶│
  │                                                          │ paymentIntents
  │                                                          │   .retrieve(id) ──▶ Stripe
  │                                                          │◀── status ─────────
  │                                                          │ if 'succeeded'
  │                                                          │   → is_paid = true
  │                                                          │ else → 400
  │◀─────────────────────────────────────────────────────────│
  │
  │ (independently) Stripe webhook payment_intent.succeeded ▶│
  │                                                          │ → is_paid = true
  │                                                            (survives a closed tab)
```

---

## Flow 6 — Workshop processes a job

```
WORKSHOP STAFF          FRONTEND                 API                      DATABASE
 │
 │ /shop/dashboard
 │──────────────────────▶│ GET /shop/dashboard
 │                       │───────────────────────▶│
 │                       │                        │ getShopProfile(req.user.id)
 │                       │                        │ SELECT * FROM admin_profiles
 │                       │                        │ WHERE user_id = $1
 │                       │                        │
 │                       │                        │ SELECT * FROM service_bookings
 │                       │                        │ WHERE shop_id = <shop.id>
 │                       │                        │ SELECT * FROM towing_requests
 │                       │                        │ WHERE shop_id = <shop.id>
 │                       │                        │
 │                       │                        │ Compute in JS:
 │                       │                        │   total_service, total_towing,
 │                       │                        │   total_customer, pending_order,
 │                       │                        │   recent_bookings (5),
 │                       │                        │   recent_towing (5)
 │                       │◀── {shop, stats} ──────│
 │◀── dashboard ─────────│
 │
 │ Changes a booking's
 │ status dropdown
 │ pending → processing
 │──────────────────────▶│ PUT /shop/service-orders/:id
 │                       │ { status: 'processing' }
 │                       │───────────────────────▶│
 │                       │                        │ SELECT * FROM service_bookings
 │                       │                        │ WHERE id = $1   ← reads current
 │                       │                        │ 404 if not found
 │                       │                        │
 │                       │                        │ UPDATE with per-field fallback:
 │                       │                        │   status !== undefined
 │                       │                        │     ? status : current.status
 │                       │                        │   customer_name !== undefined
 │                       │                        │     ? ... : current.customer_name
 │                       │                        │   ... same for phone, email,
 │                       │                        │       vehicle_info, is_paid
 │                       │                        │──────────────────────▶│
 │                       │◀── {message} ──────────│
 │                       │ refetch dashboard
 │◀── updated ───────────│
```

The `!== undefined` fallback pattern is what lets one endpoint serve both a `{status}`-only dropdown change and a full modal save. **Follow this pattern in new code.**

### ⚠️ The towing equivalent is broken

`PUT /api/shop/towing-orders/:id` has no fallback logic:

```js
// backend/routes/shop.js — the towing handler
const { status, full_name, phone_number, vehicle_details, pickup_address } = req.body;
await db.query(
    `UPDATE towing_requests
     SET status = $1, full_name = $2, phone_number = $3,
         vehicle_details = $4, pickup_address = $5
     WHERE id = $6`,
    [status, full_name, phone_number, vehicle_details, pickup_address, req.params.id]
);
```

Both callers (`ShopDashboard` and `ShopTowingOrders`) send only `{ status }`. The other four arrive as `undefined` and are written as `NULL`:

```
BEFORE                                    AFTER changing status to 'processing'
  status: 'pending'                         status: 'processing'      ✓
  full_name: 'John Doe'                     full_name: NULL           ✗
  phone_number: '9876543210'                phone_number: NULL        ✗
  vehicle_details: 'Honda City (2022)'      vehicle_details: NULL     ✗
  pickup_address: 'SG Highway, Ahmedabad'   pickup_address: NULL      ✗
  latitude/longitude                        (preserved — not in the UPDATE)
```

**Dispatching a tow destroys the customer's name, phone number and pickup address.** The workshop then has GPS coordinates and nothing else, and no UI exists to restore the fields. This is the highest-severity bug in the codebase.

**The fix** — mirror the service-order handler:

```js
const currentRes = await db.query('SELECT * FROM towing_requests WHERE id = $1', [req.params.id]);
if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Towing request not found' });
const current = currentRes.rows[0];

await db.query(
    `UPDATE towing_requests
     SET status = $1, full_name = $2, phone_number = $3,
         vehicle_details = $4, pickup_address = $5
     WHERE id = $6`,
    [
        status !== undefined ? status : current.status,
        full_name !== undefined ? full_name : current.full_name,
        phone_number !== undefined ? phone_number : current.phone_number,
        vehicle_details !== undefined ? vehicle_details : current.vehicle_details,
        pickup_address !== undefined ? pickup_address : current.pickup_address,
        req.params.id
    ]
);
```

---

## Flow 7 — OTP handover

The intended design and the built behaviour differ, so both are shown.

### As intended

```
Work completes
      │
      ▼
Customer arrives to collect the vehicle
      │
      │ Customer reads their 6-digit code aloud
      ▼
Mechanic enters it into the workshop portal
      │
      ▼
Server compares → match → status = 'completed', otp_verified = true
      │
      ▼
Audit trail: the vehicle demonstrably changed hands
```

### As built

```
CLIENT                  FRONTEND                 API                      DATABASE
 │
 │ Opens /bookings/5
 │──────────────────────▶│ GET /portal/bookings/5
 │                       │───────────────────────▶│ SELECT sb.*, shop fields
 │                       │                        │ WHERE sb.id = $1
 │                       │                        │ ⚠️ no user_id check
 │                       │                        │ SELECT linked services
 │                       │                        │ total_cost = Σ prices
 │                       │◀── {booking} ──────────│   (OTP included in payload)
 │                       │
 │◀── OTP shown in a ────│
 │    large hero panel   │
 │    "784920"           │
 │
 │ Clicks "Verify Completion OTP"
 │──────────────────────▶│ OtpModal opens
 │                       │ ⚠️ displays currentOtp in mono type
 │                       │    directly ABOVE the input box
 │
 │ Types the code they
 │ are already looking at
 │──────────────────────▶│ Client check: length === 6
 │                       │ (not "is numeric" — 'abcdef' passes)
 │                       │
 │                       │ POST /portal/bookings/5/verify-otp
 │                       │ { otp: '784920' }
 │                       │───────────────────────▶│ SELECT otp FROM
 │                       │                        │ service_bookings WHERE id=$1
 │                       │                        │ ⚠️ no ownership check
 │                       │                        │
 │                       │                        │ if stored === submitted:
 │                       │                        │   UPDATE SET
 │                       │                        │     otp_verified = true,
 │                       │                        │     status = 'completed'
 │                       │                        │──────────────────────▶│
 │                       │                        │ else 400 "Incorrect OTP"
 │                       │◀── {message} ──────────│
 │◀── "Completed" ───────│
```

### Why this does not work as a handover proof

| Requirement | Status |
|---|---|
| Only the customer knows the code | ❌ Shown to the customer *and* readable by the workshop as a `<code>` chip |
| Only the workshop can consume it | ❌ Only the client has a verify endpoint and button |
| Consuming it requires physical presence | ❌ Verifiable from anywhere |
| Cannot be replayed or brute-forced | ❌ No expiry, no attempt limit, no rate limit |
| Only valid at the right point in the lifecycle | ❌ Works from `pending` and even `cancelled` |
| Only the record owner can use it | ❌ No ownership check + sequential IDs = any job completable |

Where the OTP is exposed to the client: `ClientDashboard` row chip · `ClientServiceOrders` row chip · `ClientTowingOrders` row chip · `BookingDetailPage` / `TowingDetailPage` hero panel · inside `OtpModal` itself.

### How to fix it

1. Remove the OTP from every client-facing response and screen. The client sees it once, at creation, and nowhere after.
2. Add `POST /api/shop/service-orders/:id/verify-otp` behind `requireStaff`, scoped by `shop_id`.
3. Add the entry field to the workshop job queue, not the client portal.
4. Gate verification on `status === 'processing'`.
5. Add expiry (e.g. 24h from `processing`), an attempt counter, and rate limiting.
6. Add ownership checks to every client-facing detail endpoint regardless.

---

## Flow 8 — Cancellation

```
CLIENT                  FRONTEND                 API                      DATABASE
 │
 │ On /bookings/5, clicks Cancel
 │ (button renders only when
 │  status ∈ ['pending','confirmed'])
 │──────────────────────▶│ window.confirm(...)
 │                       │
 │                       │ DELETE /portal/bookings/5
 │                       │───────────────────────▶│ UPDATE service_bookings
 │                       │                        │ SET status = 'cancelled'
 │                       │                        │ WHERE id = $1
 │                       │                        │ ⚠️ soft delete
 │                       │                        │ ⚠️ no ownership check
 │                       │                        │ ⚠️ no status precondition
 │                       │◀── {message} ──────────│
 │                       │ refetch
 │◀── "Cancelled" ───────│
```

`DELETE` is a soft cancel everywhere in `/api/portal/*` — it sets `status = 'cancelled'` and nothing is removed. Only super admin `DELETE` endpoints do hard deletes.

**Inconsistency to be aware of:** the cancel button appears for different statuses depending on the entity.

| Entity | Button shown when status is | Consequence |
|---|---|---|
| Booking | `pending`, `confirmed` | A `processing` booking cannot be cancelled by the client at all |
| Towing | `pending`, `processing` | A `confirmed` towing job cannot be cancelled — but towing never reaches `confirmed`, so this is harmless |

The gating is UI-only. The endpoint accepts a cancel from any status, including `completed`.

---

## Flow 9 — Emergency towing

### GPS capture

```
USER                  RequestTowingPage                      Browser
 │
 │ Opens /towing-request
 │ Clicks "Use My Current GPS Location"
 │────────────────────────▶│
 │                         │ setLocationLoading(true)
 │                         │ navigator.geolocation.getCurrentPosition(
 │                         │   success, error,
 │                         │   { enableHighAccuracy: true, timeout: 10000 })
 │                         │──────────────────────────────────▶│
 │                         │                                   │ Browser prompts
 │                         │                                   │ for permission
 │                         │
 │                         │  ┌── SUCCESS ─────────────────────┤
 │                         │  │  latitude:  coords.lat.toFixed(6)
 │                         │  │  longitude: coords.lng.toFixed(6)
 │                         │  │  gpsSuccess = true
 │                         │  │
 │                         │  └── ERROR (denied / timeout / insecure origin)
 │                         │     ⚠️ latitude:  '23.022500'   ← HARDCODED
 │                         │     ⚠️ longitude: '72.571400'   ← Ahmedabad
 │                         │     ⚠️ gpsSuccess = true         ← claims success
 │
 │◀── Green banner: "GPS location locked: [23.022500, 72.571400]"
 │    Indistinguishable from a real fix.
```

**This is a serious defect.** A stranded driver in another city who denies the permission prompt — or is on an HTTP origin where geolocation is blocked — gets a confident green confirmation showing coordinates in Ahmedabad. A tow truck would be dispatched to an address they never entered, and neither the driver nor the workshop would have any signal that the fix failed.

**The fix:** on error, leave the coordinate fields empty, show an amber warning ("Could not get your location — please enter your address precisely"), and do not set `gpsSuccess`. Fail loudly.

### Submission

```
FRONTEND                          API                              DATABASE
   │
   │ POST /portal/towing
   │ { full_name, phone_number, vehicle_details,
   │   pickup_address, latitude, longitude }
   │────────────────────────────────▶│
   │                                 │ Validate: full_name, phone_number,
   │                                 │ vehicle_details, pickup_address
   │                                 │ → else 400
   │                                 │ (latitude / longitude optional,
   │                                 │  no numeric or range validation)
   │                                 │
   │                                 │ SELECT select_shop_id
   │                                 │ FROM select_shops WHERE user_id = $1
   │                                 │
   │                                 │ otp = generateOtp()
   │                                 │
   │                                 │ INSERT INTO towing_requests
   │                                 │   status = 'pending'
   │                                 │   otp_verified = false
   │                                 │ RETURNING *
   │                                 │──────────────────────────────▶│
   │◀── 201 {message, towing, otp} ──│
   │
   │ navigate(`/towing/${towing.id}`)
```

Lat/lng are sent as **strings** (`.toFixed(6)` output) into `DECIMAL(10,6)` columns. Postgres coerces them, but the manual entry fields accept any text with no validation.

### Dispatch and completion

```
Client submits          →  status = 'pending'      "Looking for Driver"
                                  │
Workshop sees it on /shop/towing-orders
  - phone as a tel: click-to-call link
  - pickup address (truncated) + "View GPS Map" →
    https://www.google.com/maps?q=<lat>,<lng>
  - OTP as a read-only chip
                                  │
Workshop sets dropdown  →  status = 'processing'   "Driver En Route"
                                  │
                            ⚠️ AND NULLS four columns — see Flow 6
                                  │
Client enters OTP       →  status = 'completed'
POST /portal/towing/:id/verify-otp
```

**What towing does not have, compared to bookings:** no price, no `is_paid`, no payment method, no catalog items, no scheduling, no shop-side detail or edit view (so once fields are nulled there is no way to restore them through the UI), and no embedded map — only an external Google Maps link.

---

## Flow 10 — Catalog management

```
WORKSHOP STAFF          FRONTEND                 API                      DATABASE
 │
 │ /shop/profile
 │──────────────────────▶│ GET /shop/profile
 │                       │───────────────────────▶│ getShopProfile(user.id)
 │                       │                        │ SELECT * FROM
 │                       │                        │ service_offerings
 │                       │                        │ WHERE shop_id = $1
 │                       │                        │ (includes inactive)
 │                       │◀── {shop, services} ───│
 │◀── profile form + ────│
 │    catalog table      │
 │
 │ ─── ADD ───────────────────────────────────────────────────────────────
 │ Clicks "Add Service"  │ editingServiceId = null
 │ Fills the modal       │ serviceForm = { title, description,
 │                       │   icon_class, price_starts_at, is_active }
 │──────────────────────▶│ POST /shop/services
 │                       │───────────────────────▶│ Validate title,
 │                       │                        │ description, price → 400
 │                       │                        │ INSERT INTO
 │                       │                        │ service_offerings
 │                       │                        │ (shop_id from token)
 │                       │◀── 201 {service} ──────│
 │
 │ ─── EDIT ──────────────────────────────────────────────────────────────
 │ Clicks the edit icon  │ editingServiceId = id
 │                       │ serviceForm prefilled from the row
 │──────────────────────▶│ PUT /shop/services/:id
 │                       │───────────────────────▶│ UPDATE service_offerings
 │                       │                        │ SET all five fields
 │                       │                        │ ⚠️ no shop_id in WHERE
 │
 │ ─── DELETE ────────────────────────────────────────────────────────────
 │ Clicks the delete icon│ window.confirm(...)
 │──────────────────────▶│ DELETE /shop/services/:id
 │                       │───────────────────────▶│ DELETE FROM
 │                       │                        │ service_offerings
 │                       │                        │ WHERE id = $1
 │                       │                        │ ⚠️ HARD delete
 │                       │                        │ ⚠️ no shop_id in WHERE
 │                       │                        │    │
 │                       │                        │    └─ CASCADE removes
 │                       │                        │       service_booking_items
 │                       │                        │       rows → historical
 │                       │                        │       bookings lose line
 │                       │                        │       items and totals drop
```

### Three issues in this flow

**1. Deleting a catalog item rewrites history.** `service_booking_items` has `ON DELETE CASCADE` on `service_id`. Removing an oil-change service silently strips it from every past booking that included it, and because totals are computed on read, those bookings' invoice amounts drop.

**The fix:** never hard-delete. Set `is_active = false` instead — the UI already supports the flag, and the client catalog already filters on it. Change the delete button to a "Retire" toggle.

**2. Update and delete do not scope by workshop.** Neither statement includes `shop_id` in its `WHERE` clause. Any authenticated staff user can modify or delete another workshop's catalog item by ID. This is a genuine cross-tenant hole — worse than the client-side IDOR, because it breaches the tenant boundary the whole architecture rests on.

**The fix:** `WHERE id = $N AND shop_id = $N+1` using the shop derived from the token.

**3. Icons come from a hardcoded whitelist.** The modal offers eight Font Awesome classes as `<option>` values. Editing a service whose stored `icon_class` is outside that list finds no matching option, so the `<select>` renders index 0 and saving silently rewrites the icon.

---

## Flow 11 — Contact message

```
CLIENT                  FRONTEND                 API                      DATABASE
 │
 │ /contact — fills name,
 │ email, subject, message
 │──────────────────────▶│ POST /portal/contact
 │                       │───────────────────────▶│ ⚠️ requireAuth
 │                       │                        │    (page is public)
 │                       │                        │ Validate all four → 400
 │                       │                        │ SELECT select_shop_id
 │                       │                        │ FROM select_shops
 │                       │                        │ INSERT INTO
 │                       │                        │ contact_messages
 │                       │                        │ (is_read = false)
 │                       │◀── 201 ────────────────│
 │◀── success banner ────│  (clears subject +
 │                          message only)

WORKSHOP STAFF
 │ /shop/messages
 │──────────────────────▶│ GET /shop/messages
 │                       │───────────────────────▶│ SELECT * FROM
 │                       │                        │ contact_messages
 │                       │                        │ WHERE shop_id = $1
 │                       │                        │ + stats: total_message,
 │                       │                        │   read_message,
 │                       │                        │   not_read_message,
 │                       │                        │   read_percentage
 │                       │◀── {messages, stats} ──│
 │                       │
 │                       │ ⚠️ reads res.data.unread_count
 │                       │    → always undefined → badge never shows
 │
 │ Clicks a message      │ PUT /shop/messages/:id/read
 │──────────────────────▶│───────────────────────▶│ ⚠️ 404 — route does
 │                       │                        │    not exist
 │                       │◀── 404 ────────────────│
 │                       │ console.error, no user feedback
 │
 │ Clicks delete         │ DELETE /shop/messages/:id
 │──────────────────────▶│───────────────────────▶│ ⚠️ 404 — no handler
 │                       │◀── 404 ────────────────│
 │◀── alert('Failed') ───│
```

### The inbox is the most broken screen in the app

Three of its behaviours fail:

| Action | Frontend calls | Backend has | Result |
|---|---|---|---|
| Mark read | `PUT /shop/messages/:id/read` | `PUT /shop/messages/:id` with `{is_read}` | 404, never marks read |
| Delete | `DELETE /shop/messages/:id` | *(nothing)* | 404, always fails |
| Unread badge | reads `unread_count` | sends `stats.not_read_message` | Always 0, badge hidden |

**Fixes:**

```js
// mark read — use the existing route with a body
await api.put(`/shop/messages/${msg.id}`, { is_read: true })

// unread badge — read the correct key
setUnreadCount(res.data.stats?.not_read_message || 0)

// delete — add the missing backend route
router.delete('/messages/:id', requireStaff, async (req, res) => {
    const shop = await getShopProfile(req.user.id);
    await db.query(
        'DELETE FROM contact_messages WHERE id = $1 AND shop_id = $2',
        [req.params.id, shop.id]
    );
    res.json({ message: 'Message deleted' });
});
```

Note that `GET /shop/messages/:id` already sets `is_read = true` as a side effect, so opening a message *would* mark it read — except the page never calls that endpoint.

**Also:** `/contact` is a public route but `POST /portal/contact` requires auth, so a logged-out visitor's submission always fails. The error copy — *"Please ensure you are logged in"* — reads as though this were intended rather than a mismatch.

---

## Flow 12 — Workshop onboarding

```
PLATFORM ADMIN          FRONTEND                 API                      DATABASE
 │
 │ /admin/add-provider
 │ Fills two sections:
 │   Business: shop_name, full_name,
 │             phone_number, city, shop_address
 │   Portal login: username, email, password
 │──────────────────────▶│
 │                       │ POST /admin/providers        ⚠️ WRONG PATH
 │                       │───────────────────────▶│
 │                       │                        │ Express has no
 │                       │                        │ POST /providers handler
 │                       │                        │ (only POST /add-provider
 │                       │                        │  and DELETE /providers/:id)
 │                       │◀── 404 (HTML body) ────│
 │                       │
 │                       │ err.response.data.error is undefined
 │◀── "Failed to ────────│ → generic fallback message
 │     register workshop  │
 │     provider."         │
 │
 │ Onboarding never succeeds.
```

**The fix is one line** in `SuperAdminAddProviderPage.jsx`:

```js
await api.post('/admin/add-provider', formData);
```

### What the correct call would do

```
POST /admin/add-provider  { username, email, password, full_name,
                            shop_name, phone_number, city, shop_address }
      │
      │ Validate username, email, password, shop_name → else 400
      │
      │ SELECT id FROM users WHERE username=$1 OR email=$2
      │   exists → 400 "Username or email already exists"
      │
      │ bcrypt.hash(password, 10)
      │
      │ INSERT INTO users (is_staff = true, is_superuser = false)
      │   first_name = full_name, last_name = ''
      │ RETURNING id
      │
      │ INSERT INTO admin_profiles (user_id, full_name, shop_name,
      │                             phone_number, city, shop_address)
      │ RETURNING *
      │
      └── 201 { message, provider }
```

Two rows, two tables, one atomic-in-spirit operation — though **not wrapped in a transaction**, so a failure on the second insert leaves an orphaned staff user with no workshop profile. Every `/api/shop/*` endpoint would then return "Shop profile not found" for that account.

### ⚠️ Deleting a provider deletes the wrong user

```
GET /admin/providers  →  SELECT ap.*, u.username, u.email
                         FROM admin_profiles ap JOIN users u ...
                         │
                         └── so p.id is admin_profiles.id

Frontend: handleDelete(p.id)  →  DELETE /admin/providers/{admin_profiles.id}
                                              │
Backend:  DELETE FROM users WHERE id = $1     │
                    │                          │
                    └── treats it as users.id ─┘   ← MISMATCH
```

The two ID sequences diverge as soon as any non-workshop user exists. In the seeded database:

```
users:            1 superadmin
                  2 autocare_main    (staff)
                  3 elite_motors     (staff)
                  4 john_doe         (client)

admin_profiles:   1 → user 2  (AutoFusion Main Hub)
                  2 → user 3  (Elite Motors & Towing)
```

Deleting *Elite Motors & Towing* (`admin_profiles.id = 2`) issues `DELETE FROM users WHERE id = 2` — which removes **`autocare_main`**, the *other* workshop, cascading its profile, catalog, bookings and towing jobs. Elite Motors survives untouched.

Delete `admin_profiles.id = 1` and you remove `elite_motors`. In a database where a client happens to occupy the matching ID, you delete a customer and all their history. If the ID matches the super admin, you delete your own account.

The handler also returns 200 regardless of whether any row matched, so there is no signal that anything went wrong.

**The fix** — pass the right ID:

```js
// SuperAdminProvidersPage.jsx
onClick={() => handleDelete(p.user_id, p.shop_name)}
```

and defensively, in the backend, delete by joining through the profile so a stale ID cannot destroy an arbitrary account.

---

## Data lifecycle summary

How a booking's fields change across its life:

```
        status      otp_verified   is_paid   stripe_payment_intent_id
        ─────────────────────────────────────────────────────────────
CREATE  pending     false          false     pi_xxx (online) | null (cash)
   │
   ├─ workshop confirms
   │    confirmed   false          false     unchanged
   │
   ├─ client pays        ⚠️ OTP is REGENERATED here
   │    unchanged    false         true      unchanged
   │
   ├─ workshop starts work
   │    processing   false         unchanged unchanged
   │
   ├─ client enters OTP
   │    completed    true          unchanged unchanged
   │
   └─ or cancelled at any point
        cancelled    unchanged     unchanged unchanged
```

And a towing job:

```
        status      otp_verified   customer fields
        ─────────────────────────────────────────────────────────
CREATE  pending     false          full_name, phone, vehicle, address
   │
   ├─ workshop dispatches
   │    processing   false         ⚠️ ALL FOUR SET TO NULL
   │
   ├─ client enters OTP
   │    completed    true          (already lost)
   │
   └─ or cancelled
        cancelled    unchanged     unchanged
```

### Which mutations are reversible

| Operation | Reversible? | Notes |
|---|---|---|
| Status change | Yes | Any status → any status, no state machine |
| Client cancel | Yes, by a workshop | Soft delete; a workshop can set it back |
| Mark paid | Yes, by a workshop | Checkbox in the edit modal |
| OTP verify | **No** | Sets `completed`; only a manual status change undoes it, and `otp_verified` stays true |
| Payment verify | **No** | Also overwrites the OTP irrecoverably |
| Catalog delete | **No** | Hard delete, cascades to booking line items |
| Admin delete booking/towing | **No** | Hard delete |
| Admin delete provider | **No** | Hard delete, cascades — and currently targets the wrong row |
| Towing status change | **No** | Four columns nulled with no recovery path |

---

**Next:** [04 — Client Guide](./04-user-guide-client.md) for the user-facing walkthrough, or [07 — Feature Catalog](./07-features.md) for per-feature build status.
