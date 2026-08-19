# HR Onboarding & KYC — Mobile (Super Admin)

Flutter mobile companion to the Student/Candidate Digital Onboarding, KYC, Document
Verification and Biometric Management System. This app implements the **Super Admin**
role only — the same role as the existing React web app at `../frontend` — talking to
the same Express + MySQL backend at `../backend`. It does not modify either.

## Prerequisites

- Flutter SDK 3.35.x (Dart 3.9.x), installed and on `PATH`.
- The backend running locally (see `../backend/README.md` / `.env`). By default it
  listens on `http://localhost:5090` in this dev environment (moved off the default
  5000 due to a local port conflict — check `backend/.env` `PORT` if unsure).
- MySQL reachable by the backend (a local Docker container in this dev setup).
- For Android builds: Android SDK + a device/emulator. For iOS: Xcode + simulator
  (macOS only). For web verification: Chrome.

## Setup

```bash
cd mobile
flutter pub get
cp .env.example .env   # then edit .env — see "Configuring the API URL" below
```

`.env` is loaded at startup via `flutter_dotenv` (see `lib/core/config.dart`) and is
gitignored — never commit real environment values. If `.env` is missing entirely, the
app falls back to the Android-emulator default (`http://10.0.2.2:5090/api`) so a fresh
checkout still boots.

## Configuring the API URL

The backend is mounted under `/api` (e.g. `http://localhost:5090/api`). Set
`API_BASE_URL` in `mobile/.env` to the value matching how you're running the app —
**`localhost` from inside an emulator/device does not reach your host machine**:

| Target                              | `API_BASE_URL`                        |
|--------------------------------------|----------------------------------------|
| Android emulator                     | `http://10.0.2.2:5090/api`             |
| Physical Android/iOS device (same Wi-Fi/LAN) | `http://<your-LAN-IP>:5090/api` (find it with `ipconfig`) |
| iOS simulator                        | `http://localhost:5090/api`            |
| `flutter run -d chrome` (web, dev-only) | `http://localhost:5090/api`         |

Note on web + CORS: the backend's `CORS_ORIGIN` (in `backend/.env`) is currently set to
the React app's dev origin only. Browsers enforce CORS; native Android/iOS HTTP clients
(this app uses `dio`) are **not** subject to it, so Android/iOS builds are unaffected.
If you run `flutter run -d chrome` against the real backend and hit a CORS error, add
your Flutter web dev server's origin (e.g. `http://localhost:<port>`) to
`backend/.env`'s `CORS_ORIGIN` yourself — this app does not modify `backend/.env`.

## Running

```bash
flutter run                       # picks a connected device/emulator
flutter run -d chrome             # web, for quick iteration/verification
flutter run -d <device-id>        # a specific target from `flutter devices`
```

To override the API URL per-run without editing `.env`, you can also pass
`--dart-define=API_BASE_URL=...` — see `lib/core/config.dart` if you want to wire that
as an alternative source (the current implementation reads `.env` only).

## Demo login

Two-step login: email + password, then a 6-digit email OTP.

- Credentials are seeded server-side — see `backend/.env` (`ADMIN_EMAIL` /
  `ADMIN_PASSWORD`) or `backend/scripts/seedAdmin.js`. Do not hardcode them here.
- If SMTP is not configured on the backend (the default for local dev), the OTP is
  written to the **backend's console log** instead of being emailed, and the login
  screen shows a "check server logs" hint (`devFallback`) — this mirrors the web app's
  behavior exactly and is a development-only fallback.

## Project structure

```
lib/
  main.dart                 Entry point: loads .env, bootstraps auth, runs the app
  app.dart                  MaterialApp.router + theme wiring
  core/                     Theme, spacing, API client, secure storage, config, wizard step map
  models/                   Hand-written Dart data classes (fromJson) matching backend fields exactly
  services/                 One Dio-backed repository per backend resource
  providers/                Riverpod state (auth, service singletons, candidate detail cache)
  routes/                   go_router route table + auth-guard redirect logic
  widgets/                  Shared UI: stat_card, status_badge, empty_state, shimmer, app_shell, etc.
  screens/
    splash/                 Token-validity check -> routes to Login or Dashboard
    auth/                   Two-step login (credentials -> OTP)
    dashboard/              Stat cards, charts, coordinator stats, recent candidates
    coordinators/           List/search/filter + add/edit form + activate/deactivate
    candidates/             List/search/filter, registration, printable summary
    onboarding/             11-step wizard shell + one file per step under steps/
    reports/                Report picker + date range + paginated card list
    settings/               Document types management + application settings
    audit/                  Paginated audit log list
```

State management: **Riverpod** (`flutter_riverpod`) throughout — no mixing with
`Provider` or `setState`-only screens for anything that talks to the network.

Networking: **dio**, with a single shared client (`core/api_client.dart`) that attaches
the Bearer token to every request via an interceptor and clears the session + notifies
the router on a 401, mirroring the web app's axios interceptor.

Routing: **go_router**, with an auth-guard `redirect` callback driven by Riverpod's
`authProvider` (splash -> login -> dashboard, and back to login on logout/401).

## The 11-step onboarding wizard

Registration → KYC → Address → Document Checklist → Document Upload → Document
Verification → Original Verification → Photo → Left Hand Biometric → Right Hand
Biometric → Declaration → Signature → Final Review → Submit.

Every step saves to the backend immediately on "Save & Continue" (PUT/POST per step) —
nothing is held only in local Flutter state across a step boundary. The step order and
resume-after-reopen logic (`lib/core/wizard_steps.dart`) mirror
`backend/src/services/wizardProgressService.js` and
`frontend/src/pages/onboarding/wizardSteps.ts` exactly.

**Biometric capture is a mock/manual abstraction**, matching the backend's
`BIOMETRIC_PROVIDER=mock` provider exactly. There is no real fingerprint SDK
integration anywhere in this app — the biometric screens call
`POST /candidates/:id/biometric/capture` the same way the web app does, and the UI is
explicit that this is a simulated capture, not a verified biometric check. Likewise,
PAN/Aadhaar entry is manual data entry (`KYC_PROVIDER=manual`), never claimed as a
government-verified check.

## Verification performed

- `flutter pub get` — resolves cleanly.
- `flutter analyze` — **0 issues**.
- `flutter test` — smoke tests pass (login screen renders; theme builds).
- `flutter build web` — succeeds, produces `build/web/`.
- `flutter build apk --debug` — succeeds, produces
  `build/app/outputs/flutter-apk/app-debug.apk` (Android SDK cmdline-tools/licenses
  were reported incomplete by `flutter doctor` in this environment, but the debug APK
  build completed anyway; a release build with signing was not attempted).

## Known limitations / deliberate scope decisions

- **Android SDK licensing**: `flutter doctor` reports missing cmdline-tools and
  unresolved licenses in this dev environment. The debug APK build succeeded despite
  this; a release/signed build was not attempted and may need
  `flutter doctor --android-licenses` resolved first.
- **PDF preview**: no native PDF-rendering plugin is bundled (to avoid fighting a
  platform-specific build in this environment). PDFs are handled via "Open Externally"
  (`url_launcher`) against the same auth-token-in-query URL the web app uses for
  `window.open`. Images preview in-app.
- **CSV export**: the reports screens show JSON/paginated views only (the priority per
  spec); the backend's `?format=csv` export is not wired into the mobile UI.
- **Share-as-PDF/image** for the candidate summary was treated as a nice-to-have and
  not implemented; the summary is a well-formatted on-screen, masked-PAN/Aadhaar view.
- **Light theme only**, matching the web app (which is light-only).
- No secrets are hardcoded. The JWT is stored via `flutter_secure_storage` only, and is
  never printed/logged, alongside passwords, OTPs, PAN, Aadhaar, or biometric capture
  references.
