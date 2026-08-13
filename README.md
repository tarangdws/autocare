# AutoCare Elite

A multi-tenant car service and roadside assistance platform. Vehicle owners pick a preferred workshop, book services from that workshop's catalog, or raise emergency towing requests. Each job generates a 6-digit OTP used as handover proof.

**Stack:** React 19 + Vite + Tailwind CSS · Express 5 + PostgreSQL (raw `pg`) · JWT auth · Stripe (test mode)

---

## Table of contents

- [What this project does](#what-this-project-does)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Database schema](#database-schema)
- [Prerequisites](#prerequisites)
- [PostgreSQL setup](#postgresql-setup)
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [Seeded demo accounts](#seeded-demo-accounts)
- [API reference](#api-reference)
- [Available scripts](#available-scripts)
- [Troubleshooting](#troubleshooting)
- [Known issues](#known-issues)

---

## What this project does

AutoCare Elite connects three types of users:

| Role | Flags on `users` | What they do |
|---|---|---|
| **Client** | `is_staff=false`, `is_superuser=false` | Selects a preferred workshop, browses its service catalog, books services, requests towing, pays, verifies completion via OTP |
| **Shop Admin** (staff) | `is_staff=true` | Manages their own workshop profile, maintains the service catalog, processes incoming bookings and towing requests, reads customer messages |
| **Super Admin** | `is_superuser=true` | Onboards workshop providers, views platform-wide bookings and towing activity, deletes records |

There is a single `users` table for all three roles — role is determined by two boolean flags, not a separate role column. Each workshop is an `admin_profiles` row with a 1:1 link to a staff user.

---

## How it works

### Architecture

```
┌─────────────────────┐         ┌──────────────────────┐        ┌──────────────┐
│  React SPA          │  HTTP   │  Express API         │  SQL   │  PostgreSQL  │
│  Vite dev :5173     │────────▶│  :5000               │───────▶│  :5434       │
│                     │  JSON   │                      │  pg    │              │
│  axios + JWT in     │◀────────│  JWT middleware      │◀───────│  9 tables    │
│  localStorage       │         │  5 route modules     │        │              │
└─────────────────────┘         └──────────────────────┘        └──────────────┘
```

The frontend is a pure SPA — no SSR, no dev proxy. It calls the API at an absolute URL (`VITE_API_URL`, falling back to `<protocol>//<hostname>:5000/api`). The backend enables wide-open CORS to allow this.

### Authentication

1. `POST /api/auth/login` verifies credentials with bcrypt and returns a JWT (7-day expiry) plus the user object.
2. The token is stored in `localStorage` under the key `autocare_token`.
3. An axios **request** interceptor attaches `Authorization: Bearer <token>` to every call.
4. `AuthContext` calls `GET /api/auth/me` on mount to hydrate the user and their associated profile.
5. Route guards (`<ProtectedRoute>`, `allowStaff`, `allowSuperAdmin`) gate the client side; `requireAuth` / `requireStaff` / `requireSuperAdmin` middleware gate the server side.

After login users are redirected by role: super admin → `/admin/dashboard`, staff → `/shop/dashboard`, client → `/dashboard`.

> There is no axios **response** interceptor, so an expired token does not trigger an automatic logout — pages render empty instead. See [Known issues](#known-issues).

### Service booking flow

```
Client sets preferred shop         POST /api/client/select-shop
        ↓                          (writes a select_shops row)
Browse that shop's catalog         GET  /api/portal/services
        ↓
Select services + date/time        POST /api/portal/book-service
        ↓                          → status='pending', 6-digit OTP generated,
                                     service_booking_items rows inserted,
                                     Stripe PaymentIntent created if payment_method='online'
        ↓
Shop updates status                PUT  /api/shop/service-orders/:id
        ↓                          pending → confirmed → processing
Client verifies OTP                POST /api/portal/bookings/:id/verify-otp
        ↓                          → otp_verified=true, status='completed'
```

### Towing flow

```
Client submits request             POST /api/portal/towing
        ↓                          → status='pending', OTP generated, GPS lat/lng stored
Shop dispatches                    PUT  /api/shop/towing-orders/:id
        ↓                          pending → processing
Client verifies handover OTP       POST /api/portal/towing/:id/verify-otp
                                   → status='completed'
```

Towing has no payment surface — no cost field, no `is_paid`.

### Status lifecycle

```
pending ──▶ confirmed ──▶ processing ──▶ completed
   │            │              │
   └────────────┴──────────────┴──────────▶ cancelled
```

Statuses are plain strings with no central enum or state machine — any transition is currently allowed. Towing effectively skips `confirmed`.

### Payments

- `payment_method` is `cash` or `online`. `cash` is a label with no downstream effect.
- For `online`, the backend creates a real Stripe PaymentIntent in INR (`amount = total × 100`).
- `POST /api/portal/payment/verify` marks the booking paid and regenerates the OTP.
- The frontend payment modal is currently a **simulation** (prefilled test card, `setTimeout`, no Stripe.js). Stripe is wired on the server but not on the client. See [Known issues](#known-issues).

---

## Project structure

```
autocare/
├── backend/
│   ├── server.js                 # Express entry point — mounts 5 routers, CORS, JSON body parser
│   ├── package.json
│   ├── db/
│   │   ├── index.js              # pg connection Pool, exports query()
│   │   ├── schema.sql            # DDL for all 9 tables (CREATE TABLE IF NOT EXISTS)
│   │   └── init.js               # One-shot setup: creates DB → applies schema → seeds demo data
│   ├── middleware/
│   │   └── auth.js               # verifyToken, requireAuth, requireStaff, requireSuperAdmin
│   ├── routes/
│   │   ├── auth.js               # signup, login, me, forget-password
│   │   ├── client.js             # client dashboard, profile, shop selection, order lists
│   │   ├── portal.js             # bookings, towing, OTP verification, payments, blogs, contact
│   │   ├── shop.js               # shop dashboard, profile, service CRUD, order management, messages
│   │   └── admin.js              # super admin dashboard, provider onboarding, global registries
│   ├── prisma/schema.prisma      # Generated but UNUSED — all runtime code uses raw SQL
│   ├── prisma.config.ts          # Also unused
│   └── fix_passwords.js          # Utility: re-hash / reset the three demo account passwords
│
└── frontend/
    ├── index.html                # Loads Font Awesome 6.4 and Inter from CDN
    ├── vite.config.js            # React plugin only — no proxy, no aliases
    ├── tailwind.config.js        # Stock config, no theme extensions
    ├── postcss.config.js         # tailwindcss + autoprefixer
    └── src/
        ├── main.jsx              # React root
        ├── App.jsx               # All 26 routes + ProtectedRoute guard component
        ├── index.css             # Tailwind directives + custom animations (animate-fade, towblink)
        ├── api/index.js          # Single axios instance + Bearer token interceptor
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── Navbar.jsx            # Role-aware navigation
        │   ├── Footer.jsx
        │   ├── StatusBadge.jsx       # Maps status string → color, icon, label
        │   ├── OtpModal.jsx          # OTP display + verification input
        │   └── StripePaymentModal.jsx
        └── pages/                    # 26 pages
            ├── LandingPage.jsx           ┐
            ├── LoginPage.jsx             │
            ├── SignupPage.jsx            │
            ├── ForgetPasswordPage.jsx    │ 8 public
            ├── AboutUsPage.jsx           │
            ├── ServicesInfoPage.jsx      │
            ├── ContactUsPage.jsx         │
            ├── BlogListPage.jsx          ┘
            ├── ClientDashboard.jsx       ┐
            ├── ClientProfilePage.jsx     │
            ├── ClientServiceOrders.jsx   │
            ├── ClientTowingOrders.jsx    │ 8 client
            ├── BookServicePage.jsx       │
            ├── RequestTowingPage.jsx     │
            ├── BookingDetailPage.jsx     │
            ├── TowingDetailPage.jsx      ┘
            ├── ShopDashboard.jsx         ┐
            ├── ShopProfilePage.jsx       │
            ├── ShopServiceOrders.jsx     │ 5 shop admin
            ├── ShopTowingOrders.jsx      │
            ├── ShopMessagesPage.jsx      ┘
            ├── SuperAdminDashboard.jsx      ┐
            ├── SuperAdminProvidersPage.jsx  │
            ├── SuperAdminAddProviderPage.jsx│ 5 super admin
            ├── SuperAdminServicesPage.jsx   │
            └── SuperAdminTowingPage.jsx     ┘
```

### Route map

| Path | Component | Access |
|---|---|---|
| `/` | LandingPage | public |
| `/login`, `/signup`, `/forget-password` | Auth pages | public |
| `/about`, `/blog`, `/contact`, `/services-info` | Info pages | public |
| `/dashboard` | ClientDashboard | authenticated |
| `/profile` | ClientProfilePage | authenticated |
| `/book-service` | BookServicePage | authenticated |
| `/service-orders`, `/bookings/:id` | Service order views | authenticated |
| `/towing-request`, `/towing-orders`, `/towing/:id` | Towing views | authenticated |
| `/shop/dashboard`, `/shop/profile`, `/shop/service-orders`, `/shop/towing-orders`, `/shop/messages` | Shop portal | `is_staff` |
| `/admin/dashboard`, `/admin/providers`, `/admin/add-provider`, `/admin/services`, `/admin/towing` | Admin portal | `is_superuser` |
| `*` | → redirect to `/` | — |

---

## Database schema

Nine tables, defined in `backend/db/schema.sql`:

| Table | Purpose | Key columns |
|---|---|---|
| `users` | All accounts (all three roles) | `username` UQ, `email` UQ, `password` (bcrypt), `is_staff`, `is_superuser` |
| `admin_profiles` | Workshop record, 1:1 with a staff user | `user_id` UQ FK, `shop_name`, `phone_number`, `city`, `shop_address` |
| `select_shops` | Client → preferred workshop mapping | `user_id` UQ FK, `select_shop_id` FK |
| `service_offerings` | A workshop's service catalog | `shop_id` FK, `title`, `description`, `icon_class`, `price_starts_at`, `is_active` |
| `service_bookings` | Booking header | `user_id`, `shop_id`, customer fields, `preferred_date`, `preferred_time`, `status`, `otp`, `otp_verified`, `payment_method`, `is_paid`, `stripe_payment_intent_id` |
| `service_booking_items` | Booking ↔ services join | composite PK `(booking_id, service_id)` |
| `towing_requests` | Towing request | `full_name`, `phone_number`, `vehicle_details`, `pickup_address`, `latitude`, `longitude`, `status`, `otp` |
| `contact_messages` | Contact form → shop inbox | `shop_id`, `name`, `email`, `subject`, `message`, `is_read` |
| `blog_posts` | Articles | `title`, `slug` UQ, `content`, `image_url`, `author` |

### Relationships

```
users 1───1 admin_profiles ──┬──< service_offerings
  │                          ├──< service_bookings
  │                          ├──< towing_requests
  │                          └──< contact_messages
  │
  └──1 select_shops >──1 admin_profiles     (client's chosen workshop)

service_bookings >──< service_offerings     (via service_booking_items)
```

Cascade behaviour: deleting a `users` row cascades to `admin_profiles`, `select_shops`, `service_offerings`, `blog_posts`. Bookings and towing requests use `ON DELETE SET NULL` for `shop_id` but `CASCADE` for `user_id`.

> **Note:** there is no price or total column on `service_bookings`. Order totals are recalculated from `service_offerings.price_starts_at` on every read, so editing a service price retroactively changes historical invoice totals.

---

## Prerequisites

| Tool | Version | Check with |
|---|---|---|
| Node.js | 18 LTS or newer (20+ recommended) | `node -v` |
| npm | 9 or newer | `npm -v` |
| PostgreSQL | 13 or newer | `psql --version` |

Optional: a Stripe test account if you want to exercise real PaymentIntents. Without one, the backend falls back to mock payment intent IDs.

---

## PostgreSQL setup

This project expects PostgreSQL on **port 5434**, not the default 5432. You can either change the server's port or override it with environment variables — both paths are covered below.

### Step 1 — Install PostgreSQL

**Windows**

Download the installer from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/). During installation:

- Set a password for the `postgres` superuser and note it down.
- When asked for the port, enter **5434** to match the project defaults. If you leave it at 5432, see Step 2b.
- Keep the default locale.

**macOS**

```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu / Debian**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 2 — Confirm the port

```bash
psql -U postgres -c "SHOW port;"
```

**2a — If it already reports 5434**, you are done with this step.

**2b — If it reports 5432**, pick one of these:

*Option A — change the server port (matches project defaults, no env override needed)*

Find `postgresql.conf`:

```bash
psql -U postgres -c "SHOW config_file;"
```

Edit that file, set `port = 5434`, then restart:

```bash
# Windows (PowerShell as Administrator)
Restart-Service postgresql-x64-16

# macOS
brew services restart postgresql@16

# Linux
sudo systemctl restart postgresql
```

*Option B — keep 5432 and override via env*

Leave PostgreSQL alone and set `5432` in your connection strings in the [Environment variables](#environment-variables) section. This is the less invasive option.

### Step 3 — Create the database role

The seeding script connects as `postgres`, but the running server's fallback connection string expects a role named `admin`. **Create the `admin` role so both work**, or skip this and set `DATABASE_URL` explicitly (recommended — see the note below).

```bash
psql -U postgres
```

```sql
-- Create the application role
CREATE ROLE admin WITH LOGIN PASSWORD 'admin@123' CREATEDB;

-- Create the database owned by that role
CREATE DATABASE autocare_db OWNER admin;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE autocare_db TO admin;

-- Verify
\l
\du
\q
```

> **Important — mismatched defaults.** `db/init.js` defaults to connecting as `postgres`, while `db/index.js` (the running server) defaults to `admin:admin@123`. If you do not set `DATABASE_URL`, seeding and serving will use two different roles. **The reliable fix is to set `DATABASE_URL` in `backend/.env`** so both use the same connection string. Everything below assumes you do that.

### Step 4 — Test the connection

```bash
psql "postgresql://admin:admin%40123@localhost:5434/autocare_db" -c "SELECT version();"
```

Note that `@` in the password must be URL-encoded as `%40` inside a connection string.

If this succeeds, PostgreSQL is ready.

---

## Environment variables

### `backend/.env`

Create this file — it is not committed:

```env
# Server
PORT=5000

# Database — used by both db/index.js (runtime) and db/init.js (seeding).
# Set this explicitly to avoid the mismatched-defaults problem described above.
# URL-encode special characters in the password (@ becomes %40).
DATABASE_URL=postgresql://admin:admin%40123@localhost:5434/autocare_db

# Used only by db/init.js to connect before autocare_db exists,
# so it can issue CREATE DATABASE. Point at the maintenance database.
PG_BASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5434/postgres
DB_NAME=autocare_db

# Auth — generate your own; do not ship the built-in fallback
JWT_SECRET=replace_this_with_a_long_random_string

# Stripe (optional). Omit and the backend falls back to mock payment intent IDs.
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
```

**Full list of variables the backend reads**

| Variable | Read by | Default if unset |
|---|---|---|
| `PORT` | `server.js` | `5000` |
| `DATABASE_URL` | `db/index.js`, `db/init.js` | built from `PG*` vars below |
| `PGUSER` | `db/index.js` | `admin` |
| `PGPASSWORD` | `db/index.js` | `admin@123` |
| `PGHOST` | `db/index.js` | `localhost` |
| `PGPORT` | `db/index.js` | `5434` |
| `PGDATABASE` | `db/index.js` | `autocare_db` |
| `PG_BASE_URL` | `db/init.js` | `postgresql://postgres@localhost:5434/postgres` |
| `DB_NAME` | `db/init.js` | `autocare_db` |
| `JWT_SECRET` | `middleware/auth.js` | ⚠️ hardcoded literal — always override |
| `STRIPE_SECRET_KEY` | `routes/portal.js` | `sk_test_mock_secret_key` (non-functional) |

If you kept PostgreSQL on port 5432, change `5434` to `5432` in both connection strings above.

### `frontend/.env`

Optional. Without it, the frontend targets `<current-protocol>//<current-hostname>:5000/api`, which works for standard local development.

```env
VITE_API_URL=http://localhost:5000/api
```

Create this file if your backend runs on a different host or port.

---

## Running locally

Run these from the repository root. You will need **two terminals** for the dev servers.

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Initialize and seed the database

```bash
cd backend
node db/init.js
```

This script is idempotent and does four things:

1. Connects using `PG_BASE_URL` and issues `CREATE DATABASE autocare_db` if it does not exist.
2. Connects to `autocare_db` and applies `db/schema.sql` (all statements use `IF NOT EXISTS`).
3. Checks whether `users` is empty. **If it has any rows, seeding is skipped entirely.**
4. If empty, seeds 4 users, 2 workshops, 5 service offerings, 2 blog posts, 1 sample booking, and 1 sample towing request.

Expected output:

```
Connecting to PostgreSQL server...
Creating database autocare_db...
Connecting to autocare_db...
Applying database schema...
Seeding initial database records...
Database initialization & seeding completed successfully!
```

> There is no npm script for this — run `node db/init.js` directly. It is a one-time step, not part of `npm run dev`.

### 3. Start the backend

```bash
cd backend
npm run dev        # nodemon, auto-restarts on change
# or: npm start    # plain node
```

```
AutoCare Elite Express Backend running on http://localhost:5000
```

Verify it is healthy:

```bash
curl http://localhost:5000/api/health
# {"status":"ok","timestamp":"..."}
```

### 4. Start the frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

Vite serves on **http://localhost:5173**. Open it and log in with one of the [demo accounts](#seeded-demo-accounts).

### 5. Production build (optional)

```bash
cd frontend
npm run build      # outputs to frontend/dist/
npm run preview    # serve the build locally
```

The backend does not serve the built frontend — deploy `dist/` to a static host or put both behind a reverse proxy.

---

## Seeded demo accounts

Created by `node db/init.js`:

| Role | Username | Password | Notes |
|---|---|---|---|
| Super Admin | `superadmin` | `adminpass` | `admin@autocare.com` |
| Shop Admin | `autocare_main` | `shoppass` | Workshop: *AutoCare Main Hub*, Ahmedabad — owns 4 services |
| Shop Admin | `elite_motors` | `shoppass` | Workshop: *Elite Motors & Towing*, Ahmedabad — owns 1 service |
| Client | `john_doe` | `userpass` | Pre-linked to *AutoCare Main Hub*, has 1 sample booking + 1 towing request |

These credentials are also hardcoded into a "Demo Accounts" panel on the login page. **Remove that panel before any public deployment.**

If a demo login stops working, `node fix_passwords.js` re-hashes the three original demo passwords. Be aware it sets `superadmin` to `is_staff=false` (the seed script sets `true`) and rewrites `autocare_main`'s email — it does not touch `admin_profiles`.

---

## API reference

Base URL: `http://localhost:5000/api`

### `/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | — | Create a client account; auto-links to the first workshop; returns JWT |
| POST | `/auth/login` | — | Returns JWT + user object |
| GET | `/auth/me` | Bearer | Current user + associated profile |
| POST | `/auth/forget-password` | — | ⚠️ Stub — returns a success message, sends no email |

### `/client` — requires authentication

| Method | Endpoint | Description |
|---|---|---|
| GET | `/client/dashboard` | Order counts + 3 most recent bookings and towing requests |
| GET | `/client/profile` | User details, all workshops, currently selected workshop |
| POST | `/client/profile` | Update `first_name`, `last_name`, `email` |
| POST | `/client/select-shop` | Set the preferred workshop (`select_shop_id`) |
| GET | `/client/service-orders` | All bookings with aggregated service line items + status counts |
| GET | `/client/towing-orders` | All towing requests + status counts |

### `/portal` — requires authentication (except `GET /portal/blogs`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/portal/services` | Active services for the caller's selected workshop |
| POST | `/portal/book-service` | Create a booking; generates OTP; creates Stripe intent if `payment_method='online'` |
| GET | `/portal/bookings/:id` | Booking detail with workshop info, line items, computed total |
| PUT | `/portal/bookings/:id` | Edit a booking (blocked when `completed` or `cancelled`) |
| DELETE | `/portal/bookings/:id` | Soft cancel — sets `status='cancelled'` |
| POST | `/portal/bookings/:id/verify-otp` | On match: `otp_verified=true`, `status='completed'` |
| POST | `/portal/bookings/:id/pay` | Create/refresh a PaymentIntent (⚠️ no frontend caller) |
| POST | `/portal/payment/verify` | Marks `is_paid=true` and regenerates the OTP |
| POST | `/portal/towing` | Create a towing request; generates OTP |
| GET | `/portal/towing/:id` | Towing detail with workshop info |
| PUT | `/portal/towing/:id` | Edit a towing request |
| DELETE | `/portal/towing/:id` | Soft cancel |
| POST | `/portal/towing/:id/verify-otp` | On match: `otp_verified=true`, `status='completed'` |
| GET | `/portal/blogs` | List posts — **the only public endpoint on this router** |
| POST/PUT/DELETE | `/portal/blogs[/:id]` | Blog CRUD |
| POST | `/portal/contact` | Submit a contact message, routed to the caller's selected workshop |

### `/shop` — requires `is_staff`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/shop/dashboard` | Workshop profile + counts + 5 most recent bookings and towing requests |
| GET | `/shop/profile` | Workshop profile + full service catalog (including inactive) |
| PUT | `/shop/profile` | Update the workshop profile (creates one if missing) |
| POST | `/shop/services` | Add a service offering |
| PUT | `/shop/services/:id` | Update a service offering |
| DELETE | `/shop/services/:id` | ⚠️ Hard delete — see Known issues |
| GET | `/shop/service-orders` | Bookings for this workshop + status counts |
| PUT | `/shop/service-orders/:id` | Update status and/or customer fields |
| GET | `/shop/towing-orders` | Towing requests for this workshop + status counts |
| PUT | `/shop/towing-orders/:id` | ⚠️ Update — see Known issues |
| GET | `/shop/messages` | Contact messages + read/unread stats |
| GET | `/shop/messages/:id` | Fetch one message — also marks it read as a side effect |
| PUT | `/shop/messages/:id` | Set `is_read` |

### `/admin` — requires `is_superuser`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/dashboard` | Platform-wide counts + 6 most recent bookings and towing requests |
| GET | `/admin/services` | All bookings across all workshops |
| DELETE | `/admin/services/:id` | Hard delete a booking |
| GET | `/admin/towing` | All towing requests across all workshops |
| DELETE | `/admin/towing/:id` | Hard delete a towing request |
| GET | `/admin/providers` | All workshops with owner username/email |
| POST | `/admin/add-provider` | Create a staff user + workshop profile |
| DELETE | `/admin/providers/:id` | ⚠️ Deletes a `users` row by id — see Known issues |

### Health

`GET /api/health` → `{ "status": "ok", "timestamp": "..." }`

---

## Available scripts

### Backend

| Command | What it does |
|---|---|
| `npm start` | Start the server with plain `node` |
| `npm run dev` | Start with `nodemon` (auto-restart) |
| `node db/init.js` | Create the database, apply the schema, seed demo data |
| `node fix_passwords.js` | Reset the three demo account passwords |

### Frontend

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | Run `oxlint` |

There is no test suite in either package.

---

## Troubleshooting

**`ECONNREFUSED 127.0.0.1:5434`**
PostgreSQL is not running, or it is listening on a different port. Check with `psql -U postgres -c "SHOW port;"` and reconcile against your `.env`.

**`password authentication failed for user "admin"`**
The `admin` role was not created, or the password differs. Either run the `CREATE ROLE` statement from Step 3, or set `DATABASE_URL` to a role that does exist.

**`database "autocare_db" does not exist`**
Run `node db/init.js`. If it fails at the `CREATE DATABASE` step, your `PG_BASE_URL` credentials are wrong.

**Seeding says "Database already initialized with records"**
The `users` table is non-empty, so seeding is skipped by design. To reseed from scratch:

```bash
psql -U postgres -c "DROP DATABASE autocare_db;"
node db/init.js
```

**Login returns "Invalid username or password" with a demo account**
The password hashes are out of sync. Run `node fix_passwords.js`.

**Frontend loads but every page is empty and the console shows 401s**
Your JWT expired or `JWT_SECRET` changed after the token was issued. There is no automatic logout — clear it manually:

```js
localStorage.removeItem('autocare_token')
```

Then reload and log in again.

**Frontend cannot reach the API / CORS errors**
Confirm the backend is up (`curl http://localhost:5000/api/health`). If it runs on a non-default port, set `VITE_API_URL` in `frontend/.env` and restart Vite — Vite only reads env files at startup.

**Tailwind styles are not applied**
Make sure you ran `npm install` in `frontend/` (Tailwind, PostCSS and autoprefixer are devDependencies) and restart the dev server.

**Icons show as empty squares**
Font Awesome loads from a CDN in `index.html`. Check your network connection or bundle it locally.

**Prisma commands fail**
Expected — `prisma/schema.prisma` and `prisma.config.ts` exist but nothing at runtime uses Prisma. All queries are raw SQL through `pg`. You can ignore Prisma entirely.

---

## Known issues

The items below are confirmed defects in the current codebase, verified against both the frontend caller and the backend handler. Several are silent — the code runs without erroring, the feature just does not work.

### Data loss

- **Changing a towing status wipes customer data.** `ShopDashboard` and `ShopTowingOrders` send only `{ status }`, but `PUT /api/shop/towing-orders/:id` unconditionally overwrites `full_name`, `phone_number`, `vehicle_details` and `pickup_address` with the absent values, setting them to `NULL`. The equivalent service-order handler has `!== undefined` fallback guards; the towing one does not.
- **Deleting a provider deletes the wrong user.** The frontend passes `admin_profiles.id`, but `DELETE /api/admin/providers/:id` runs `DELETE FROM users WHERE id = $1`. Once the two ID sequences diverge, this destroys an unrelated account — potentially a client or the super admin — and cascades their records.
- **Service offerings are hard-deleted** while `service_booking_items` still references them, orphaning historical booking line items and changing past invoice totals.

### Security

- **Missing ownership checks (IDOR).** The `GET`, `PUT`, `DELETE` and `verify-otp` handlers under `/api/portal/bookings/:id` and `/api/portal/towing/:id` only verify that *a* valid JWT is present, never that the record belongs to the caller. Any authenticated user can read, cancel or complete another user's record by guessing a sequential integer ID — and the `GET` response includes the OTP.
- **Payment can be forged.** `POST /api/portal/payment/verify` never contacts Stripe. It looks the booking up and sets `is_paid = true` unconditionally.
- **The OTP mechanism does not work as designed.** The OTP is shown to the client in cleartext in five places, and the only verify endpoint is client-facing. Workshops have no endpoint or UI to verify it. The client therefore holds both the secret and the completion button. There is also no expiry, attempt limit, or rate limit.
- **Live demo credentials are hardcoded into the login page** markup, un-gated by environment.
- **`JWT_SECRET` falls back to a hardcoded literal** when unset.
- **CORS is fully open** (`app.use(cors())`).

### Broken features (frontend ↔ backend contract mismatches)

| Feature | Cause |
|---|---|
| Provider onboarding | Frontend calls `POST /admin/providers`; only `POST /admin/add-provider` exists → 404 |
| Admin services list | Frontend reads `res.data.bookings`; backend sends `{ services }` → always empty |
| Admin dashboard | 6 of 7 stat keys differ from what the backend sends → KPIs read 0, tables empty |
| Admin revenue KPI | `total_service_revenue` cannot be computed — no amount column exists on `service_bookings` |
| Shop messages: mark read | Calls `PUT /shop/messages/:id/read`, which does not exist (the real route is `PUT /shop/messages/:id` with `{ is_read }`) |
| Shop messages: delete | No `DELETE /shop/messages/:id` handler exists |
| Shop messages: unread badge | Frontend reads `unread_count`; backend sends `stats.not_read_message` |
| "Confirmed" filter tab | `GET /shop/service-orders` never computes `counts.confirmed`, so confirmed bookings appear only under "All" |
| Public pages for guests | `/services-info` and `/contact` are public routes, but `GET /portal/services` and `POST /portal/contact` both require auth → guests silently see empty pages and hardcoded fallback text |
| `POST /portal/bookings/:id/pay` | No frontend caller — dead endpoint |
| `PUT`/`DELETE /portal/blogs/:id` | No frontend caller |
| Password reset | `POST /auth/forget-password` is a stub that sends no email |

### Other notable bugs

- **Towing GPS silently falls back to hardcoded coordinates.** On any geolocation failure, `RequestTowingPage` writes `23.022500, 72.571400` (Ahmedabad) and displays a green "GPS location locked" confirmation. A tow truck would be dispatched to an address the user never entered.
- **The Stripe payment modal is a simulation** — prefilled test card, `setTimeout`, no Stripe.js; `client_secret` is never used. Server-side Stripe errors also fall back to fabricated `pi_mock_*` intent IDs instead of surfacing an error.
- **Verify-OTP and Pay buttons are not gated by status** — a `cancelled` or `pending` booking can be jumped straight to `completed`.
- **No axios response interceptor**, so expired tokens produce silent per-page 401s instead of a logout and redirect.
- **Two dashboard metric cards are mislabeled** (`total_service_orders` shown as "Completed Services"; `total_customer` shown as "Total Jobs Logged").
- **Empty-state guards use `?.length === 0`**, so a failed fetch renders a headers-only table instead of the empty state.
- **No mobile navigation** — the navbar is `hidden lg:flex` with no hamburger menu.
- **No pagination or search** on any list view; admin pages render the entire table into the DOM.
- **Cancel gating is inconsistent** between bookings (`pending`, `confirmed`) and towing (`pending`, `processing`).
