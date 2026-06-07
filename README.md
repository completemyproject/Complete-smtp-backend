# Email backend (minimal)

This folder contains a minimal Node backend that accepts POST /email/send and sends email via SMTP (nodemailer).

Quick start (locally):

1. Copy environment example:

```bash
cp backend/.env.example backend/.env
# edit backend/.env and set SMTP_PASSWORD and any other values
```

2. Install dependencies and run:

```bash
cd backend
npm install
npm run start
```

Endpoints:
- `POST /email/send` — body: `{ type: string, data: object }`.

Default supported `type` values in this minimal scaffold:
- `smtp_test` — sends a test to `ADMIN_EMAIL`
- `custom_email` — send arbitrary email (requires `to`, `subject`, `text` in `data`)

For a production-ready deployment you can:
- Add more handlers (contact/partnership/quote) using the logic in `backend/index.js` in this folder.
- Deploy to Render, Railway, Fly, or a small VPS. Use the included `Dockerfile` if you prefer container deploys.
