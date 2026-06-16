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

## Google Sheets sync (quote enquiries)

Every `quote_submitted` request sends the enquiry to a Google Apps Script web
app, which appends a row to a Google Sheet — to the **"Marketing opt-in"**
sheet/tab if the customer ticked the marketing checkbox, or **"Not opted
in"** otherwise. Both sheets/tabs are created automatically the first time
they're needed.

Setup:

1. Open (or create) the Google Sheet you want to use.
2. Go to **Extensions > Apps Script**.
3. Delete any starter code and paste in the contents of
   [`google-apps-script.gs`](./google-apps-script.gs).
4. Click **File > Save**, name the project (e.g. "Enquiry sync").
5. Click **Deploy > New deployment**.
   - Click the gear icon next to "Select type" and choose **Web app**.
   - **Execute as**: Me.
   - **Who has access**: Anyone.
   - Click **Deploy** and authorize the script when prompted.
6. Copy the **Web app URL** from the deployment dialog.
7. Set `GOOGLE_APPS_SCRIPT_URL` in `backend/.env` to that URL.

If `GOOGLE_APPS_SCRIPT_URL` is not set, the sync is skipped silently and
emails still send as normal.

Note: if you edit `google-apps-script.gs` later, you must create a **new
deployment** (or use "Manage deployments" to deploy a new version) for the
changes to take effect — saving the script alone does not update the live
web app.
