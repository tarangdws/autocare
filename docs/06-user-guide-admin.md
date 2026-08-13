[← Back to index](./README.md)

# 06 — Platform Admin Guide

For the platform operator — the person who runs the network rather than a single workshop.

**Demo login:** `superadmin` / `adminpass`

---

## Contents

- [What the platform admin role is for](#what-the-platform-admin-role-is-for)
- [Your dashboard](#your-dashboard)
- [Onboarding a workshop](#onboarding-a-workshop)
- [The workshop directory](#the-workshop-directory)
- [The global booking registry](#the-global-booking-registry)
- [The global towing registry](#the-global-towing-registry)
- [Accessing a workshop portal](#accessing-a-workshop-portal)
- [What you cannot do](#what-you-cannot-do)
- [Critical warnings](#critical-warnings)
- [Operating checklist](#operating-checklist)

---

## What the platform admin role is for

The platform admin is the network operator. The role exists to do three things:

1. **Onboard workshops** — provision a login and a business profile so a new garage can start taking work
2. **Oversee activity** — see bookings and towing jobs across every workshop in one place
3. **Clean up records** — remove bad or test data

You are deliberately *not* an operator of individual jobs. You cannot change a booking's status, reassign a job to a different workshop, or mark something paid. Day-to-day job handling belongs to the workshops.

**One account, seeded not created.** There is no UI for creating another platform admin — the demo account comes from the seed script. Promoting a user requires a direct database update:

```sql
UPDATE users SET is_superuser = true WHERE username = 'someone';
```

Note that the role flags live inside the JWT, so the user must log out and back in for a promotion to take effect.

**Super admin passes staff checks too.** Because `requireStaff` admits super admins, you can open any `/shop/*` screen — see [Accessing a workshop portal](#accessing-a-workshop-portal).

---

## Your dashboard

`/admin/dashboard`

**Intended contents:** four platform-wide KPI tiles (workshops, registered accounts, total bookings, total towing jobs), a gross revenue banner, and two recent-activity feeds covering all workshops.

> ### ⚠️ This dashboard is currently non-functional
>
> The page reads seven values from the API; **six of them use different names than the API sends.** Only the towing count lines up.
>
> | Tile | Reads | API sends | Displays |
> |---|---|---|---|
> | Workshops | `total_shops` | `total_provider` | 0 |
> | Registered accounts | `total_users` | `total_user` | 0 |
> | Total bookings | `total_services` | `total_service` | 0 |
> | Total towing | `total_towing` | `total_towing` | ✅ correct |
> | Revenue banner | `total_service_revenue` | *(not sent)* | ₹0 |
> | Recent bookings | `recent_bookings` | `all_service` | empty table |
> | Recent towing | `recent_towing` | `all_towing` | empty table |
>
> **Do not read this page as a report.** Three tiles show zero, the revenue figure shows ₹0, and both activity tables are blank — none of which reflects reality.
>
> The fix is renaming the keys on one side. See [07 — Feature Catalog](./07-features.md#platform-dashboard).

### The revenue figure needs more than a rename

`total_service_revenue` cannot be computed at all, because **`service_bookings` has no amount column.** Order totals are derived at read time by summing current catalog prices.

To make revenue real you need a `total_cost` column written at booking time, plus per-item price snapshots. Until then, treat the revenue banner as a placeholder, not a broken number.

### In the meantime

Use the two registry pages — `/admin/services` and `/admin/towing` — for actual oversight. Both work correctly and show every record with filters.

---

## Onboarding a workshop

`/admin/add-provider` — the main thing this role does.

### The form

**Business details**

| Field | Required | Notes |
|---|---|---|
| Shop name | ✅ | What customers see in their workshop selector |
| Manager / owner name | ❌ | The only optional field |
| Phone number | ✅ | Shown to customers on job detail pages |
| City | ✅ | Defaults to *Ahmedabad* — change for other locations |
| Shop address | ✅ | Shown to customers for drop-off |

**Portal login credentials**

| Field | Required | Notes |
|---|---|---|
| Username | ✅ | What the workshop logs in with. Must be unique platform-wide |
| Email | ✅ | Must be unique platform-wide |
| Password | ✅ | You set the initial password and communicate it out of band |

### > ⚠️ This form does not currently work

It posts to an endpoint that does not exist, so every submission returns a 404 and shows the generic error *"Failed to register workshop provider."*

**The fix is one line** in `SuperAdminAddProviderPage.jsx` — change `/admin/providers` to `/admin/add-provider`. Give this to your developer; it is the highest-value single-line fix in the codebase.

### Onboarding manually until it is fixed

The endpoint itself works — only the frontend path is wrong. Two workarounds:

**Option A — call the API directly**

```bash
# Log in as super admin to get a token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"superadmin","password":"adminpass"}' | jq -r .token)

# Create the workshop
curl -X POST http://localhost:5000/api/admin/add-provider \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "new_garage",
    "email": "owner@newgarage.com",
    "password": "choose-a-strong-one",
    "full_name": "Owner Name",
    "shop_name": "New Garage Auto Care",
    "phone_number": "9876543210",
    "city": "Surat",
    "shop_address": "12 Ring Road, Adajan"
  }'
```

**Option B — insert directly in SQL** (you must hash the password yourself with bcrypt; do not store plaintext).

### What a successful onboarding creates

```
users
  username, email, bcrypt(password)
  first_name = manager name, last_name = ''
  is_staff = true, is_superuser = false

admin_profiles
  user_id → the new user
  full_name, shop_name, phone_number, city, shop_address
```

**Not wrapped in a transaction.** If the second insert fails you get an orphaned staff user with no workshop profile — that account will see "Shop profile not found" on every workshop screen. Check the directory after onboarding to confirm the profile exists.

### After onboarding

The new workshop can log in immediately, but their portal is empty. Tell them to:

1. Review and complete their profile on `/shop/profile`
2. **Add services to their catalog** — customers cannot book anything until they do
3. Check their dashboard for incoming jobs

Also worth knowing: **new customers are auto-assigned to the first-registered workshop**, not to the newest one. A workshop onboarded later relies on customers explicitly selecting them. There is no discovery or rotation mechanism.

---

## The workshop directory

`/admin/providers`

A table of every workshop with:

- Profile ID
- Shop name and manager name
- City and address
- Phone number
- Portal login username and email
- Registration date
- A delete button

### > 🔴 The delete button deletes the wrong account

This is the most dangerous control in the application.

The list shows workshop *profile* IDs, but the delete request is handled as a *user* ID. The two sequences diverge as soon as any non-workshop user exists.

In the seeded database:

```
users                          admin_profiles
  1  superadmin                  1 → user 2   AutoFusion Main Hub
  2  autocare_main  (staff)      2 → user 3   Elite Motors & Towing
  3  elite_motors   (staff)
  4  john_doe       (client)
```

Clicking delete on **Elite Motors & Towing** (profile ID 2) issues `DELETE FROM users WHERE id = 2` — removing **`autocare_main`**, the *other* workshop, along with its profile, catalog, bookings and towing history. Elite Motors is untouched.

Depending on how IDs line up in your database, the same click could delete **a customer and all their history**, or **your own super admin account**.

The handler also returns success regardless of whether any row matched, so there is no warning.

> ### 🔴 Do not use this button until it is fixed.
>
> To remove a workshop, do it in SQL where you can verify the target first:
>
> ```sql
> -- 1. Inspect before deleting
> SELECT ap.id AS profile_id, ap.shop_name, u.id AS user_id, u.username
> FROM admin_profiles ap JOIN users u ON ap.user_id = u.id;
>
> -- 2. Delete by the USER id, having confirmed it
> DELETE FROM users WHERE id = <the correct user_id>;
> ```

**The fix** is passing `p.user_id` instead of `p.id` in `SuperAdminProvidersPage.jsx`, plus a defensive join in the backend handler. See [03 — Flows](./03-flows.md#-deleting-a-provider-deletes-the-wrong-user).

### What deleting a workshop cascades to

| Data | Effect |
|---|---|
| `admin_profiles` | Deleted |
| `service_offerings` | Deleted |
| `select_shops` rows pointing at it | `select_shop_id` set to `NULL` — those customers fall back to the first workshop |
| `service_bookings` | `shop_id` set to `NULL` — records survive, orphaned from any workshop |
| `towing_requests` | Same |
| `contact_messages` | Same |
| Blog posts authored by that user | Deleted |

Orphaned bookings still appear in your global registry and in the customer's own order list, but no workshop can see or act on them.

### What is missing here

- **No edit.** You cannot correct a shop name, phone or address — the workshop must do it themselves, or you go into SQL.
- **No suspend or deactivate.** The only lever is deletion, which is irreversible. A workshop you want to pause has to be deleted or left active.
- **No detail view** — no per-workshop job counts, revenue or activity.
- **No password reset** for a workshop that has lost access.

---

## The global booking registry

`/admin/services`

Every service booking across every workshop, newest first, with filter tabs: All · Pending · Processing · Completed · Cancelled.

Each row shows the booking ID, customer name and phone, the workshop, vehicle info, requested date and time, payment status, current status, the OTP, and a delete button.

> ### ⚠️ This page currently always shows empty
>
> It reads the wrong key from the API response — `bookings` where the server sends `services`. The table permanently displays *"No bookings matching criteria."*
>
> **The fix is one word:** `res.data.services` instead of `res.data.bookings` in `SuperAdminServicesPage.jsx`. Once corrected, the page works fully.

### Once it works

Use it for oversight — spot-checking activity, investigating a complaint, finding test records to clean up.

The **delete** button performs a **hard delete** with confirmation. The booking and its line items are removed permanently. This is the right tool for clearing test data and the wrong one for anything else — there is no soft-delete or restore. To *cancel* a real booking rather than erase it, ask the workshop to set its status to Cancelled.

Note the city column will be blank: the underlying query selects the workshop name but not its city, while the table tries to render one.

There is also no pagination or search — the page renders every booking in the database into one table.

---

## The global towing registry

`/admin/towing`

Every towing request across every workshop. Filter tabs: All · Pending Driver · Driver En Route · Completed · Cancelled.

Rows show the request ID, customer name and phone, workshop, vehicle details, pickup address, GPS coordinates, status, OTP, and a delete button.

**This page works correctly** — it reads the right response key. It is your most reliable oversight surface today.

Two things to watch for:

**Blank name, phone and address on dispatched jobs.** Any towing job whose status a workshop has changed will show empty customer fields — the status update wipes them. A registry full of nameless towing records is the symptom of that bug, not a data-entry problem. See [Critical warnings](#critical-warnings).

**Repeated coordinates `23.022500, 72.571400`.** These are the hardcoded fallback the client app substitutes when a customer's GPS fails. Multiple jobs sharing exactly these coordinates means GPS capture is failing, not that everyone broke down in the same spot.

As with bookings, the city column is blank and delete is a hard delete.

---

## Accessing a workshop portal

Because `requireStaff` admits super admins, you can open any `/shop/*` route directly — for example by typing `/shop/dashboard` into the address bar.

**But you will see nothing useful.** Every workshop endpoint scopes by *your own* `admin_profiles` row, looked up by your user ID. The super admin account has no workshop profile, so those endpoints return "Shop profile not found."

**There is no impersonation feature.** To see a workshop's portal as they see it, you need their credentials. Bear this in mind when supporting a workshop — you cannot reproduce their view.

---

## What you cannot do

Worth being explicit, since several of these look like they should be possible:

| Capability | Available? |
|---|---|
| Change a booking's or towing job's status | ❌ Workshop-only |
| Reassign a job to a different workshop | ❌ Not possible in the UI |
| Mark a booking paid | ❌ Workshop-only |
| Manage any workshop's catalog | ❌ Workshop-only |
| Edit a workshop's profile | ❌ Workshop-only |
| Suspend a workshop without deleting it | ❌ No such control |
| Reset a workshop's password | ❌ SQL only |
| Create another platform admin | ❌ SQL only |
| View or manage customer accounts | ❌ No customer list at all |
| Delete a customer | ❌ SQL only |
| Read any workshop's message inbox | ❌ Workshop-only |
| Issue refunds | ❌ No payment controls |
| Export data | ❌ No export |
| See an audit log | ❌ None exists |
| Impersonate a workshop | ❌ Not supported |
| Publish blog articles | ✅ Yes — via `/blog` |

The absence of a **customer list** is notable: you can see every booking a customer made but never a list of customers themselves. Any user-level administration goes through SQL.

---

## Critical warnings

### 1. 🔴 The provider delete button deletes the wrong account

Detailed above. **Do not use it.** Delete workshops in SQL after confirming the correct `user_id`.

### 2. 🔴 Workshop towing status changes destroy customer data

Not your action, but it shapes what you see. When a workshop changes a towing job's status, the customer's name, phone, vehicle details and pickup address are permanently blanked. Only GPS survives.

**Your towing registry is where this becomes visible** — dispatched jobs appear with empty customer fields. Escalate this fix first; it is actively losing customer data in production.

### 3. 🟠 Your dashboard is not a report

Three tiles read zero, revenue reads ₹0, and both activity tables are empty because of key mismatches. Use the registry pages instead.

### 4. 🟠 Deletes are permanent

Every delete on your side is a hard delete with no restore. Take a database backup before any cleanup session.

### 5. 🟠 "Paid" does not mean paid

Online payment is a simulation that contacts no payment processor. Paid badges across your registries are status flags, not receipts.

### Also worth knowing

- The onboarding form 404s — use the API or SQL until it is fixed
- City columns are blank throughout (the query omits the field)
- No pagination — registries render every row in the database
- Double-clicking a delete button fires two requests
- Failed fetches look identical to empty results — a 401 or 500 shows a normal-looking empty table
- The seeded demo credentials, including yours, are hardcoded into the login page. **Remove that panel and change these passwords before any real deployment.**

---

## Operating checklist

### First-time setup

- [ ] Log in as `superadmin` and **change the password** *(currently requires SQL — see below)*
- [ ] Have your developer remove the demo-credentials panel from the login page
- [ ] Have your developer set a real `JWT_SECRET` in the backend environment
- [ ] Apply the four one-line fixes: onboarding path, provider delete ID, services response key, dashboard keys
- [ ] Fix the towing status handler — highest priority
- [ ] Delete the seeded demo workshops and the `john_doe` account before going live
- [ ] Set up database backups

> **Changing your own password** has no UI for the super admin role. Use `backend/fix_passwords.js` as a template, or hash a new password with bcrypt and update the row directly.

### Onboarding a new workshop

- [ ] Collect business details: name, manager, phone, city, address
- [ ] Choose a username and generate a strong initial password
- [ ] Create the account (API call or SQL until the form is fixed)
- [ ] Confirm the workshop appears in `/admin/providers` with a profile — catching orphaned users
- [ ] Send credentials through a secure channel
- [ ] Tell them to add catalog services before expecting bookings
- [ ] Follow up in a few days to confirm their catalog is populated

### Weekly oversight

- [ ] `/admin/towing` — scan for dispatched jobs with blank customer fields, and for repeated `23.022500, 72.571400` coordinates
- [ ] `/admin/services` *(once the key is fixed)* — check the Pending tab for bookings sitting unacknowledged, which indicates a workshop not using the system
- [ ] `/admin/providers` — confirm every workshop has complete profile details
- [ ] Spot-check that active workshops have services in their catalog
- [ ] Clear out test records

### Before scaling up

- [ ] Add database indexes on `shop_id` and `user_id` — see [02 — Architecture](./02-architecture.md#scaling-considerations)
- [ ] Add pagination to the registry pages
- [ ] Wire up real Stripe payments and remove the mock paths
- [ ] Add ownership checks to the client-facing detail endpoints
- [ ] Add a `total_cost` column so revenue reporting becomes possible
- [ ] Move OTP verification to the workshop side
- [ ] Restrict CORS to known origins
- [ ] Add an audit log for status changes and paid-flag toggles

---

**Next:** [07 — Feature Catalog](./07-features.md) for the complete build-status inventory, or [08 — Use Cases](./08-use-cases.md) for deployment fit.
