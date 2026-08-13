[← Back to index](./README.md)

# 02 — Architecture

## The stack

| Layer | Technology | Notes |
|---|---|---|
| UI | React 19 | Function components, hooks only. No class components. |
| Build | Vite 8 | Dev server on 5173. No proxy configured. |
| Routing | react-router-dom 7 | `BrowserRouter`, all routes statically imported |
| Styling | Tailwind CSS 3.4 | Stock config; custom animations in `src/index.css` |
| HTTP client | axios 1.19 | Single shared instance with a request interceptor |
| Icons | Font Awesome 6.4 | Loaded from CDN in `index.html`, not bundled |
| API | Express 5 | Five route modules mounted under `/api` |
| Database access | `pg` 8.23 | Raw parameterised SQL. No ORM at runtime. |
| Database | PostgreSQL | Nine tables |
| Auth | `jsonwebtoken` + `bcryptjs` | HS256 JWT, 7-day expiry, bcrypt cost 10 |
| Payments | `stripe` 22 | Server-side PaymentIntent creation |
| Linting | oxlint | Frontend only |

**A note on Prisma.** `backend/prisma/schema.prisma` and `backend/prisma.config.ts` exist, and `@prisma/client` is installed. **Nothing at runtime uses them.** Every query in every route file is hand-written SQL through the `pg` pool. The Prisma schema was introspected from the database and left in place. Treat it as documentation of the schema, not as a data access layer — and be aware it can drift out of sync with `db/schema.sql`, which is the actual source of truth.

## System topology

```
┌───────────────────────────────────────────────────────────────────┐
│  Browser                                                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  React SPA  (Vite dev :5173  /  static dist/ in prod)       │  │
│  │                                                             │  │
│  │   AuthContext ──── holds user, profile, token, loading       │  │
│  │        │                                                    │  │
│  │        ├── ProtectedRoute guards ── 26 page components       │  │
│  │        │                                                    │  │
│  │        └── api (axios instance)                              │  │
│  │              └── request interceptor: attach Bearer token    │  │
│  │                                                             │  │
│  │   localStorage['autocare_token'] ◀── the only persisted state │  │
│  └───────────────────────────┬─────────────────────────────────┘  │
└──────────────────────────────┼────────────────────────────────────┘
                               │  HTTP + JSON, absolute URL
                               │  CORS: wide open (app.use(cors()))
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│  Express :5000                                                    │
│                                                                   │
│   express.json()  ──▶  router dispatch  ──▶  auth middleware      │
│                                                │                  │
│        ┌───────────────────────────────────────┴──────────┐       │
│        ▼            ▼            ▼           ▼            ▼       │
│   /api/auth   /api/client  /api/portal  /api/shop   /api/admin    │
│   (mixed)     requireAuth  requireAuth  requireStaff requireSuper │
│        │            │            │           │            │       │
│        └────────────┴────────────┴───────────┴────────────┘       │
│                               │                                   │
│                        db.query(sql, params)                      │
└───────────────────────────────┼───────────────────────────────────┘
                                │  pg connection Pool
                                ▼
                    ┌───────────────────────┐
                    │  PostgreSQL :5434     │
                    │  autocare_db          │
                    │  9 tables             │
                    └───────────────────────┘
```

There is no reverse proxy, no API gateway, no cache layer, no message queue, no background worker. Every request is synchronous: HTTP in, SQL out, JSON back.

## Request lifecycle

Tracing a single authenticated request — a client loading their service order list:

```
1.  ClientServiceOrders mounts
        useEffect(() => { fetchOrders() }, [])

2.  api.get('/client/service-orders')
        axios instance, baseURL = VITE_API_URL
                              || `${protocol}//${hostname}:5000/api`

3.  Request interceptor fires
        token = localStorage.getItem('autocare_token')
        config.headers.Authorization = `Bearer ${token}`

4.  → GET http://localhost:5000/api/client/service-orders
        Authorization: Bearer eyJhbGci...

5.  Express: cors() → express.json() → router match /api/client

6.  requireAuth middleware
        - reads req.headers.authorization
        - rejects 401 if missing or not "Bearer <x>"
        - jwt.verify(token, JWT_SECRET)
        - on success: req.user = decoded payload
                      { id, username, email, is_staff, is_superuser }
        - on failure: 401 "Invalid or expired token"

7.  Route handler
        userId = req.user.id           ← scoping comes from the token, not the URL
        db.query(`SELECT sb.*, ap.shop_name,
                         COALESCE(json_agg(...)) as services
                  FROM service_bookings sb
                  LEFT JOIN admin_profiles ap ON sb.shop_id = ap.id
                  LEFT JOIN service_booking_items sbi ON sb.id = sbi.booking_id
                  LEFT JOIN service_offerings so ON sbi.service_id = so.id
                  WHERE sb.user_id = $1
                  GROUP BY sb.id, ap.shop_name
                  ORDER BY sb.id DESC`, [userId])

8.  Handler computes status counts in JS from the returned rows

9.  ← 200 { bookings: [...], counts: { pending, confirmed, ... } }

10. Component: setBookings(res.data.bookings || [])
                setCounts(res.data.counts || {})
                setLoading(false)

11. Render: filter tabs use `counts` from the server,
            table rows use bookings.filter(b => b.status === filter)
            ← note: counts are server-side, filtering is client-side
```

**Two patterns worth internalising, because they repeat everywhere:**

**Scoping comes from the JWT, never from the URL.** Client and workshop endpoints derive their `WHERE` clause from `req.user.id`. A client cannot list another client's orders by changing a parameter, because there is no parameter — the identity is in the token. *(The exception is detail endpoints that take an `:id`; those do not check ownership. See [Security model](#security-model).)*

**Aggregation happens in JavaScript, not SQL.** Status counts, totals and "recent 5" slices are all computed in the handler after fetching every matching row. This is simple to read and fine at demo scale, but it means the dashboard endpoints do unbounded full-table scans. See [Scaling considerations](#scaling-considerations).

## Authentication and authorisation

### Token issuance

`POST /api/auth/login` and `POST /api/auth/signup` both:

1. Look the user up (login) or insert them (signup, with `bcrypt.hash(password, 10)`).
2. For login, verify with `bcrypt.compare`.
3. Sign a JWT with this payload:

```js
{ id, username, email, is_staff, is_superuser }
```

using `JWT_SECRET`, `{ expiresIn: '7d' }`.

4. Return `{ token, user }`.

The role flags live **inside the token**. This is why middleware can authorise without a database round trip — but it also means **a role change does not take effect until the user's token expires or they log in again.**

### Server-side middleware

All four live in `backend/middleware/auth.js`:

| Middleware | Checks | Used by |
|---|---|---|
| `verifyToken` | Valid `Bearer` token, sets `req.user` | base for the others |
| `requireAuth` | Same as `verifyToken` | `/api/client/*`, most of `/api/portal/*` |
| `requireStaff` | `is_staff` **or** `is_superuser` | `/api/shop/*` |
| `requireSuperAdmin` | `is_superuser` only | `/api/admin/*` |

Note that `requireStaff` admits super admins. This is intentional — a platform operator can access a workshop portal.

### Client-side guards

`App.jsx` defines a single `ProtectedRoute` component:

```
loading                                  → render spinner
!user                                    → <Navigate to="/login" replace />
allowSuperAdmin && !isSuperAdmin         → <Navigate to="/dashboard" replace />
allowStaff && !isStaff && !isSuperAdmin  → <Navigate to="/dashboard" replace />
otherwise                                → render children
```

Three usage forms:

```jsx
<ProtectedRoute>                       {/* any authenticated user */}
<ProtectedRoute allowStaff>            {/* staff or super admin */}
<ProtectedRoute allowSuperAdmin>       {/* super admin only */}
```

**These guards are cosmetic.** They control what renders; they do not protect data. The real enforcement is the server middleware. Two consequences follow:

- A route with no flag admits *any* authenticated user, including staff and super admins. Client pages are therefore not client-only.
- The redirect carries no `state.from`, so a deep link that bounces to `/login` lands the user on their role dashboard after login, not where they were headed.

### Session hydration

`AuthContext` seeds `token` lazily from `localStorage`, then runs an effect keyed on `token`:

```
token changes
  ├── no token  → clear user + profile, loading = false
  └── has token → GET /api/auth/me
                    ├── success → setUser(res.data.user)
                    │             setProfile(res.data.profile)
                    └── failure → logout()
```

`GET /api/auth/me` returns the user plus a **role-dependent profile**:

- If `is_staff` → their own `admin_profiles` row (their workshop).
- Otherwise → the workshop they have selected, joined through `select_shops`.

So `profile` means "your workshop" for staff and "your chosen workshop" for clients. Components read it for header text and contact details.

### The context API

```js
const {
  user,          // { id, username, email, first_name, last_name, is_staff, is_superuser }
  profile,       // workshop object or null
  token,
  loading,
  login,         // (token, userData) → persist + set state
  logout,        // clear localStorage + state
  refreshUser,   // re-run GET /auth/me
  isGuest,       // !user
  isClient,      // user && !is_staff && !is_superuser
  isStaff,       // user && is_staff && !is_superuser
  isSuperAdmin,  // user && is_superuser
} = useAuth()
```

`refreshUser` matters after any mutation that changes the user or their workshop selection — `ClientProfilePage` calls it after saving.

### Known gap: no response interceptor

The axios instance has a request interceptor but **no response interceptor**. When a token expires:

- Every in-flight and subsequent call returns 401.
- Page-level `catch` blocks mostly just `console.error`.
- The user sees empty tables and zeroed dashboards with no explanation.
- Only a failure of `GET /auth/me` specifically triggers `logout()`.

Adding a response interceptor that catches 401 and calls `logout()` is a small, high-value fix.

## State management

There is no Redux, Zustand, React Query or SWR. State is deliberately minimal:

| Kind of state | Where it lives | Lifetime |
|---|---|---|
| Auth session | `AuthContext` + `localStorage` | Across reloads |
| Page data | `useState` in each page component | Until unmount |
| Forms | `useState`, usually one `formData` object | Until unmount |
| Modals | Boolean `useState` in the parent page | Until unmount |
| URL params | `useSearchParams` / `useParams` | URL-driven |

**Implications of this choice:**

- **No cache.** Navigating away and back refetches everything.
- **No shared server state.** Two components showing the same booking each fetch it separately.
- **Refetch after mutate.** Every mutation is followed by a full refetch of the list, not an optimistic local update.
- **Fetch on mount only.** `useEffect(..., [])` is the standard pattern. Nothing polls. UI copy promising "live tracking" is aspirational — the user must reload.
- **React StrictMode is on**, so every mount effect fires twice in development. Expect duplicated GETs in the network tab; this is not a bug.

## Data model

### Tables

```
users
├── id, username UQ, email UQ, password (bcrypt)
├── first_name, last_name
├── is_staff, is_superuser          ← role is these two booleans
└── created_at

admin_profiles                       ← THE WORKSHOP / TENANT
├── id
├── user_id UQ → users(id) CASCADE   ← 1:1 with a staff user
├── full_name (manager), shop_name
├── phone_number, city, shop_address
└── created_at

select_shops                         ← client's chosen workshop
├── id
├── user_id UQ → users(id) CASCADE
└── select_shop_id → admin_profiles(id) SET NULL

service_offerings                    ← catalog item
├── id, user_id, shop_id → admin_profiles(id) CASCADE
├── title, description, icon_class
├── price_starts_at DECIMAL(10,2)
├── is_active
└── created_at

service_bookings
├── id, user_id, shop_id → admin_profiles(id) SET NULL
├── customer_name, customer_phone, customer_email    ← snapshot, not a join
├── vehicle_info, preferred_date, preferred_time, additional_notes
├── status, otp, otp_verified
├── payment_method, is_paid, stripe_payment_intent_id
└── created_at
        │
        └── service_booking_items    ← M:N join, composite PK
            ├── booking_id → service_bookings(id) CASCADE
            └── service_id → service_offerings(id) CASCADE

towing_requests
├── id, user_id, shop_id → admin_profiles(id) SET NULL
├── full_name, phone_number, vehicle_details
├── pickup_address, latitude DECIMAL(10,6), longitude DECIMAL(10,6)
├── status, otp, otp_verified
└── requested_at

contact_messages
├── id, user_id, shop_id → admin_profiles(id) SET NULL
├── name, email, subject, message, is_read
└── created_at

blog_posts
├── id, user_id, title, slug UQ, content
├── image_url, author
└── created_at
```

### Relationship diagram

```
                        ┌───────┐
                        │ users │
                        └───┬───┘
              ┌─────────────┼──────────────┬─────────────┐
              │ 1:1         │ 1:1          │ 1:N         │ 1:N
              ▼             ▼              ▼             ▼
     ┌────────────────┐ ┌──────────────┐ ┌───────────┐ ┌────────────┐
     │ admin_profiles │ │ select_shops │ │ bookings  │ │ blog_posts │
     │  (WORKSHOP)    │ └──────┬───────┘ │  towing   │ └────────────┘
     └───────┬────────┘        │         │  messages │
             │  ◀──────────────┘         └───────────┘
             │     client points at a workshop
             │
             │ 1:N (workshop owns)
             ├──────▶ service_offerings ──┐
             ├──────▶ service_bookings ───┤ M:N via
             ├──────▶ towing_requests     │ service_booking_items
             └──────▶ contact_messages    ┘
```

### Delete behaviour

| Parent deleted | Effect |
|---|---|
| `users` | Cascades to `admin_profiles`, `select_shops`, `service_offerings`, `blog_posts`. Bookings and towing rows also cascade (`user_id` is `CASCADE`). |
| `admin_profiles` | `service_offerings` cascade. Bookings, towing and messages have `shop_id` set to `NULL` — the records survive, orphaned from any workshop. |
| `service_offerings` | `service_booking_items` cascade, silently removing line items from historical bookings. |

That last row is a real problem: deleting a catalog item rewrites the past. A booking that was for two services becomes a booking for one, and its computed total drops. See [07 — Feature Catalog](./07-features.md#catalog-management).

### Two schema decisions worth understanding

**Customer details are snapshotted onto bookings.** `service_bookings` stores `customer_name`, `customer_phone` and `customer_email` as columns rather than reading them from the `users` row at display time. This is correct — the person dropping off the car may not be the account holder, and a later profile edit should not rewrite a historical job sheet.

**Order totals are not snapshotted.** There is no `total_cost` column. Totals are recalculated on every read by summing `service_offerings.price_starts_at` for the linked items:

```js
booking.total_cost = servicesRes.rows.reduce(
  (sum, item) => sum + parseFloat(item.price_starts_at), 0
)
```

This is inconsistent with the customer-detail decision and is a genuine defect. If a workshop raises the price of an oil change from ₹1499 to ₹1799, **every historical booking that included it retroactively shows the higher total** — including bookings already paid. The fix is a `total_cost` column written at booking time, plus per-item price snapshots in `service_booking_items`.

## Multi-tenancy model

The tenant is `admin_profiles.id`, referenced as `shop_id` throughout.

**How workshop scoping is enforced:**

```js
// backend/routes/shop.js
async function getShopProfile(userId) {
    const res = await db.query(
      'SELECT * FROM admin_profiles WHERE user_id = $1', [userId]
    );
    return res.rows[0] || null;
}

// every /api/shop/* handler starts here
const shop = await getShopProfile(req.user.id);
// ... WHERE shop_id = $1, [shop.id]
```

The workshop identity is derived from the token, never accepted from the request. This is the right pattern and it holds consistently across `/api/shop/*`.

**How a client is bound to a workshop:**

```js
// backend/routes/portal.js
const shopRes = await db.query(
  'SELECT select_shop_id FROM select_shops WHERE user_id = $1', [userId]
);
let shopId = shopRes.rows.length > 0 ? shopRes.rows[0].select_shop_id : null;

// fallback: first workshop in the system
if (!shopId) {
    const firstShop = await db.query(
      'SELECT id FROM admin_profiles ORDER BY id ASC LIMIT 1'
    );
    if (firstShop.rows.length > 0) shopId = firstShop.rows[0].id;
}
```

Note the fallback. A client with no selection sees the **lowest-ID workshop's** catalog. Signup also auto-creates a `select_shops` row pointing at that same workshop, so new users are never left with an empty catalog.

**Important caveat:** the fallback applies to reading the catalog (`GET /portal/services`) but **not** to creating jobs. `POST /portal/book-service` and `POST /portal/towing` read `select_shops` with no fallback, so a client with no selection creates a job with `shop_id = null`. Such a job is invisible to every workshop dashboard — it exists but nobody is assigned to it. Nothing in the UI warns about this.

## Security model

### What is done correctly

- Passwords hashed with bcrypt at cost 10, never returned in responses.
- **All SQL is parameterised.** Every query uses `$1, $2, …` placeholders. There is no string concatenation of user input into SQL anywhere in the codebase — no SQL injection surface.
- JWT signature verified on every protected request.
- Role checks are enforced server-side, not only in the UI.
- List endpoints scope by `req.user.id`, so users cannot enumerate other users' collections.

### What is not

These are real vulnerabilities, documented so they are fixed rather than discovered:

**1. Missing ownership checks on detail endpoints (IDOR).**

`GET`, `PUT`, `DELETE` and `verify-otp` under `/api/portal/bookings/:id` and `/api/portal/towing/:id` verify only that *a* valid token is present. They never check that the record belongs to the caller:

```js
// what it does
const bookingRes = await db.query(
  'SELECT ... WHERE sb.id = $1', [bookingId]
);

// what it should do
const bookingRes = await db.query(
  'SELECT ... WHERE sb.id = $1 AND sb.user_id = $2', [bookingId, req.user.id]
);
```

IDs are sequential integers, so any authenticated user can walk `/bookings/1`, `/bookings/2`, … and read, cancel or complete other people's jobs. The `GET` response includes the OTP, which is what makes forced completion possible.

**2. Payment verification does not verify payment.**

`POST /api/portal/payment/verify` never contacts Stripe. It looks the booking up by ID and sets `is_paid = true` unconditionally. A single request marks any booking paid.

**3. The OTP mechanism is inverted.**

The code is displayed to the client in five separate places, and the only verify endpoint is client-facing. Workshops have no way to enter it. The party who is supposed to *present* the secret both holds it and controls the button that consumes it. There is also no expiry, no attempt limit and no rate limit.

**4. Hardcoded fallback secret.**

`JWT_SECRET` falls back to a literal string when the environment variable is unset. Anyone who has read the repository can forge tokens against a deployment that forgot to set it.

**5. Demo credentials in shipped markup.**

The login page renders a "Demo Accounts" panel with three working username/password pairs, including the super admin. Not environment-gated.

**6. Fully open CORS.**

`app.use(cors())` with no options allows every origin.

**7. `is_paid` is a staff-editable checkbox** with no amount, ledger or audit trail.

**8. A GET request mutates.** `GET /api/shop/messages/:id` sets `is_read = true` as a side effect.

### Priority for hardening

1. Add ownership checks to every `/api/portal/*/:id` handler.
2. Retrieve and verify the PaymentIntent status from Stripe in `payment/verify`.
3. Move OTP verification to a workshop-side endpoint; stop showing the code to the client.
4. Remove the `JWT_SECRET` fallback — fail fast at boot if unset.
5. Remove the demo credentials panel.
6. Restrict CORS to known origins.
7. Add rate limiting on login and OTP verification.

## Extension points

Where to make changes for common tasks.

### Add a new API endpoint

1. Pick the router by audience: `routes/client.js`, `portal.js`, `shop.js`, `admin.js`.
2. Attach the matching middleware — `requireAuth`, `requireStaff` or `requireSuperAdmin`.
3. Derive scope from `req.user`, never from the request body.
4. Use parameterised SQL through `db.query`.
5. Return `{ error }` with an appropriate status on failure; the frontend reads `err.response?.data?.error`.

```js
router.get('/my-thing', requireStaff, async (req, res) => {
    try {
        const shop = await getShopProfile(req.user.id);
        if (!shop) return res.status(404).json({ error: 'Shop profile not found' });

        const result = await db.query(
            'SELECT * FROM my_table WHERE shop_id = $1', [shop.id]
        );
        res.json({ things: result.rows });
    } catch (err) {
        console.error('My thing error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

### Add a new page

1. Create `src/pages/MyPage.jsx`.
2. Import it in `App.jsx` and add a `<Route>` wrapped in the right `ProtectedRoute` variant.
3. Add a nav link in `components/Navbar.jsx` under the correct role branch.
4. Follow the established page shape: `loading` state, `useEffect` fetch on mount, `|| []` guards on response arrays, a spinner while loading, an explicit empty state.

### Add a database column

1. Edit `backend/db/schema.sql` — it is the source of truth.
2. **`db/init.js` will not apply it to an existing database.** The DDL uses `CREATE TABLE IF NOT EXISTS`, so an existing table is left alone. Either write a manual `ALTER TABLE`, or drop and reseed:
   ```bash
   psql -U postgres -c "DROP DATABASE autocare_db;"
   node db/init.js
   ```
3. Update the affected `SELECT`/`INSERT`/`UPDATE` statements — there is no ORM to keep in sync.
4. Optionally refresh `prisma/schema.prisma` with `npx prisma db pull` to keep the documentation honest.

**There is no migration system.** Adding one (`node-pg-migrate`, Knex, or adopting Prisma Migrate properly) is worth doing before the schema changes again.

### Add a status to the pipeline

Statuses are bare strings with no central definition. To add one you must touch:

- `components/StatusBadge.jsx` — colour, icon and label mapping
- Every filter-tab block — `ClientServiceOrders`, `ClientTowingOrders`, `ShopServiceOrders`, `ShopTowingOrders`
- Every status `<select>` — `ShopDashboard`, `ShopServiceOrders`, `ShopTowingOrders`
- The `counts` object in `routes/client.js` and `routes/shop.js`

This is the clearest argument for extracting a shared `constants/statuses.js` before extending the pipeline.

### Wire up real Stripe payments

The server side largely exists. What is missing is the client:

1. Install `@stripe/stripe-js` and `@stripe/react-stripe-js`.
2. Replace `components/StripePaymentModal.jsx` with Stripe Elements, using the `client_secret` the backend already returns from `POST /portal/book-service`.
3. Call `stripe.confirmCardPayment(clientSecret)`.
4. Rewrite `POST /portal/payment/verify` to call `stripe.paymentIntents.retrieve(id)` and only set `is_paid = true` when `status === 'succeeded'`.
5. Add a webhook endpoint for `payment_intent.succeeded` so the paid flag survives a client that closes the tab mid-payment.
6. Remove the `pi_mock_*` fallback paths — a Stripe outage should surface an error, not fabricate a success.

## Scaling considerations

Honest limits of the current design. None of these matter at demo scale; all of them matter with real traffic.

| Area | Current behaviour | Breaks at | Fix |
|---|---|---|---|
| Dashboard queries | Fetch **all** rows, then `.length` and `.slice(0, 5)` in JS | Low thousands of rows | `SELECT COUNT(*)` + `LIMIT` |
| Admin registries | Render every booking / towing row into one DOM table | A few thousand rows | Server-side pagination |
| Status filtering | Server sends counts, client filters the full array | Same as above | Push the filter into the query |
| Booking creation | One `INSERT` + one `SELECT` **per service** in a loop, no transaction | Correctness risk today | Single multi-row insert inside a transaction |
| Order totals | Recomputed from the live catalog on every read | Correctness risk today | `total_cost` column |
| N+1 patterns | `db/init.js` and the booking loop | — | Batch |
| Sessions | Stateless JWT, no revocation list | On any need to force logout | Short-lived access + refresh tokens |
| Connection pool | Default `pg` pool size, no tuning | Under concurrency | Configure `max` |
| Indexes | Primary keys and unique constraints only — **no index on `shop_id` or `user_id`** | Tens of thousands of rows | Add indexes on every FK used in a `WHERE` |

That last one is the cheapest meaningful win. Every hot query filters on `shop_id` or `user_id`, and neither is indexed:

```sql
CREATE INDEX idx_bookings_shop   ON service_bookings(shop_id);
CREATE INDEX idx_bookings_user   ON service_bookings(user_id);
CREATE INDEX idx_towing_shop     ON towing_requests(shop_id);
CREATE INDEX idx_towing_user     ON towing_requests(user_id);
CREATE INDEX idx_offerings_shop  ON service_offerings(shop_id);
CREATE INDEX idx_messages_shop   ON contact_messages(shop_id);
```

## Code conventions

Patterns to follow when adding code, derived from what the codebase already does consistently.

**Backend**

- One router per audience; `module.exports = router`.
- `try/catch` around every handler; `console.error('<Context> error:', err)` then `res.status(500).json({ error: 'Internal server error' })`.
- Validate required fields early, return `400` with a specific message.
- Errors are always `{ error: string }` — the frontend depends on this shape.
- Successful mutations return `{ message: string }` plus any created object.
- Partial updates use the `field !== undefined ? field : current.field` pattern after a `SELECT` of the current row. **`PUT /api/shop/towing-orders/:id` omits this and nulls four columns as a result** — follow the service-order handler, not the towing one.

**Frontend**

- One page component per route, default-exported.
- `const [loading, setLoading] = useState(true)`, flipped in a `finally`.
- Guard array reads: `res.data.things || []`.
- Read errors as `err.response?.data?.error || '<friendly fallback>'`.
- Tailwind utilities inline; no CSS modules or styled-components.
- Repeated visual recipes: cards are `bg-white border border-slate-200 rounded-2xl p-6 shadow-sm`; primary buttons are `px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white`.

**Naming**

- Database and API: `snake_case` (`customer_name`, `is_paid`, `select_shop_id`).
- React: `PascalCase` components, `camelCase` locals and handlers (`handleSubmit`, `fetchOrders`).
- API responses use snake_case throughout — there is no case conversion layer, so components read `booking.customer_name` directly.

## Refactor opportunities

Duplication that is worth consolidating, in rough order of payoff:

| Duplicated thing | Copies | Suggested extraction |
|---|---|---|
| Status filter pill tabs (~40 lines each) | 4 | `<FilterTabs tabs={} active={} onChange={} counts={} />` |
| `if (loading) return <spinner>` | 13 | `<PageLoader />` |
| OTP modal wiring + `isVerified` expression | 5 | `useOtpVerification(entityType)` hook |
| Status `<option>` lists — **with inconsistent labels** | 3 | `constants/statuses.js` |
| `BookingDetailPage` / `TowingDetailPage` | 2 | Shared `<JobDetailLayout>` |
| Empty-state guard (buggy `?.length === 0` form) | 4 | Fix while extracting |
| Error surfacing — inline banner vs `alert()` vs silent | 3 styles | One `<Toast>` / `useToast` |

Also missing and worth adding: a test suite (there is none in either package), a `.env.example`, request validation (Zod or Joi), structured logging instead of `console.error`, and accessible modal primitives — the two hand-rolled modals lack `role="dialog"`, focus trapping and Escape-to-close.

---

**Next:** [03 — Flows](./03-flows.md) to see these pieces working together, or [07 — Feature Catalog](./07-features.md) for build status per feature.
