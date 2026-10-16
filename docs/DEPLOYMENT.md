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

### How the pieces fit together

```
                    ┌──────────────────────────────────────────┐
   Customer's       │  Vercel — Next.js 15 (root: client/)      │
   browser  ───────▶│  aliiwanbuy.vercel.app                   │
                    │                                          │
                    │  Rewrites, set in next.config.ts:        │
                    │    /api/*      ──▶  Render               │
                    │    /uploads/*  ──▶  Render               │
                    └───────────────┬──────────────────────────┘
                                    │  server-to-server
                                    ▼
                    ┌──────────────────────────────────────────┐
                    │  Render — Express 5 API (free web)       │
                    │  aib-api.onrender.com                    │
                    └───┬───────────────┬──────────────┬───────┘
                        │               │              │
                        ▼               ▼              ▼
             ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
             │ MongoDB      │  │ Cloudinary   │  │ SMTP         │
             │ Atlas M0     │  │ (images,     │  │ (Brevo or    │
             │ (replica set)│  │  invoices)   │  │  Gmail)      │
             └──────────────┘  └──────────────┘  └──────────────┘
```

**The browser only ever talks to the Vercel domain.** That is the whole point of the rewrites: the session
cookies are first-party, `sameSite=lax` works, and no CORS preflight sits between a page and its data. The
Render URL is never typed into a browser except to check `/api/health`.

### What goes where

| Variable                 | Render (API) | Vercel (client) | Notes                                                         |
| ------------------------ | ------------ | --------------- | ------------------------------------------------------------- |
| `NODE_ENV`               | `production` | set by Vercel   |                                                               |
| `PORT`                   | `10000`      | —               | Render's own port.                                            |
| `MONGODB_URI`            | ✅ secret    | —               | Atlas connection string, with the user's password.            |
| `MONGODB_DB_NAME`        | `aib_store`  | —               |                                                               |
| `CLIENT_ORIGIN`          | ✅           | —               | The Vercel production URL. Cookies are issued for it.         |
| `CUSTOMER_JWT_SECRET`    | ✅ secret    | —               | `render.yaml` generates one.                                  |
| `ADMIN_JWT_SECRET`       | ✅ secret    | —               | `render.yaml` generates one.                                  |
| `STORAGE_PROVIDER`       | `local` ⚠️   | —               | `local` works now; `cloudinary` keeps uploads. See below.     |
| `CLOUDINARY_URL`         | — for now    | —               | `cloudinary://KEY:SECRET@CLOUD_NAME`. Only with `cloudinary`. |
| `SMTP_*`                 | ✅ secret    | —               | Without these, email is written to disk and lost.             |
| `MAIL_FROM`              | ✅           | —               | Must match the SMTP account's verified sender.                |
| `COOKIE_SAMESITE`        | `lax`        | —               | Only change if you drop the rewrites — see below.             |
| `ALLOW_DEMO_SEED`        | unset        | —               | Set to `true` by hand, once, to seed the demo site.           |
| `API_ORIGIN`             | —            | ✅              | The Render URL. Used by the rewrites and SSR fetches.         |
| `DEMO_ADMIN_PASSWORD`    | command line | —               | Seeding only. Not a deploy setting — see step 7.              |
| `DEMO_CUSTOMER_PASSWORD` | command line | —               | Seeding only.                                                 |
| `DEMO_OWNER_PIN`         | command line | —               | Seeding only. 4–6 digits, not a run or a repeat.              |
| `DEMO_MANAGER_PIN`       | command line | —               | Seeding only.                                                 |

Nothing in this table is committed. Every value marked secret is typed into the host's dashboard.

The four `DEMO_*` values are different again: they belong on the command line of the one seeding run and
**nowhere else** — not in the repository, not in Render's dashboard. The demo accounts can confirm payments,
so a password anyone can read is a dashboard anyone can use. Outside production the seed uses built-in
defaults and needs none of them.

### ⚠️ Storage: `local` for now

This deployment starts on `STORAGE_PROVIDER=local` because the Cloudinary sign-up was not available. It
works — the shop runs, the seeded catalogue has its images, invoices download — with one real limitation:

**Render's disk is wiped on every deploy and every restart.** So:

|                                       |                                                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seeded product images                 | Lost on redeploy. Re-run the seed (step 7) to put them back.                                                                                                              |
| Images uploaded through the dashboard | **Lost on redeploy, permanently.** Nothing re-creates them.                                                                                                               |
| Invoice PDFs                          | Safe. They are re-rendered from the order and Store Settings whenever the stored file is missing (ADR-021), so a customer downloading last month's invoice still gets it. |
| Everything else                       | Safe — it is all in Atlas.                                                                                                                                                |

The API logs one warning at boot saying exactly this. It does not refuse to start: this is a supported
setup, just a lossy one.

**When Cloudinary is available, two settings change and nothing else:**

1. Render → **Environment** → set `STORAGE_PROVIDER` to `cloudinary`.
2. Add `CLOUDINARY_URL` = `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` from the Cloudinary dashboard.

Save, let it redeploy, then re-run the seed from step 7 so the catalogue's images are on the CDN too. Any
product photograph uploaded before the switch is already gone and has to be uploaded again. The code needs no
change — the storage provider is chosen at boot, and the seed writes through the same interface either way.

If the URL is missing while `STORAGE_PROVIDER=cloudinary`, the API refuses to start and names
`CLOUDINARY_URL`, rather than failing on the first upload.

### Step by step

**1 · MongoDB Atlas (free M0)**

1. <https://cloud.mongodb.com> → **Create** → M0 → provider AWS, region `eu-central-1` (Frankfurt, to match
   Render).
2. **Database Access** → **Add New Database User** → username `aib-api`, **Autogenerate Secure Password**,
   copy it, role **Read and write to any database**.
3. **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`). Render's free tier
   has no fixed outbound IP, so there is nothing narrower to allow.
4. **Database** → **Connect** → **Drivers** → copy the string and put the password into it. It must end with
   `/?retryWrites=true&w=majority`. This is `MONGODB_URI`.

An M0 cluster is a three-node replica set, which is what the transactions in this project need (ADR-005).

**2 · Cloudinary (free)**

1. <https://cloudinary.com> → sign up → **Dashboard**.
2. Copy the **API Environment variable** — it already reads
   `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`. This is `CLOUDINARY_URL`.

**3 · SMTP**

Either the Gmail App Password described at the top of this file, or a free Brevo account
(<https://brevo.com> → **SMTP & API** → **SMTP** → create a key):

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<the login Brevo shows>
SMTP_PASSWORD=<the SMTP key>
MAIL_FROM=ALI_IWANBUY Gadgets <iwanbuygadgets@gmail.com>
```

The sender address must be verified in Brevo first, or everything is silently dropped.

**4 · Render (API)**

1. Push the repository to GitHub.
2. <https://dashboard.render.com> → **New** → **Blueprint** → pick the repository. Render reads
   `render.yaml` at the root and creates the `aib-api` web service with the right build and start commands.
3. It will stop and ask for every variable marked `sync: false`. Fill in:
   - `MONGODB_URI` — from step 1.
   - `CLIENT_ORIGIN` — you do not have the Vercel URL yet, so put `https://localhost` and come back in step 6.
   - `STORAGE_PROVIDER` — **`local`** for this first deployment (see ⚠️ above). `cloudinary` once you have an
     account.
   - `CLOUDINARY_URL` — leave empty while `STORAGE_PROVIDER` is `local`.
   - the `SMTP_*` values — from step 3.
4. **Create** and wait for the first deploy. Then open `https://<service>.onrender.com/api/health` — it must
   answer `{"ok":true,"db":"up"}`. If `db` says `down`, the Atlas user, password or network access is wrong.

**5 · Vercel (client)**

1. <https://vercel.com> → **Add New** → **Project** → the same repository.
2. **Root Directory**: `client`. Framework preset: Next.js. Leave the build command alone.
3. **Environment Variables** → `API_ORIGIN` = the Render URL from step 4, with no trailing slash.
4. **Deploy**.

**6 · Point them at each other**

Back in Render, set `CLIENT_ORIGIN` to the Vercel production URL and redeploy. The two now agree, and the
cookies will be accepted.

**7 · Seed the demo data**

The lab's site needs something to show. This runs on **your machine**, against the Atlas database — not on
Render — so every variable the server reads at boot has to be on the command line, including the ones Render
normally supplies. Get one wrong and it either refuses with the variable's name or writes the images to the
wrong place.

Pick the four demo credentials first. They are not deploy settings and nothing should store them:

- **Passwords** — 10 characters or more. Two of them, one for the admins and one for the customers.
- **PINs** — 4 to 6 digits, and not a run, a repeat or a date. `1234`, `0000` and `1111` are all refused.

Write them down for the demo; `docs/DEMO-ACCOUNTS.md` is rewritten with them and is not committed.

**Windows PowerShell**

```powershell
$env:NODE_ENV = "production"
$env:MONGODB_URI = "<the atlas uri>"
$env:MONGODB_DB_NAME = "aib_store"
$env:CUSTOMER_JWT_SECRET = "<the value Render generated>"
$env:ADMIN_JWT_SECRET = "<the value Render generated>"
$env:STORAGE_PROVIDER = "local"
$env:ALLOW_DEMO_SEED = "true"
$env:DEMO_ADMIN_PASSWORD = "<10+ characters>"
$env:DEMO_CUSTOMER_PASSWORD = "<10+ characters>"
$env:DEMO_OWNER_PIN = "<4-6 digits>"
$env:DEMO_MANAGER_PIN = "<4-6 digits>"

pnpm seed
```

Those variables last until you close the window. To be sure nothing lingers in a terminal you keep open:

```powershell
"NODE_ENV","MONGODB_URI","MONGODB_DB_NAME","CUSTOMER_JWT_SECRET","ADMIN_JWT_SECRET",
"STORAGE_PROVIDER","CLOUDINARY_URL","ALLOW_DEMO_SEED","DEMO_ADMIN_PASSWORD",
"DEMO_CUSTOMER_PASSWORD","DEMO_OWNER_PIN","DEMO_MANAGER_PIN" |
  ForEach-Object { Remove-Item "env:$_" -ErrorAction SilentlyContinue }
```

**bash / zsh**

```bash
NODE_ENV=production \
MONGODB_URI='<the atlas uri>' \
MONGODB_DB_NAME=aib_store \
CUSTOMER_JWT_SECRET='<the value Render generated>' \
ADMIN_JWT_SECRET='<the value Render generated>' \
STORAGE_PROVIDER=local \
ALLOW_DEMO_SEED=true \
DEMO_ADMIN_PASSWORD='<10+ characters>' \
DEMO_CUSTOMER_PASSWORD='<10+ characters>' \
DEMO_OWNER_PIN='<4-6 digits>' \
DEMO_MANAGER_PIN='<4-6 digits>' \
pnpm seed
```

A leading space before `NODE_ENV` keeps the whole line out of your shell history in bash and zsh, if
`HISTCONTROL=ignorespace` is set.

**Why each one is there**

| Variable                                  | Why the seed needs it                                                                                                                                                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV=production`                     | Tells the seed this is the live database, which is what turns on all the guards below.                                                                                                                                             |
| `MONGODB_URI`, `MONGODB_DB_NAME`          | Where to write. Without them it would seed whatever is in `server/.env` — probably your laptop.                                                                                                                                    |
| `CUSTOMER_JWT_SECRET`, `ADMIN_JWT_SECRET` | Not used by the seed, but the environment is parsed before anything runs and both are required in production. Any 24-character value works for this run; using Render's keeps it simple.                                           |
| `STORAGE_PROVIDER`                        | Where the seeded product images go. **Must match what Render is set to** — otherwise the catalogue points at images the API cannot serve. `local` for now; `cloudinary` once that is switched on, with `CLOUDINARY_URL` beside it. |
| `ALLOW_DEMO_SEED=true`                    | The explicit opt-in. Without it the seed refuses, because it replaces the catalogue, the customers and the whole order history.                                                                                                    |
| The four `DEMO_*`                         | The accounts it creates. Without all four it refuses and names the ones that are missing.                                                                                                                                          |

> **`STORAGE_PROVIDER=local` writes the images to the machine you run this on, not to Render.** On the live
> site the catalogue will show broken images until Render's own disk has them. The simplest fix on the free
> tier is to run the seed, then **Manual Deploy → Clear build cache & deploy** so Render rebuilds and runs its
> own seed — or to move to `cloudinary`, where the images are on the CDN and this problem disappears. With
> Cloudinary set, the command above run from anywhere puts the images where both can see them.

It refuses without `ALLOW_DEMO_SEED=true`, and it replaces the catalogue, the customers and the order
history — never run it against a shop that is actually trading. The demo sign-ins it prints are also written
to `docs/DEMO-ACCOUNTS.md`, which is not committed.

### Redeploying

Both hosts deploy on a push to `main`. To redeploy without a code change: Render → **Manual Deploy** →
**Deploy latest commit**; Vercel → **Deployments** → the three dots → **Redeploy**.

### Rolling back

- **Vercel**: **Deployments** → find the last good one → **Promote to Production**. Instant.
- **Render**: **Events** → the previous successful deploy → **Rollback to this version**. Takes a minute or
  two while it rebuilds.
- **The database is not rolled back by either.** A migration that went wrong has to be fixed forward, which is
  why `settings:apply-defaults` is written to be idempotent and to touch only the fields it names.

### Known limits of the free tier

| Limit                                | What it means in practice                                                                                                                                                                                                                                                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render sleeps after ~15 minutes idle | The first request wakes it and takes **30–50 seconds**. Every request after that is normal. The demo script says to open the site a minute before presenting.                                                                                                                           |
| Render's disk is ephemeral           | Anything written to it disappears on the next deploy. Invoice PDFs are re-rendered on demand rather than trusted to survive, so they are safe. Uploaded product images are not — which is what `STORAGE_PROVIDER=cloudinary` fixes, and what the ⚠️ above is about while it is `local`. |
| Atlas M0: 512MB, shared CPU          | Far more than this shop needs; queries may be slower under load.                                                                                                                                                                                                                        |
| Cloudinary free: 25 credits/month    | Roughly 25k transformations or 25GB of delivery. The catalogue is a few dozen images.                                                                                                                                                                                                   |
| Brevo free: 300 emails/day           | An order confirmation plus an invoice is two. Comfortable.                                                                                                                                                                                                                              |

Because Render sleeps, the auto-cancel sweep runs **on boot as well as every fifteen minutes**: a service that
slept overnight has a night's worth of intervals that never fired, and the first wake is the only chance to
catch up.

### If you cannot use the rewrites

The fallback — client on one domain, API on another, no proxy — needs `COOKIE_SAMESITE=none` on Render, and
`CLIENT_ORIGIN` must be exactly the client's origin for CORS. It is worse in three ways: the cookies are
third-party and Safari and Firefox restrict them by default, every API call pays for a CORS preflight, and
uploads are no longer same-origin. Use the rewrites.

## Production test report

> **Not yet run.** This section is filled in once the hosting above exists — it needs the student's own
> Atlas, Render, Vercel, Cloudinary and SMTP accounts, which Claude Code cannot create. Everything in the
> code is ready for it (Part H.1 is complete and committed).

Run every row by hand against the live URL and record ✅ / ❌ with a note. A ❌ is fixed, redeployed and
re-tested, and the row then shows both the failure and the fix.

| #   | Check                                                            | Result | Notes |
| --- | ---------------------------------------------------------------- | ------ | ----- |
| 1   | `GET /api/health` answers `{"ok":true,"db":"up"}`                |        |       |
| 2   | Home page loads, hero and featured products render               |        |       |
| 3   | Shop: filters, sort and pagination all change the results        |        |       |
| 4   | Product page: variants switch price and stock                    |        |       |
| 5   | Cart survives a reload                                           |        |       |
| 6   | All of the above on a phone (Pixel/iPhone, real device)          |        |       |
| 7   | Register a test customer                                         |        |       |
| 8   | Checkout by bank transfer; bank details shown are the owner's    |        |       |
| 9   | "I've paid" moves the order to Awaiting confirmation             |        |       |
| 10  | Admin sign-in as the owner                                       |        |       |
| 11  | Wrong PIN is refused; correct PIN confirms the payment           |        |       |
| 12  | Order becomes PAID and an invoice is issued                      |        |       |
| 13  | Invoice PDF downloads and is branded and complete                |        |       |
| 14  | "Send to customer" arrives in a real inbox with the PDF attached |        |       |
| 15  | Create a product with an image; it appears on the storefront     |        |       |
| 16  | MANAGER cannot open Admin users or Store settings                |        |       |
| 17  | STAFF sees no revenue figures anywhere                           |        |       |
| 18  | Audit trail shows every action from this run                     |        |       |
| 19  | Playwright suite green against `E2E_BASE_URL`                    |        |       |
| 20  | Lighthouse on home and a product page                            |        |       |
| 21  | Zero console errors on home, shop, product, cart, checkout       |        |       |
| 22  | `/api/health` p95 noted after warm-up                            |        |       |

The test customer and test admin used here are dedicated to this checklist, and the Playwright run cancels
the order it creates so the live data stays clean.
