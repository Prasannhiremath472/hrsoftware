# Fingerprint Scanner Setup — Mantra MFS110

This system supports real fingerprint capture using a **Mantra MFS110** (or any
Aadhaar RD Service compatible scanner), alongside a simulated mock mode for
development.

---

## How it works (and why it's built this way)

The MFS110 is an **Aadhaar RD Service (Registered Device)** scanner. Its driver
runs on the Windows PC the scanner is plugged into and exposes a local HTTP
service on `127.0.0.1` (ports ~11100–11120).

**A cloud-hosted backend cannot reach that address.** `127.0.0.1` on the
Hostinger server is the server itself, not the operator's laptop. So:

```
Operator's Windows PC                          Hostinger (cloud)
┌────────────────────────────────┐             ┌──────────────────────┐
│  MFS110 (USB)                  │             │                      │
│      ↓                         │             │   Node.js backend    │
│  Mantra RD Service             │             │                      │
│      ↓ 127.0.0.1:111xx         │             │   Stores:            │
│  Browser / mobile app  ────────┼── HTTPS ───▶│   • SHA-256 hash     │
│  (performs the capture)        │  result only│   • quality score    │
└────────────────────────────────┘             │   • device serial    │
                                               └──────────────────────┘
```

The **browser performs the capture**; only the *result* is sent to the server.

### What is stored — and what is not

| Stored | Not stored |
|---|---|
| SHA-256 hash of the capture (one-way) | The fingerprint image |
| Quality score (0–100) | The biometric template |
| Device serial + model | The PID block |
| RD Service version, timestamp | Anything reversible into a fingerprint |

RD Service encrypts the PID payload by design so applications cannot retain
usable biometrics. Retaining PID blocks is additionally regulated under the
Aadhaar Act and requires an AUA/KUA licence — this system deliberately does
not do it. The stored hash proves *that a capture occurred on a specific
device*, which is what the paper form's hand-outline page existed to record.

---

## Setup on each operator PC

Every machine that will capture fingerprints needs this **once**:

1. **Plug in the MFS110** via USB.
2. **Install Mantra RD Service** — download from
   <https://www.mantratecapp.com/> (Windows). Use the *Management Client* /
   *RD Service* installer for the MFS110.
3. **Register the device.** Mantra RD Service requires the device to be
   registered/activated with Mantra before it will return `READY`. This is
   handled through their client — an unregistered device will report a
   non-READY status and capture will be refused.
4. **Verify it's running.** Open <http://127.0.0.1:11100> in a browser — you
   should get a response rather than a connection error. The exact port
   varies; the app probes 11100–11120 automatically.

---

## Enabling it in the app

Set this in `backend/.env` and restart the backend:

```env
BIOMETRIC_PROVIDER=rdservice
```

| Value | Behaviour |
|---|---|
| `mock` | Simulated capture. No hardware needed. **Not a real fingerprint scan** — development/demo only. |
| `rdservice` | Real MFS110 capture via RD Service on the operator's machine. |
| `vendor` | Placeholder for a direct native SDK integration. Not implemented. |

The onboarding wizard's Biometric steps adapt automatically: in `rdservice`
mode they detect the local scanner, show its connection status, and disable
the Capture button until a device is ready.

---

## Troubleshooting

**"No RD Service found on this computer"**
The service isn't installed or isn't running. Check for the Mantra RD Service
in Windows Services, and confirm <http://127.0.0.1:11100> responds.

**"RD Service is running but no device is ready"**
The scanner is unplugged, or the device isn't registered/activated with
Mantra. Re-run Mantra's Management Client.

**Capture fails with an `errCode`**
These come from RD Service itself, not this app. Common ones: `700` capture
timeout (finger not placed in time), `730` device not ready, `720` device not
connected. The exact message is surfaced in the UI.

**Browser blocks the request to `127.0.0.1`**
Some browsers restrict requests from an HTTPS page to plain-HTTP localhost
(mixed content / Private Network Access). If you hit this once the app is
deployed over HTTPS, options are: serve the operator UI over HTTP on the local
network, use a browser policy exception, or install RD Service with an HTTPS
localhost certificate if Mantra provides one. This does not affect local
development over `http://localhost`.

---

## A note on what "verify" means here

The `POST /api/candidates/:id/biometric/verify` endpoint checks that a stored
capture record is well-formed and came from this provider. It is **not** a 1:1
biometric match — that would require sending a fresh PID block to a licensed
AUA/KUA authentication API, which this system does not do. The UI and API
wording reflect this deliberately; don't relabel it as "identity verified".
