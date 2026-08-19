# HR Onboarding, KYC, Document Verification & Biometric Management System

A production-ready system for digitally onboarding candidates: registration, KYC capture,
address details, document checklist/upload/verification, original document verification,
photo capture, left/right hand biometric capture, declaration, signature, and final
submission — all driven by a Super-Admin-only backend with a full audit trail.

## Overview

- **Single login role**: Super Admin only. Coordinators are pure data records (no login).
- **Stepper onboarding wizard**: Registration → KYC → Address → Documents (checklist →
  upload) → Verification → Original Verification → Photo → Left Biometric → Right
  Biometric → Declaration → Signature → Final Review → Submit. Every step persists to the
  backend immediately — nothing lives only in React state.
- **DB-configurable document types** — not hardcoded in the frontend.
- **Biometric & KYC integrations are pluggable, not faked.** A mock biometric provider
  generates realistic (but clearly simulated) quality scores/capture references so the
  whole flow works end-to-end in dev/demo. A vendor SDK integration is stubbed but
  intentionally unimplemented (see below). No raw fingerprint images are ever stored.
- **Full audit trail**: every sensitive action is written to `audit_logs`; every status
  change is written to `application_status_history`.

## Architecture & Stack

- **Backend**: Node.js + Express, MySQL via `mysql2/promise` (connection pool, raw
  parameterized SQL, no ORM), JWT auth (`jsonwebtoken`), `bcrypt`, `helmet`, `cors`,
  `express-rate-limit`, `express-validator`, `multer` (disk-backed uploads validated by
  mimetype/extension/size), `morgan` (scrubbed request logging), `uuid`.
- **Frontend**: React + Vite (JavaScript), `react-router-dom` v6, `axios`, hand-rolled CSS
  design system (no UI kit dependency), a hand-rolled canvas signature pad (pointer
  events), native `getUserMedia` webcam capture, inline SVG bar/pie charts.
- **Database**: MySQL, schema in `backend/database/schema.sql`, seed data in
  `backend/database/seed.sql`.

## Folder Structure

```
backend/
  src/
    controllers/   route handlers
    routes/        express routers
    services/      business logic (candidate numbering, storage, settings, submit validation)
    middleware/     auth, validation, upload, error handling
    models/        parameterized SQL data-access modules
    db/pool.js     mysql2 connection pool + withTransaction helper
    biometric/      provider interface + mock/local-device providers + biometricService
    validators/     express-validator chains
    utils/          logger, response shape, jwt, mask, csv, appError
  database/         schema.sql, seed.sql
  storage/          documents/ photos/ signatures/ (never served statically)
  scripts/          seedAdmin.js
  tests/            Jest + Supertest, mocked DB pool
frontend/
  src/
    pages/          top-level routed pages, pages/onboarding/* = wizard steps
    components/      shared UI (Badge, Modal, SignaturePad, charts, ...)
    context/         AuthContext, ToastContext
    layouts/         MainLayout (sidebar + topbar)
    routes/          ProtectedRoute
    services/api.js  axios instance + interceptors
```

Only two top-level app folders exist: `frontend/` and `backend/`. The biometric provider
abstraction lives under `backend/src/biometric/` — there is no third top-level app folder.

## Local Development

### 1. Database setup

Provision a MySQL 8.x server, then:

```bash
mysql -u root -p -e "CREATE DATABASE hrsoftware CHARACTER SET utf8mb4"
mysql -u root -p hrsoftware < backend/database/schema.sql
mysql -u root -p hrsoftware < backend/database/seed.sql
```

`seed.sql` seeds document types, default application settings, 3 demo coordinators, and 5
demo candidates in different statuses — all obviously fictional. It does **not** seed an
admin user.

### 2. Backend

```bash
cd backend
cp .env.example .env      # edit DB_*, JWT_SECRET, etc.
npm install
npm run seed:admin        # creates/updates the Super Admin user (see below)
npm run dev                # nodemon, http://localhost:5000
```

`npm run seed:admin` reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` from `.env` (or
prompts interactively if missing), hashes the password with bcrypt, and inserts/updates the
`users` row. This is the **only** way an admin account is created — never seeded via SQL.

### 3. Frontend

```bash
cd frontend
cp .env.example .env      # set VITE_API_URL if backend isn't on localhost:5000
npm install
npm run dev                 # http://localhost:5173
```

Log in with the email/password you set via `seed:admin`. Login is two-step: after a correct
password, a 6-digit one-time code is emailed to that address (see **Email / OTP Login** below)
and must be entered to complete sign-in.

## Email / OTP Login (Two-Factor)

Super Admin login requires both the password **and** a one-time code emailed to the admin's
address — a stolen password alone cannot log in.

1. `POST /api/auth/login` (email + password) — on success, generates a 6-digit OTP, stores only
   its bcrypt hash in `login_otps`, emails the code, and returns a `preAuthToken` (not a JWT).
2. `POST /api/auth/verify-otp` (`preAuthToken` + `otp`) — on success, issues the real JWT. Codes
   expire after 5 minutes, allow 5 incorrect attempts before requiring a resend, and are
   rate-limited per IP (`/api/auth/verify-otp`) independently of the per-code attempt cap.
3. `POST /api/auth/resend-otp` (`preAuthToken`) — invalidates the previous code and emails a new
   one; requires having already passed the password step.

**Email delivery** goes through `backend/src/services/mailer.js` via SMTP (`nodemailer`),
configured with `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` in
`backend/.env`. Works with any SMTP provider (Hostinger email, Gmail app password, SendGrid
SMTP, etc). If SMTP is **NOT CONFIGURED** and `NODE_ENV` is not `production`, the OTP is written
to the backend console log instead of being emailed, so the flow is testable without real mail
credentials — the login page shows a "check server logs" hint in that case. In production, an
unconfigured SMTP causes login to fail loudly rather than silently leaking the code to logs.

## File Storage

Documents, photos, and signatures are written to `backend/storage/{documents,photos,signatures}/<candidateId>/<uuid><ext>`
— filenames are UUIDs, never the original filename. Files are **never** served via
`express.static` or from `frontend/public`; every read goes through an authenticated
endpoint (`GET /api/documents/:id/view`, `/download`, `GET /api/candidates/:id/photo`)
that checks the JWT and streams the file from disk. A path-traversal guard resolves and
validates the absolute path against the storage root before every read/write.

Since `<img>`/`<a target="_blank">` cannot attach an `Authorization` header, these specific
view/download/report-CSV endpoints also accept a `?token=` query-string fallback in
addition to the standard `Bearer` header — every other route requires the header.

## Biometric Integration

`backend/src/biometric/`:
- `biometricProvider.interface.js` — the contract every provider must implement
  (`getDeviceStatus`, `capture`, `verify`). Only `captureReference`, `qualityScore`, and
  `deviceInfo` ever leave a provider — raw images/templates are never touched.
- `providers/mockBiometricProvider.js` — fully functional simulated scanner. Generates a
  plausible quality score (70-100) and an opaque capture reference so the whole workflow
  completes end-to-end in dev/demo. Clearly labeled as simulated everywhere it surfaces in
  the UI and API responses.
- `providers/localDeviceProvider.js` — intentionally unimplemented stub for a real vendor
  SDK (e.g. Mantra/Morpho/SecuGen). Throws until a real integration is written.
- `biometricService.js` — selects a provider via `BIOMETRIC_PROVIDER=mock|vendor`.

## KYC Integration

`backend/src/services/kyc/`:
- `kycProvider.interface.js` — contract for identity verification providers.
- `manualKycProvider.js` — the default. Records that PAN/Aadhaar were manually entered and
  reviewed against physical documents during document verification. **Never** claims
  government-database verification.
- `providerAdapter.js` — selects a provider via `KYC_PROVIDER=manual|provider`. The
  `provider` mode is an intentionally unimplemented placeholder for a licensed UIDAI/NSDL
  integration — building a fake "verified" response would be misleading.

PAN/Aadhaar are masked in API responses and the UI (e.g. Aadhaar shows only the last 4
digits: `XXXX XXXX 5591`) and are never written to logs.

## Security Notes

- JWT auth on every mutating/sensitive route; role-check middleware kept structured for
  future roles even though only `SUPER_ADMIN` exists today.
- `bcrypt` password hashing, `helmet`, CORS restricted to `CORS_ORIGIN`, rate limiting
  (tighter on `/api/auth/login`), `express-validator` on every mutating route, `mysql2`
  parameterized queries throughout (no string-built SQL).
- All multi-table writes go through `withTransaction` (MySQL transactions).
- `candidate_number` (`CAN-YYYY-NNNNNN`) is generated server-side inside a transaction
  using `SELECT ... FOR UPDATE` against a `counters` table — never trusted from the client.
- `POST /api/candidates/:id/submit` fully re-validates every section server-side
  (`submitValidationService.js`) — the frontend's own completeness checks are UX only.
- Central error handler never leaks stack traces when `NODE_ENV=production`.
- Nothing sensitive (Aadhaar, PAN, passwords, biometric templates, raw file bytes) is ever
  written to logs — `utils/logger.js` scrubs known-sensitive keys.

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for a generic step-by-step guide, including a Hostinger
walkthrough.

## Troubleshooting

- **Backend starts but every request 500s / DB errors on boot**: MySQL isn't reachable or
  the schema hasn't been imported. Verify `DB_*` values in `.env` and that
  `schema.sql`/`seed.sql` have been run.
- **Login fails with "Invalid email or password"**: run `npm run seed:admin` again; check
  `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env` match what you're typing.
- **CORS errors in the browser**: set `CORS_ORIGIN` in `backend/.env` to match the exact
  origin the frontend is served from (protocol + host + port).
- **File upload rejected**: check `MAX_FILE_SIZE_MB` and that the file is PDF/JPG/PNG.
- **Document "View" opens a blank/401 page**: the frontend passes the JWT as `?token=`
  for this specific endpoint since `window.open` can't set headers — confirm you're
  logged in and `VITE_API_URL` is correct.
