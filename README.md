# ApnaKirana — Local Shop Delivery Platform

A full-stack local delivery app — Customer, Shopkeeper, and Admin roles
— on **Firebase Firestore**, with live delivery tracking on a real
map, real-time order updates, ratings, wishlist, payments, and more.

```
apnakirana/
├── backend/     ← Node.js + Express + Firestore + Socket.IO API
└── frontend/    ← React + Vite + Tailwind + Leaflet app
```

## 1. Set up a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project (free tier is enough).
2. In the left sidebar, click **Build → Firestore Database → Create database**. Start in **production mode** (the backend uses admin credentials that bypass security rules anyway).
3. Get your backend credentials: **Project Settings (gear icon) → Service Accounts → Generate new private key**. This downloads a JSON file.
4. Rename that file to `serviceAccountKey.json` and place it directly in the `backend/` folder (next to `package.json`).

   **This file is a secret — never commit it or share it.** It's already covered by `.gitignore`.

   *Alternative if you'd rather not use a JSON file* (e.g. deploying somewhere that only supports env vars): open the JSON file, and copy `project_id`, `client_email`, and `private_key` into `backend/.env` as `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` (keep the `\n` sequences in the private key literal, don't turn them into real line breaks).

## 2. Run the backend

```bash
cd backend
npm install
node data/seed.js   # creates demo data in Firestore (safe to re-run — it wipes and reseeds)
npm run dev
```

Runs on **http://localhost:5000**. Check http://localhost:5000/api/health.

If you see `❌ No Firebase credentials found` on startup, double-check step 1.4 above — the server refuses to start rather than silently failing later.

## 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on **http://localhost:5173**. Both servers must be running.

## 4. Log in

OTP defaults to dev mode: always `1234`.

| Role | Phone | Notes |
|---|---|---|
| Customer | `9876543210` | Rahul Sharma |
| Shopkeeper | `9998887776` | Suresh Kirana Store (pre-approved) |
| Admin | `9000000000` | Only exists via seed |

## About this Firebase migration

This project started on SQLite, then PostgreSQL, and is now on
**Firestore**. Firestore is NoSQL — collections of documents, not
tables of rows — so this wasn't just a connection-string swap. Here's
what actually changed and why:

- **`db.js`** was rewritten around the Firebase Admin SDK, but kept the
  exact same function names (`getAll`, `getOne`, `insertRow`,
  `updateRow`, `deleteRow`, `getNextId`) as the SQL versions had. Most
  routes (`products.js`, `auth.js`, `payment.js`) needed **zero
  changes** as a result.
- **Firestore has no SQL**, so anything that used to be a `WHERE`/`ORDER
  BY`/`JOIN`/`AVG()` had to become a `getAll()` fetch followed by plain
  JavaScript filtering, sorting, or aggregation:
  - `orders.js` — listing/filtering by phone+status, and CSV export, now sort in JS after fetching.
  - `stats.js` / `admin.js` — all the dashboard math (revenue sums, status counts) was already JS-side reduction over an array; only the data-fetching call changed.
  - `reviews.js` — the shop's live average rating is now a JS `reduce()` over that shop's reviews instead of a SQL `AVG()`.
  - `wishlist.js` — the SQL `JOIN` between wishlist entries and products became two fetches combined with `Promise.all()`.
- **No auto-increment IDs** — Firestore has no SQL `SERIAL` column, so
  `getNextId()` now uses a Firestore **transaction** on a per-prefix
  counter document, which gives the same "no two requests ever get the
  same ID" guarantee a SQL sequence did.
- **No schema migrations** — Firestore collections are created
  implicitly on first write, so there's no `CREATE TABLE` step. `data/seed.js`
  just deletes and rewrites documents directly.

### What I could and couldn't verify without your real project

I don't have a real Firebase project or credentials in the environment
I built this in, so I couldn't run the seed script or hit real
Firestore end-to-end the way I did for the earlier SQLite/Postgres
versions. What I *did* verify:
- Every file passes a Node.js syntax check.
- The server starts and correctly refuses with a clear error message when no credentials are present (instead of crashing with a confusing stack trace).
- With a structurally valid (but fake) service account key, the server boots cleanly and the seed script correctly attempts a real network call to `firestore.googleapis.com` — it fails only because the fake key isn't a real Google-issued credential and my sandbox's network can't reach Google's servers at all, not because of a bug in the code.

**Please run `node data/seed.js` yourself as the first real test** once
you've set up your own Firebase project per the steps above, and let
me know if anything doesn't behave as expected — I'll fix it fast.

## Live delivery tracking — how it works

There's no real delivery-partner GPS feed in this project (that would
need an actual rider-facing app), so this **simulates** one realistically:

1. At checkout, tapping **"Use my current location"** captures your
   browser's real coordinates and saves them with that address.
   Optional — orders work without it, they just won't have a live map.
2. When the shopkeeper marks an order **"Out for Delivery,"** the
   backend (`deliverySimulation.js`) moves a simulated rider position
   from the shop's coordinates toward your delivery pin over about a
   minute, ticking every 2.5 seconds.
3. Every tick broadcasts instantly over Socket.IO (`order:location`) to
   your Order Tracking page, rendered on a real OpenStreetMap map (via
   Leaflet — free, no API key needed).
4. Stops automatically at "Delivered."

## Real OTP & real payments

Both have production-ready integrations with a dev-mode fallback —
**you need your own accounts and keys**, which I can't create on your behalf:

**Real OTP (Twilio Verify):** create a [Verify Service](https://www.twilio.com/docs/verify), then set `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_VERIFY_SERVICE_SID` in `backend/.env` and restart.

**Real payments (Razorpay):** create a [Razorpay account](https://razorpay.com), then set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `backend/.env` and restart.

Leave either blank and dev mode keeps working exactly as before.

## Everything included

- **Core shopping flow**: browse → search/filter → cart → checkout with saved address book → place order → **live map tracking** → reorder
- **Payments**: COD works immediately; UPI/Card go through Razorpay (real or simulated)
- **Real-time**: Socket.IO pushes order updates and rider location instantly
- **Ratings & reviews**: one review per delivered order, live shop-rating average
- **Wishlist**: heart any product, dedicated Wishlist page
- **Order cancellation**: customer can cancel while still Pending
- **Shopkeeper product management**: full CRUD + image upload + stock toggle
- **CSV export**: shopkeeper's own sales, or platform-wide for admin
- **Admin panel**: platform stats, shop approval, all-orders view, user suspension
- **Dark mode**, **toasts**, **skeletons**, **browser notifications**

## Architecture

### Backend (`/backend`)
- `server.js` — Express + raw HTTP server (for Socket.IO), route mounting, error handling
- `db.js` — **Firestore** (via `firebase-admin`) — collections + async CRUD helpers
- `deliverySimulation.js` — moves a simulated rider from shop → destination coordinates in real time
- `realtime.js` — Socket.IO wrapper; rooms per shop/customer/admin
- `middleware/auth.js` — JWT issue/verify, `requireAuth`, `requireRole(...roles)`
- `middleware/errorHandler.js` — consistent error shape + `asyncHandler` wrapper
- `schemas.js` — Zod validation schemas
- `routes/` — `auth`, `products`, `orders`, `stats`, `admin`, `reviews`, `wishlist`, `payment`

### Frontend (`/frontend/src`)
Unchanged by this migration — it only ever talks to our own API, never
directly to the database. `services/`, `components/`, and `pages/` are
exactly as documented in earlier notes: cart, orders, address book with
geolocation, live tracking map, admin panel, shopkeeper product
management, wishlist, dark mode.

## Known simplifications / honestly deferred

- **Simulated, not real, delivery GPS.**
- **Dedicated delivery-partner role**, **PWA/offline support**, **staff logins per shop** — each a meaningfully larger effort.
- Push notifications only fire while a tab is open.
- Firestore queries here favor simplicity (fetch-then-filter-in-JS) over the most query-efficient Firestore patterns (composite indexes, `.orderBy()` chains) — fine at this project's scale, worth revisiting if order volume grows large.

## Before deploying anywhere public

- Real Twilio + Razorpay credentials
- Firestore **security rules** reviewed (the backend's admin SDK bypasses them, but if you ever add direct client-side Firestore access, rules matter a lot)
- A random, real `JWT_SECRET`
- HTTPS, stricter CORS, general API rate limiting (currently only OTP is rate-limited)
- Logging/monitoring, automated tests
- Terms of service / privacy / refund policy pages once real payments are live
