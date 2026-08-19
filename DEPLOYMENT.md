# Deployment Guide

Generic production deployment steps, with a Hostinger-specific walkthrough. Adapt paths /
panel names as needed for your exact hosting plan (VPS vs shared/Business hosting with
Node.js app support).

## 1. Prerequisites

- A MySQL 8.x database (Hostinger: create via hPanel → Databases → MySQL Databases).
- A Node.js runtime for the backend (Hostinger: hPanel → Advanced → Node.js, or a VPS with
  Node 18+ installed).
- A domain/subdomain pointed at your hosting, with HTTPS available (Hostinger provides free
  SSL via AutoSSL/Let's Encrypt in hPanel → SSL).

## 2. Database

1. In hPanel → Databases → MySQL Databases, create a database and a dedicated DB user with
   full privileges on it. Note the host (usually `localhost` on shared hosting), DB name,
   username, password.
2. Import the schema and seed data (via phpMyAdmin's Import tab, or `mysql` CLI if you have
   SSH access):
   ```bash
   mysql -h <DB_HOST> -u <DB_USER> -p <DB_NAME> < backend/database/schema.sql
   mysql -h <DB_HOST> -u <DB_USER> -p <DB_NAME> < backend/database/seed.sql
   ```

## 3. Backend deployment

1. Upload the `backend/` folder to your hosting (via Git, SFTP, or hPanel's File Manager).
   Do **not** upload your local `node_modules` or `.env` — `.gitignore` already excludes
   them.
2. In hPanel → Advanced → Node.js, create a new Node.js application:
   - **Application root**: the uploaded `backend/` folder.
   - **Application startup file**: `src/server.js`.
   - **Node version**: 18 or later.
3. Set environment variables (hPanel's Node.js app screen has an "Environment Variables"
   section — set these instead of uploading a `.env` file where possible):
   ```
   PORT=<the port Hostinger assigns/expects — the app reads process.env.PORT>
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend-domain.com
   DB_HOST=<from step 2>
   DB_PORT=3306
   DB_NAME=<from step 2>
   DB_USER=<from step 2>
   DB_PASSWORD=<from step 2>
   JWT_SECRET=<generate a long random string, e.g. `openssl rand -hex 32`>
   JWT_EXPIRES_IN=8h
   UPLOAD_DIR=storage
   MAX_FILE_SIZE_MB=10
   BIOMETRIC_PROVIDER=mock
   KYC_PROVIDER=manual
   ```
4. Run `npm install` from the Node.js app panel (or via SSH: `cd backend && npm install`).
5. Create the Super Admin user once, via SSH:
   ```bash
   cd backend
   ADMIN_EMAIL=admin@yourcompany.com ADMIN_PASSWORD='StrongPass123!' ADMIN_NAME='Super Admin' npm run seed:admin
   ```
   If you don't have SSH access, temporarily set `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME`
   as environment variables in the Node.js panel, run the app once, then remove them (the
   script only needs to run once).
6. Ensure `backend/storage/documents`, `backend/storage/photos`, `backend/storage/signatures`
   exist and are writable by the Node.js process (they're created by `.gitkeep` files in the
   repo; verify permissions after upload).
7. Start/restart the app from the Node.js panel. Confirm it's listening by hitting
   `https://your-api-domain.com/health` — expect `{"success":true,"message":"OK",...}`.

## 4. Frontend deployment

1. Locally (or in a CI step), build the frontend against your production API URL:
   ```bash
   cd frontend
   echo "VITE_API_URL=https://your-api-domain.com/api" > .env
   npm install
   npm run build
   ```
2. Upload the contents of `frontend/dist/` to your static hosting root (hPanel → File
   Manager → `public_html/` for the frontend domain/subdomain, or a separate static hosting
   product).
3. If serving the SPA from Apache/LiteSpeed (typical on Hostinger shared hosting), add a
   rewrite rule so client-side routes don't 404 on refresh. Create `public_html/.htaccess`:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

## 5. Domain & HTTPS

1. Point your frontend domain/subdomain's DNS at the Hostinger hosting (usually automatic
   if the domain is managed there).
2. Point your API domain/subdomain at the Node.js app (hPanel lets you bind a domain to a
   Node.js application).
3. Enable free SSL for both domains via hPanel → SSL → AutoSSL / Let's Encrypt. Force HTTPS
   redirects.
4. Update `CORS_ORIGIN` on the backend to the exact `https://` frontend origin, and
   `VITE_API_URL` in the frontend build to the exact `https://` API origin. Rebuild/redeploy
   the frontend if you change `VITE_API_URL` (it's baked in at build time, not runtime).

## 6. Post-deploy test checklist

Run through this on the live URLs before considering the deployment done:

- [ ] `GET https://your-api-domain.com/health` returns `success: true`.
- [ ] Login at `https://your-frontend-domain.com/login` with the Super Admin credentials
      from step 3.5 succeeds and lands on `/dashboard`.
- [ ] Create a coordinator (Coordinators page → Add Coordinator).
- [ ] Register a new candidate (Candidates → Add Candidate) and confirm a
      `CAN-YYYY-NNNNNN` candidate number is generated.
- [ ] Complete the KYC and Address steps and confirm they persist after navigating away and
      back into the wizard.
- [ ] Upload a document (PDF or JPG) in the Document Upload step, then view it via the
      "View" button (confirms authenticated file serving works over HTTPS).
- [ ] Verify the document in the Document Verification step.
- [ ] Complete Original Verification.
- [ ] Capture a photo via the webcam step (requires HTTPS — browsers block
      `getUserMedia` on plain HTTP for non-localhost origins, which is another reason to
      confirm SSL is active).
- [ ] Capture both Left Hand and Right Hand biometrics (mock provider) and confirm quality
      scores display.
- [ ] Accept the Declaration and complete the Signature step.
- [ ] Submit the application from Final Review and confirm the candidate's status becomes
      `COMPLETED`.
- [ ] Open the printable summary page and confirm Aadhaar/PAN are masked.
- [ ] Check Audit Logs shows entries for the above actions with correct timestamps/IPs.
- [ ] Check Reports → Candidates report loads and CSV export downloads correctly.

## Notes

- `BIOMETRIC_PROVIDER=mock` and `KYC_PROVIDER=manual` are safe, fully-functional defaults
  for any environment where you don't have a licensed vendor integration yet. Do not present
  mock biometric captures as real identity verification in production use — the UI already
  labels them as simulated.
- Rotate `JWT_SECRET` and re-deploy if it is ever exposed.
