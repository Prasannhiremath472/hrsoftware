# Fingerprint Templates — Mantra Non-Aadhaar SDK

This is the path for **storing real fingerprint templates** and **matching**
them (1:1 verification, 1:N duplicate detection).

It is separate from the RD Service path (`BIOMETRIC_SETUP.md`), which captures
real fingerprints but stores only a proof-of-capture hash because RD Service
encrypts the biometric on-device.

> **Read this first:** this path means **you hold actual biometric data**. That
> is a materially different responsibility from the RD Service path. See
> *Security obligations* at the bottom before going live.

---

## ⚠️ Status: two pieces are incomplete until the SDK arrives

Everything is built and tested **except** the parts that can only be written
against the real SDK package:

| Piece | Status |
|---|---|
| Database schema + migration | ✅ Done, applied and verified |
| Enrollment / verify / search APIs | ✅ Done, tested against a live DB |
| Quality gate, duplicate detection, audit log | ✅ Done, tested |
| Local agent HTTP server | ✅ Done |
| **DLL function signatures** | ❌ **Placeholders — must be corrected** |
| **Server-side minutiae matcher** | ⚠️ **`exact` mode only — see below** |

### 1. DLL signatures are guesses

`backend/biometric-agent/src/mantraSdk.js` contains placeholder function names
modelled on Mantra's typical SDK shape (`MFS100_Init`, `MFS100_AutoCapture`,
etc.). **The real names, argument order, and return codes will differ.**

When your SDK arrives, open its headers or C#/VB samples and correct the
`SDK_SIGNATURES` map at the top of that file. The agent will tell you exactly
which functions it couldn't find in the DLL, so this is a quick fix — but it
**will not work until you do it**.

Everything else in the agent is SDK-agnostic and should need no changes.

### 2. Matching is `exact` by default — this is NOT real matching

`FINGERPRINT_MATCHER=exact` compares templates byte-for-byte. It correctly
detects the *same template submitted twice*, and nothing more.

**Two scans of the same finger produce different templates.** So in `exact`
mode, a genuine duplicate applicant scanning again **will not be caught**.

This default is deliberate: it never produces a false positive (never wrongly
accuses someone of being a duplicate), but you must not mistake it for working
biometric matching.

For real matching, set `FINGERPRINT_MATCHER=sdk_agent`, which delegates to
Mantra's own matcher via the local agent. That requires the backend to reach an
agent — practical for an on-premise install, not for Hostinger reaching a desk
PC. If you need real server-side 1:N matching on cloud hosting, the options are
a native minutiae library bound via FFI on the server, or a dedicated matching
service; both are additional work.

---

## Architecture

```
Operator's Windows PC                            Hostinger
┌──────────────────────────────────┐             ┌────────────────────────┐
│  MFS110 (USB)                    │             │                        │
│      ↓                           │             │  Node.js backend       │
│  Mantra non-Aadhaar SDK (DLL)    │             │                        │
│      ↓                           │             │  Stores:               │
│  Local agent (Node)  127.0.0.1   │             │   • ISO template       │
│      ↓ :8891                     │             │   • quality score      │
│  Browser ────────────────────────┼── HTTPS ───▶│   • device serial      │
└──────────────────────────────────┘  template   │   • match audit log    │
                                                  └────────────────────────┘
```

The agent exists because a browser cannot load a DLL, and a cloud backend
cannot reach a USB device on someone else's machine.

---

## Setup

### 1. Apply the migration

```bash
mysql -u <user> -p <db> < backend/database/migrations/002_fingerprint_templates.sql
```

Creates `fingerprint_templates`, `fingerprint_match_log`, and default settings.

### 2. Install the SDK and agent on each scanning PC

1. Install Mantra's **non-Aadhaar MFS110 SDK** (not RD Service — ask Mantra
   specifically for the SDK that returns images/templates).
2. Copy `backend/biometric-agent/` to the PC.
3. `cp .env.example .env` and set `MANTRA_DLL_PATH` to the installed DLL.
4. `npm install`
5. **Correct the DLL signatures** in `src/mantraSdk.js` (see above).
6. `npm start` — check <http://127.0.0.1:8891/status>

To distribute it without requiring Node on every PC:
`npm run build:exe` produces a single `.exe` in `dist/`.

### 3. Configure the backend

```env
FINGERPRINT_MATCHER=exact          # or sdk_agent once an agent is reachable
FINGERPRINT_AGENT_URL=http://127.0.0.1:8891
```

---

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/candidates/:id/fingerprints` | Enroll a finger. Enforces min quality, optionally checks for duplicates, returns the match if found. |
| `GET /api/candidates/:id/fingerprints` | List enrolled fingers — **metadata only, never templates**. |
| `POST /api/candidates/:id/fingerprints/verify` | 1:1 — is this finger this candidate's? |
| `POST /api/fingerprints/search` | 1:N — has this fingerprint been registered by anyone? |

Tunable in Settings (`application_settings`):

| Setting | Default | Meaning |
|---|---|---|
| `fingerprint_min_quality` | `60` | Captures below this are rejected |
| `fingerprint_match_threshold` | `1400` | Score at/above which two templates match |
| `fingerprint_duplicate_check_on_capture` | `true` | Run a 1:N search on every enrollment |

The `1400` threshold is a common starting point for ISO minutiae matchers, but
**it is matcher-specific** — tune it against real captures once a real matcher
is in place. Too low causes false matches; too high misses duplicates.

---

## Security obligations

Storing biometric templates is a step up in responsibility. Before production:

- **Templates are never exposed via any API.** `fingerprintTemplateModel` uses
  an explicit safe-column list; keep it that way. Don't add `template` to any
  response "for debugging".
- **Encrypt at rest** — enable encryption on the MySQL volume, or add
  column-level encryption for the `template` column.
- **Restrict DB access** — anyone with a DB connection can read templates.
- **Retention policy** — decide how long templates are kept after a candidate
  is rejected or leaves, and implement deletion.
  `fingerprintTemplateModel.deleteForCandidate()` exists for this.
- **Consent** — the candidate should be told their fingerprint is being stored
  for matching, which is different from the declaration text currently used for
  the RD Service (proof-of-capture) path.
- **Never log templates.** Audit entries deliberately record the finger and
  quality only.

`fingerprint_match_log` records every comparison — type, score, threshold,
result, who ran it, from which IP. Biometric decisions should be auditable.
