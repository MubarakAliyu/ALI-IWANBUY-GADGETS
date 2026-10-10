# Deployment

How ALI_IWANBUY Gadgets runs outside this laptop. Written as the deployment is built; the hosting setup and
the production test report are completed in Batch 3 Part H.

---

## Email — sending from the shop's own address

The store address is **iwanbuygadgets@gmail.com** (ADR-017). It is shown on the contact page, in the footer,
on invoices, and set as `reply-to` on every email the shop sends, so a customer can simply hit reply.

**Sending** from it needs a Gmail **App Password** — not the account password, which Google will not accept
from an application.

1. The Google account must have **2-Step Verification** switched on
   (myaccount.google.com → Security → 2-Step Verification).
2. Then create an app password: myaccount.google.com → Security → **App passwords** → name it
   "ALI_IWANBUY API" → Google shows a 16-character password **once**.
3. Put it in the API's environment — never in the repository:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465           # implicit TLS; 587 with STARTTLS also works
SMTP_USER=iwanbuygadgets@gmail.com
SMTP_PASSWORD=<the 16-character app password, no spaces>
MAIL_FROM=ALI_IWANBUY Gadgets <iwanbuygadgets@gmail.com>
```

4. Restart the API. With `SMTP_HOST` set, the mailer sends for real; with it unset — which is the default in
   development — every message is written to `server/.local/outbox/` instead and its path is logged.

**The app password is a credential.** It is never committed, never pasted into a chat, and never put in
`.env.example`. If one leaks, revoke it in the same Google settings page and issue another.

Gmail's free sending limit (about 500 messages a day) is far above what this shop needs. A transactional
provider such as Brevo can replace it later by changing the same four variables (ADR-008).

---

## Environment variables

Every variable the API reads is documented in [`server/.env.example`](../server/.env.example), and every
variable the storefront reads in [`client/.env.example`](../client/.env.example). The ones that are secret —
`CUSTOMER_JWT_SECRET`, `ADMIN_JWT_SECRET`, `MONGODB_URI`, `SMTP_PASSWORD`, `CLOUDINARY_URL` — are set in the
hosting dashboards and nowhere else.

Generate the session secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Applying the owner's store details to an existing database

The shop's address, email, bank account and opening hours live in the one `Setting` document, not in the code
(ADR-017). A database seeded before those details arrived is brought up to date without touching the
catalogue, the customers or the orders:

```bash
pnpm settings:apply-defaults
```

It prints each field it changes, is safe to run twice, and leaves the settings the owner has since tuned in
admin — delivery fees, thresholds, the invoice note — exactly as they are. A fresh `pnpm seed` already writes
the correct values.

---

## Hosting

_Completed in Batch 3 Part H: architecture diagram, the Render, Vercel, Atlas and Cloudinary setup step by
step, redeploy and rollback, re-seeding demo data, and known limits._

## Production test report

_Completed in Batch 3 Part H.3._
