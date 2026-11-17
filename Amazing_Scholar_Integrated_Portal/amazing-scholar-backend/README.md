# Amazing Scholar Computer School — API backend

This Node.js/Express service implements the three API routes used by the supplied portal HTML:

- `GET /api/data` — loads the shared portal database.
- `PUT /api/data` — saves the shared portal database as JSON.
- `POST /api/upload` — stores an uploaded learning/resource file and returns `{ name, url }`.
- `POST /api/email-certificate` — generates a PDF certificate and emails it as an attachment using SMTP.
- `GET /api/health` — health check.

## Run locally

1. Install Node.js 20 or later.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env` and configure SMTP if certificate emails are needed.
4. Run `npm start`.
5. Serve the portal HTML from the same origin/reverse proxy so `/api/...` and `/uploads/...` reach this service. The portal HTML itself should be served at `/` and `unit-catalog.js` at `/unit-catalog.js`.

## Important deployment/security requirement

**Do not expose this starter API publicly with real student records.** The current HTML sends no login/session token to the API. Therefore, before production use, put the portal and API behind an authenticated access layer (for example, Cloudflare Access or an authenticated reverse proxy), and configure role-based authorization for student, tutor and administrator actions. The client-side PINs in an HTML file are not server-side security. The API includes request limits, upload size/type checks and security headers, but those do not replace authentication/authorization.

Use persistent storage for both `DATA_DIR` and `UPLOAD_DIR`; ephemeral hosting filesystems can erase records and uploads on redeploy/restart. Back up `portal-data.json` and uploaded files regularly. Use HTTPS.

## SMTP

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`. The email endpoint returns HTTP 503 until SMTP is configured. Never commit `.env` or SMTP credentials to source control.
