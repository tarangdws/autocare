[← Back to index](./README.md)

# 07 — Feature Catalog

Complete inventory of what has been built, with an honest status on each. Every entry was verified by reading both the frontend caller and the backend handler.

## Status legend

| Badge | Meaning |
|---|---|
| ✅ **Working** | Functions as intended |
| 🟡 **Partial** | Works, but with a significant caveat or gap |
| 🔴 **Broken** | Does not work — usually a frontend/backend contract mismatch |
| ⚫ **Not built** | Absent by design or not yet started |

## Summary

| Area | ✅ Working | 🟡 Partial | 🔴 Broken |
|---|---|---|---|
| Authentication & accounts | 4 | 1 | 1 |
| Client portal | 8 | 4 | 1 |
| Workshop portal | 6 | 4 | 3 |
| Platform admin portal | 2 | 1 | 3 |
| Payments | 1 | 1 | 2 |
| Public surface | 4 | 1 | 2 |
| **Total** | **25** | **12** | **12** |

The core skeleton is sound. Most failures are one-line contract mismatches rather than architectural problems — the frontend calls a path or reads a key that does not match what the backend provides.

---

## Authentication & accounts

### ✅ Client self-registration
`POST /api/auth/signup` · `/signup`

Username, email, password, optional name. Bcrypt cost 10. Uniqueness enforced on both username and email. Returns a 7-day JWT and auto-creates a `select_shops` row pointing at the lowest-ID workshop, so a new account always has a catalog.

*Gaps:* no email verification, no password strength rule, no confirm-password field.

### ✅ Login
`POST /api/auth/login` · `/login`

Username + password, bcrypt comparison, 7-day JWT. Role-based redirect after success. Password visibility toggle.

### ✅ Session persistence
`AuthContext` + `localStorage`

Token survives reloads. `GET /api/auth/me` hydrates the user and a role-dependent profile on every mount.

### ✅ Role-based access control
`middleware/auth.js` + `ProtectedRoute`

Three tiers enforced server-side (`requireAuth`, `requireStaff`, `requireSuperAdmin`) and mirrored client-side. Server enforcement is the real boundary and it holds.

*Note:* `requireStaff` intentionally admits super admins. Client-tier routes admit any authenticated user, so staff can open client pages — likely unintended widening.

### 🟡 Session expiry handling

Tokens expire after 7 days, but there is **no axios response interceptor**. A 401 on any endpoint other than `/auth/me` is caught locally and usually only `console.error`d, so the user sees blank pages with no explanation.

*Fix:* add a response interceptor that calls `logout()` on 401. Small change, high value.

### 🔴 Password reset
`POST /api/auth/forget-password` · `/forget-password`

```js
router.post('/forget-password', (req, res) => {
    res.json({ message: 'Password reset link sent to your registered email.' });
});
```

A stub. No email is sent, no token is generated, no database row is written. The UI shows a success message either way.

*To build:* a reset-token table with expiry, an email transport, a token-consuming reset page, and rate limiting on the request endpoint.

---

## Client portal

### ✅ Client dashboard
`GET /api/client/dashboard` · `/dashboard`

Four summary cards, two recent-activity tables (3 rows each), OTP buttons per row, shortcut CTAs.

*Two cosmetic bugs:* a card labelled "Completed Services" binds the total booking count; and empty-state guards use `?.length === 0`, so a failed fetch renders a headers-only table instead of the empty state.

### ✅ Profile & workshop selection
`GET/POST /api/client/profile` · `POST /api/client/select-shop` · `/profile`

Edit name and email; choose a preferred workshop from a dropdown of all workshops, with a detail panel for the current choice. Calls `refreshUser()` after saving.

*Two gaps:* the selection cannot be cleared (the blank option silently no-ops while showing success), and the two saves are not transactional.

### 🟡 Service catalog browsing
`GET /api/portal/services` · `/services-info`

Card grid of active services with icon, title, description and ₹ price, plus deep links into the booking form. Correctly filters `is_active = true`.

*The caveat:* `/services-info` is a **public route** but the endpoint requires auth. A logged-out visitor gets a 401 that is only `console.error`d, so the page renders empty with hardcoded placeholder workshop details. Since the navbar advertises this page to guests, it is the default guest path.

### 🟡 Service booking
`POST /api/portal/book-service` · `/book-service`

Multi-service selection with a live total, customer details prefilled from the account, date/time, notes, cash-or-online choice. Server generates the OTP, inserts line items, sums the total, and creates a Stripe PaymentIntent for online payments.

*Caveats:*
- **No transaction** — booking row and line items insert separately; a mid-loop failure leaves a partial booking.
- **No date validation** — past dates are accepted.
- **No capacity model** — any date and time is accepted regardless of workshop availability.
- Cannot deselect the last service, which makes the zero-selection validation dead code.
- Total is computed but never stored (see [Order totals](#-order-totals-recomputed-on-every-read)).

### ✅ Service order list
`GET /api/client/service-orders` · `/service-orders`

All bookings with aggregated service line items via a `json_agg` query, plus six status filter tabs with server-computed counts.

*Note:* counts come from the server but row filtering is client-side. No search or pagination.

### 🟡 Booking detail
`GET /api/portal/bookings/:id` · `/bookings/:id`

OTP panel, workshop contact details, vehicle and schedule, payment card, per-service invoice table with total, cancel and pay actions.

*Caveats:*
- **No ownership check on the endpoint** — see [IDOR](#-no-ownership-checks-idor).
- The **Verify OTP button renders for every status except completed**, including `cancelled` and `pending`.
- The **Pay button renders for any unpaid booking**, including cancelled ones.
- `handleCancel` and `handleVerifyOtp` have no try/catch — a failure produces an unhandled rejection and no user feedback.

### ✅ Towing request
`POST /api/portal/towing` · `/towing-request`

Contact details, vehicle description, pickup address, browser geolocation capture with manual coordinate fallback. Server generates the OTP.

*Its one serious bug is separate — see [GPS fallback](#-gps-failure-substitutes-hardcoded-coordinates).*

### ✅ Towing order list
`GET /api/client/towing-orders` · `/towing-orders`

Five filter tabs with client-friendly labels ("Looking for Driver", "Driver En Route"), truncated pickup addresses, OTP buttons.

### 🟡 Towing detail
`GET /api/portal/towing/:id` · `/towing/:id`

OTP panel, contact and vehicle details, location card with a Google Maps deep link, dispatch workshop info, cancel and verify actions.

*Caveats:* same missing ownership check and same ungated verify button as booking detail. Also **no payment path at all** — towing is free in the system.

### ✅ Cancellation
`DELETE /api/portal/bookings/:id` · `DELETE /api/portal/towing/:id`

Soft cancel — sets `status = 'cancelled'`, nothing is removed. Records stay visible under the Cancelled filter.

*Note:* the UI gates the button on status but the endpoint accepts a cancel from any status, including `completed`. The two entity types also use inconsistent windows (bookings: `pending`/`confirmed`; towing: `pending`/`processing`), so a `processing` booking cannot be cancelled from the app at all.

### 🔴 Live tracking

Multiple screens promise "real-time workshop milestones" and "track live towing drivers". **There is no polling, WebSocket, SSE or push anywhere in the codebase.** Every page fetches once in `useEffect(..., [])`. The user must reload.

*To build:* polling on the detail pages is the cheapest option; WebSockets or SSE for genuine live updates.

---

## Workshop portal

### 🟡 Workshop dashboard
`GET /api/shop/dashboard` · `/shop/dashboard`

Header with workshop details, four metric cards, two recent-job tables (5 rows) with **inline status dropdowns**, OTP code chips.

*Caveats:*
- The **towing dropdown on this page triggers data loss** — see [Towing status handler](#-towing-status-change-nulls-four-columns).
- "Total Jobs Logged" is labelled with a customer icon but binds `bookings + towing`.
- Same `?.length === 0` empty-state bug as the client dashboard.
- Failures surface as `alert()` and the dropdown is not rolled back, so the wrong value stays on screen until reload.

### ✅ Workshop profile
`GET/PUT /api/shop/profile` · `/shop/profile`

Edit business name, manager, phone, city, address. Creates the profile row if missing. Changes appear immediately to customers.

### 🟡 Catalog management
`POST/PUT/DELETE /api/shop/services` · `/shop/profile`

Full CRUD via a reused add/edit modal. Table shows icon, title, description, price and an Active/Disabled pill. Inactive items stay visible to staff and hidden from customers.

*Three real problems:*

**Hard delete cascades into history.** `service_booking_items` has `ON DELETE CASCADE` on `service_id`, so deleting a catalog item strips it from every past booking and drops those bookings' computed totals. *Fix:* replace delete with an `is_active = false` toggle.

**Update and delete do not scope by workshop.** Neither SQL statement includes `shop_id` in its `WHERE` clause, so any staff account can modify or delete another workshop's catalog item by ID. This breaches the tenant boundary. *Fix:* `WHERE id = $1 AND shop_id = $2`.

**Icon whitelist silently overwrites.** The modal offers eight Font Awesome classes. A service whose stored `icon_class` is outside that list finds no matching `<option>`, so the select renders index 0 and saving rewrites the icon.

Also: `price_starts_at` has no `min`, so negative prices are accepted end to end.

### 🟡 Service order queue
`GET/PUT /api/shop/service-orders` · `/shop/service-orders`

Filter tabs, customer and vehicle info, OTP chips with a Verified marker, payment pills, inline status dropdowns, and an edit modal for status, customer details and the paid flag.

The `PUT` handler uses the correct `field !== undefined ? field : current.field` pattern, letting one endpoint serve both dropdown changes and full modal saves. **This is the pattern to follow.**

*Caveats:*
- **No "Confirmed" tab** — the endpoint never computes `counts.confirmed`, so confirmed bookings appear only under All despite `confirmed` being a settable status.
- The modal **cannot edit date or time** — the two fields most needed for rescheduling.
- `customer_email` is in the form state and submitted but has no input in the modal.
- Staff can flip `is_paid` freely with no amount, ledger or audit trail.

### 🔴 Towing dispatch board
`GET/PUT /api/shop/towing-orders` · `/shop/towing-orders`

The read side works well: click-to-call phone links, truncated pickup addresses with Google Maps links, OTP chips, filter tabs.

**The write side is the most damaging bug in the codebase.** See [Towing status handler](#-towing-status-change-nulls-four-columns).

*Also missing:* no towing detail or edit view on the workshop side, so once fields are nulled there is no UI to restore them. No driver assignment, no ETA field, no shop-side OTP verification.

### 🔴 Message inbox
`GET /api/shop/messages` · `/shop/messages`

Three of four behaviours fail:

| Action | Frontend calls | Backend has | Result |
|---|---|---|---|
| List messages | `GET /shop/messages` | ✅ same | Works |
| Mark read | `PUT /shop/messages/:id/read` | `PUT /shop/messages/:id` + `{is_read}` | **404** |
| Delete | `DELETE /shop/messages/:id` | *(no handler)* | **404** |
| Unread badge | reads `unread_count` | sends `stats.not_read_message` | **Always 0** |

The inbox is effectively read-only and append-only, growing indefinitely with no triage.

*Fixes:*
```js
// mark read
await api.put(`/shop/messages/${msg.id}`, { is_read: true })
// unread count
setUnreadCount(res.data.stats?.not_read_message || 0)
// delete — add the backend route (scoped by shop_id)
```

Note `GET /shop/messages/:id` already marks a message read as a side effect, but nothing calls it.

### ✅ Blog authoring
`POST /api/portal/blogs` · `/blog`

Staff and admins get an Add Article button with an inline modal. Auto-generates a URL slug. Published articles are publicly visible.

*Gaps:* backend `PUT` and `DELETE` exist but **no UI calls them**, so posts cannot be edited or deleted after publishing. No rich text, no image upload (URL only), no detail page — full body renders in the card. Errors use `alert()` inconsistently with the rest of the app.

---

## Platform admin portal

### 🔴 Platform dashboard
`GET /api/admin/dashboard` · `/admin/dashboard`

Six of seven values read the wrong keys:

| Tile | Frontend reads | Backend sends | Displays |
|---|---|---|---|
| Workshops | `total_shops` | `total_provider` | 0 |
| Accounts | `total_users` | `total_user` | 0 |
| Bookings | `total_services` | `total_service` | 0 |
| Towing | `total_towing` | `total_towing` | ✅ |
| Revenue | `total_service_revenue` | *(not sent)* | ₹0 |
| Recent bookings | `recent_bookings` | `all_service` | empty |
| Recent towing | `recent_towing` | `all_towing` | empty |

Also: the backend loads **every** booking and towing row just to `.length` and `.slice(0, 6)` them — an unbounded scan per page load. And `service_provider` (offerings count) is computed but never consumed.

*Revenue needs more than a rename:* `service_bookings` has no amount column, so `total_service_revenue` cannot be computed at all.

### 🔴 Workshop onboarding
`POST /api/admin/add-provider` · `/admin/add-provider`

The form posts to `/admin/providers`, which has no `POST` handler — only `POST /add-provider` and `DELETE /providers/:id` exist. Every submission 404s and shows a generic error.

*Fix:* one line — `api.post('/admin/add-provider', formData)`.

The endpoint itself works, creating a staff user plus an `admin_profiles` row. *Not transactional* — a failure on the second insert orphans the user.

### 🔴 Workshop directory & delete
`GET/DELETE /api/admin/providers` · `/admin/providers`

The list works. **The delete button destroys the wrong account.**

The list renders `admin_profiles.id`; the handler runs `DELETE FROM users WHERE id = $1`. The sequences diverge as soon as any non-workshop user exists, so deleting workshop profile #2 can remove a different workshop, a customer and all their history, or the super admin's own account. The handler returns 200 regardless of whether a row matched.

*Fix:* pass `p.user_id`, and defensively join through the profile in the handler.

*Also missing:* no edit, no suspend/deactivate, no detail view, no password reset for a locked-out workshop.

### 🔴 Global booking registry
`GET/DELETE /api/admin/services` · `/admin/services`

Reads `res.data.bookings`; the server sends `{ services }`. The table permanently shows "No bookings matching criteria."

*Fix:* one word — `res.data.services`.

Delete works and is a hard delete.

### ✅ Global towing registry
`GET/DELETE /api/admin/towing` · `/admin/towing`

Works correctly — reads the right key. Filter tabs, GPS coordinates, OTP display, hard delete with confirmation. **The most reliable oversight surface today.**

### 🟡 City column across admin tables

Dashboard, services and towing pages all render `{b.city}` / `{t.city}`, but every admin query selects only `ap.shop_name` from the joined `admin_profiles`. The city sub-label is permanently blank.

*Fix:* add `ap.city` to the three joins.

### ⚫ Missing admin capabilities

No customer list or user management · no job status control · no job reassignment · no refunds · no data export · no audit log · no workshop impersonation · no second admin creation via UI · no pagination or search on any registry.

---

## Payments

### ✅ Stripe PaymentIntent creation (server)
`POST /api/portal/book-service` · `POST /api/portal/bookings/:id/pay`

Real Stripe SDK integration. Creates an INR PaymentIntent with `amount = round(total × 100)`, description and receipt email, and persists `stripe_payment_intent_id`.

### 🔴 Client-side payment
`components/StripePaymentModal.jsx`

Not a payment integration:

```js
const [cardNumber] = useState('4242 •••• •••• 4242');  // prefilled, never read
const [expDate]    = useState('12/28');
const [cvc]        = useState('123');

// Simulate Stripe API checkout call
setTimeout(async () => {
    await onPaymentSuccess(booking.stripe_payment_intent_id || `pi_mock_${booking.id}`);
}, 1200);
```

No Stripe.js, no Elements, no tokenization, no 3DS. The `client_secret` the backend returns is never used. The three card fields are never transmitted. It always succeeds.

*To fix:* install `@stripe/react-stripe-js`, mount Elements, call `stripe.confirmCardPayment(clientSecret)`.

### 🔴 Payment verification
`POST /api/portal/payment/verify`

```js
// no Stripe call anywhere in this handler
await db.query('UPDATE service_bookings SET is_paid = true, otp = $1 WHERE id = $2',
               [otp, booking.id]);
```

Never contacts Stripe. Never checks ownership. Sets `is_paid = true` on nothing but a `booking_id`. **Any authenticated user can mark any booking paid with one request.**

It also **regenerates the OTP** as a side effect, silently invalidating the code the customer noted at booking time.

*To fix:* `stripe.paymentIntents.retrieve(id)`, require `status === 'succeeded'`, add an ownership check, stop touching the OTP, and add a `payment_intent.succeeded` webhook.

### 🟡 Stripe error fallback

Both server-side payment paths catch Stripe errors and fabricate `pi_mock_<id>_<ts>`:

```js
} catch (stripeErr) {
    console.warn('Stripe initialization warning (fallback to mock mode):', stripeErr.message);
    stripeData = { client_secret: `mock_secret_...`, payment_intent_id: `pi_mock_...` };
}
```

A bad key, network failure or outage degrades into a fake-success path rather than an error. Convenient in development, dangerous in production.

### ⚫ Not built

Refunds · partial payments and deposits · payment history or ledger · invoice or receipt documents · payment for towing · multiple currencies (₹ is hardcoded throughout) · UPI, wallets or netbanking.

---

## Public surface

### ✅ Landing page
Hero, four feature cards, stats banner, role-aware CTA.

*Note:* stats (`100%`, `24/7`, `6-Digit`, `Instant`) are static placeholders, and a super admin's CTA points at `/shop/dashboard`.

### ✅ About page
Static marketing copy.

### 🔴 Contact form
`POST /api/portal/contact` · `/contact`

The form works for logged-in users, routing the message to their selected workshop. But `/contact` is a **public route** while the endpoint requires auth, so a logged-out visitor's submission always fails. The error copy — *"Please ensure you are logged in"* — reads as intended behaviour rather than a mismatch.

Also, `formData` is initialised from `user` in the `useState` initializer only. On a hard refresh `AuthContext` is still loading and `user` is null, so name and email never prefill.

*Fix:* make the endpoint's auth optional (matching a public page), and prefill in a `useEffect` keyed on `user`.

### ✅ Blog list
`GET /api/portal/blogs` · `/blog`

The one genuinely public endpoint on the portal router. Card grid with cover images, `onError` handling for broken images, formatted dates, empty state.

*Gaps:* full body renders untruncated in the card, there is no `/blog/:id` detail route, and `setPosts(res.data.posts)` lacks the `|| []` guard used everywhere else.

### 🟡 Service info page
Covered under [Service catalog browsing](#-service-catalog-browsing) — public route, authenticated endpoint.

### ✅ Login / signup / forgot-password pages
All render and submit correctly. *But:* the login page ships a hardcoded "Demo Accounts" panel with three working credential pairs including the super admin, not environment-gated.

### ⚫ Not built

No 404 page (unmatched routes redirect to `/`) · no mobile navigation (navbar is `hidden lg:flex` with no hamburger, so below `lg` there is no navigation at all) · no SEO metadata beyond the title · no sitemap or robots.txt · no cookie or privacy notice.

---

## Cross-cutting concerns

### ✅ Status badge component
`components/StatusBadge.jsx` — maps status strings to colour, icon and label. The one real design-system component.

*Note:* an unknown or `undefined` status renders an amber badge with an empty label.

### ✅ Role-aware navigation
`components/Navbar.jsx` — three mutually exclusive link sets by role.

*But:* `hidden lg:flex` with no mobile menu.

### 🟡 OTP handover verification

The mechanism exists end to end — generation, storage, comparison, status transition — but is structurally inverted.

| Requirement | Status |
|---|---|
| Only the customer knows the code | ❌ Shown to the customer in 5 places; readable by staff as a chip |
| Only the workshop can consume it | ❌ Only the client has an endpoint and button |
| Requires physical presence | ❌ Verifiable from anywhere |
| Resistant to replay/brute force | ❌ No expiry, attempt limit or rate limit |
| Valid only at the right lifecycle point | ❌ Works from `pending` and `cancelled` |
| Only the owner can use it | ❌ No ownership check + sequential IDs |

Client-side validation checks length only, so `"abcdef"` passes and reaches the server.

*To fix:* move verification to a `requireStaff` endpoint scoped by `shop_id`, remove the code from client responses, gate on `status === 'processing'`, and add expiry, attempt limits and rate limiting.

### 🔴 No ownership checks (IDOR)

`GET`, `PUT`, `DELETE` and `verify-otp` under `/api/portal/bookings/:id` and `/api/portal/towing/:id` verify only that *a* valid token is present:

```js
// current
'SELECT ... WHERE sb.id = $1', [bookingId]
// required
'SELECT ... WHERE sb.id = $1 AND sb.user_id = $2', [bookingId, req.user.id]
```

IDs are sequential integers. Any authenticated user can walk them to read, cancel or complete other people's jobs — and the `GET` response includes the OTP, which enables forced completion.

The same omission appears in workshop catalog update/delete, where it breaches the tenant boundary.

### 🔴 Towing status change nulls four columns

**The highest-severity bug in the codebase.**

```js
// backend/routes/shop.js — PUT /towing-orders/:id
const { status, full_name, phone_number, vehicle_details, pickup_address } = req.body;
await db.query(
    `UPDATE towing_requests
     SET status = $1, full_name = $2, phone_number = $3,
         vehicle_details = $4, pickup_address = $5
     WHERE id = $6`,
    [status, full_name, phone_number, vehicle_details, pickup_address, req.params.id]
);
```

Both callers send only `{ status }`. The other four arrive `undefined` and are written as `NULL`. **Dispatching a tow destroys the customer's name, phone, vehicle details and pickup address**, leaving only GPS coordinates — and there is no workshop-side towing detail view to restore them.

The sibling service-order handler has the correct `!== undefined` guards. *Fix:* mirror it — full code in [03 — Flows](./03-flows.md#-the-towing-equivalent-is-broken).

### 🔴 GPS failure substitutes hardcoded coordinates

```js
// RequestTowingPage.jsx — the geolocation error callback
// Fallback default coordinates if permission denied
latitude: '23.022500',
longitude: '72.571400',
gpsSuccess: true,        // ← claims success
```

On permission denial, timeout, or an insecure origin, the app silently writes fixed Ahmedabad coordinates and shows the same green "GPS location locked" confirmation as a real fix. A tow truck would be dispatched to an address the user never entered, with no signal to anyone that anything failed.

*Fix:* leave the fields empty, show an amber warning, do not set `gpsSuccess`. Fail loudly.

### 🟡 Order totals recomputed on every read

There is no `total_cost` column. Totals are summed from live `service_offerings.price_starts_at` on every read, in three separate places.

**A workshop raising a price retroactively changes the displayed total on every past booking that included that service — including paid ones.**

This is inconsistent with the (correct) decision to snapshot customer details onto the booking row.

*Fix:* add `total_cost` to `service_bookings` and a `price_at_booking` column to `service_booking_items`.

### 🔴 No transactions anywhere

Multi-step writes are unwrapped:

| Operation | Steps | Risk |
|---|---|---|
| Booking creation | 1 insert + N inserts + N selects | Booking with partial line items |
| Workshop onboarding | user insert + profile insert | Orphaned staff user, no workshop |
| Profile save | profile update + shop selection | One persists, the other fails |

`pg` supports `BEGIN`/`COMMIT`/`ROLLBACK` — none is used.

### 🟡 Error surfacing is inconsistent

Three different styles: inline banners (client pages, shop profile), `alert()` (all shop mutations, blog publish), and silent `console.error` (every initial fetch, mark-read). No list page has any error UI, so a 401 or 500 is indistinguishable from "no data".

### ⚫ Not built

No tests in either package · no request validation library · no structured logging · no rate limiting · no CSRF protection · no security headers (helmet) · no `.env.example` · no migration system · no CI · no accessible modal primitives (the two hand-rolled modals lack `role="dialog"`, focus trapping and Escape-to-close) · no database indexes on foreign keys.

---

## Fix priority

### P0 — data loss and security

| # | Item | Effort |
|---|---|---|
| 1 | Towing status handler nulls four columns | ~10 lines |
| 2 | Provider delete targets the wrong account | 1 line + defensive backend |
| 3 | Ownership checks on all `/api/portal/*/:id` handlers | ~10 queries |
| 4 | Workshop catalog update/delete missing `shop_id` scope | 2 queries |
| 5 | Payment verify must confirm with Stripe | ~15 lines |
| 6 | Remove demo credentials from the login page | delete a block |
| 7 | Remove the `JWT_SECRET` fallback; fail fast at boot | 2 lines |
| 8 | Restrict CORS to known origins | 1 line |

### P1 — dead features (all one-line fixes)

| # | Item |
|---|---|
| 9 | Onboarding path → `/admin/add-provider` |
| 10 | Admin services key → `res.data.services` |
| 11 | Admin dashboard: align seven key names |
| 12 | Shop messages: mark-read path + body |
| 13 | Shop messages: add the delete route |
| 14 | Shop messages: unread badge key |
| 15 | `confirmed` count in `GET /shop/service-orders` |
| 16 | Add `ap.city` to the three admin joins |
| 17 | Guest access to `/portal/services` and `/portal/contact` |

### P2 — correctness

| # | Item |
|---|---|
| 18 | Remove the GPS fallback — fail loudly |
| 19 | Gate verify-OTP and pay buttons by status |
| 20 | Move OTP verification to the workshop side |
| 21 | Add `total_cost` and per-item price snapshots |
| 22 | Wrap multi-step writes in transactions |
| 23 | Soft-delete catalog items instead of hard delete |
| 24 | Axios response interceptor for 401 → logout |
| 25 | Centralise statuses in one constants module |
| 26 | Add database indexes on `shop_id` and `user_id` |
| 27 | Real Stripe Elements + webhook |
| 28 | Fix the `?.length === 0` empty-state guards |
| 29 | Correct the two mislabelled metric cards |

### P3 — completeness

| # | Item |
|---|---|
| 30 | Mobile navigation |
| 31 | Pagination and search on all list views |
| 32 | Real password reset with email |
| 33 | Polling or WebSockets for the "live" screens |
| 34 | Notifications (email/SMS) |
| 35 | A migration system |
| 36 | Tests |
| 37 | Choose Prisma or raw SQL and remove the other |
| 38 | Extract shared components (see [02 — Architecture](./02-architecture.md#refactor-opportunities)) |
| 39 | Accessibility pass on modals and tables |
| 40 | `.env.example` and a real frontend README |

---

**Next:** [08 — Use Cases & Market Fit](./08-use-cases.md).
