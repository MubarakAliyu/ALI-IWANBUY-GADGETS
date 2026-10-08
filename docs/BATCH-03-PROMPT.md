# ALI_IWANBUY Gadgets — BATCH 3 BUILD PROMPT
### Admin dashboard, deployment & pitch — the owner runs the business from here, live

> Send only once **Batch 2 is committed and green**. Re-read overview §3.2, §4.6 (admin shell), §6.5 (PIN), §7
> (Admin, Payment, Invoice, AuditLog, Setting), §8 and §10 (A-1 … A-13).
> Lab alignment: Phase 2 (admin auth, product management, order processing endpoints), **Phase 3 — Deployment**
> (Part H) and **Phase 4 — Pitch your work** (Part I). See `docs/LAB-PHASES.md` and tick every row.
> Look-and-feel reference (read only): `../ALI_IWANBUY-IMS/app/src/components/shell/*` and its dashboard — the
> admin should feel like a sibling of the IMS.

---

## PART A — Admin auth, roles, PIN
- [ ] `Admin` model; seed adds OWNER, MANAGER, STAFF (OWNER + MANAGER with PINs), plus 6 customers and ~60
      historical orders across 60 days in every status with matching payments, invoices and audit rows (extend
      the Batch 1 seed; dates in Africa/Lagos). Demo credentials → console + `docs/DEMO-ACCOUNTS.md`.
- [ ] `lib/permissions.ts`: the matrix from overview §3.2 as `PERMISSIONS: Record<Permission, Role[]>`;
      `requireAdmin` + `requirePermission(p)` middleware; denial → 403 + audit `PERMISSION_DENIED`.
- [ ] Admin auth routes (overview §11): login (`aib_a`, 8 h sliding), logout, me, forced change-password when
      `mustChangePassword`, then `/admin/set-pin` prompt for OWNER/MANAGER without a PIN.
- [ ] `pin.service`: set/change (current PIN or password required to change), `verifyPin(adminId, pin)` with
      trivial-PIN rejection, 5-failure lock for 15 min, audit `PIN_FAILED` / `PIN_LOCKED` / `PIN_CHANGED`.
- [ ] `/admin/login` page (navy brand panel + form). Next middleware guards `/admin/(panel)`.

## PART B — Admin shell
- [ ] Navy 260 px sidebar (horizontal white lockup at top, mark only when collapsed to 72 px rail; collapse state
      remembered in localStorage), items filtered by role, active item = primary left bar; white top bar with
      global search (order number → order, email → customer, text → products), bell with count of orders
      `AWAITING_CONFIRMATION` (polls every 60 s), admin menu (Account settings, Sign out). Mobile: drawer.
- [ ] Reusable `DataTable` (TanStack Table): URL-synced search/filters/sort/page, sticky header, skeleton rows,
      empty state, row actions menu, **Export CSV** (server endpoint with the same filters).

## PART C — Overview & financial KPIs (A-3)
- [ ] `GET /admin/dashboard?period=` via aggregation pipelines (Africa/Lagos day boundaries): revenue (sum of
      CONFIRMED payments minus refunds), orders, AOV, awaiting confirmation (count + ₦), refunds, new customers,
      units sold, low-stock variants — each with previous-period delta; series revenue-by-day; orders by status;
      payment-method split; top 5 products by revenue; recent 8 orders; low-stock list. STAFF receives only the
      operational subset (server-side).
- [ ] UI: period selector (URL), 8 KPI tiles (label caption, bold tabular value, delta chip), recharts area chart
      in `#156FBF`, bar chart, donut, top-products list, tables. Read the `dataviz` guidance for chart styling;
      brand colours only.

## PART D — Orders, payments, invoices
- [ ] **Orders** (A-4) list + detail. Actions call services that use `order-lifecycle.ts`:
      `advanceStatus` (legal next states only, optional note, customer email on customer-visible changes),
      `cancel` (reason; PIN if paid; restock; transaction), `refund` (PIN, reason, creates a negative Payment of
      type refund, paymentStatus `REFUNDED`, restock, transaction).
- [ ] **Confirm payment** (`POST /admin/orders/:id/confirm-payment { pin, amountKobo, reference?, note? }`), one
      transaction: verify PIN → assert state (`AWAITING_CONFIRMATION`/`PENDING_PAYMENT` for transfer;
      `PROCESSING`+`UNPAID` for pay-on-delivery) → amount must equal order total (v1: no part payments) → create
      `Payment` (`AIB-PAY-…`, confirmedBy) → order `PAID` (+ `PROCESSING` for transfer orders) → **issue Invoice**
      → audit `PAYMENT_CONFIRMED` → after commit email "payment confirmed". PIN modal UI: 4–6 digit OTP input,
      shows amount + order number being confirmed, error shake on wrong PIN, lock message with time remaining.
- [ ] **Payments** page (A-7): "Awaiting confirmation" queue cards on top (one-click open confirm modal), history
      table (number, date, order, customer, method, amount, confirmed by), filters, totals row, CSV.
- [ ] **Invoices** (A-8): `invoice.service.generate(orderId)` → pdfkit A4 using `brand/logo` (convert the lockup
      SVG to PNG once with sharp at build/seed), Montserrat TTF from `brand/fonts/ttf/` embedded, navy header
      band, company block (registered address, RC, TIN, phone), "INVOICE" + number + dates, bill-to, items table
      (name, variant, SKU, qty, unit, total), subtotal/delivery/total, payment status + method + reference, bank
      details, footer note + *Clean. Modern. Reliable.* Stored under `server/.local/invoices/`. List, view/download,
      **Send to customer** (email with PDF attached, records `sentAt`, status `SENT`), resend, void (OWNER,
      reason). Customer `GET /orders/:number/invoice.pdf` now works and the Download button appears in My Orders.

## PART E — Catalogue management
- [ ] **Products** (A-5): list (table and grid toggle), filters, bulk activate/archive; create/edit page in
      sections (Details · Media · Variants · Organisation · Visibility) with sticky save bar and unsaved-changes
      guard; image upload (multer + sharp → 400/800/1400 WebP, max 6, drag reorder, primary first, alt text);
      variants table editor with SKU auto-generate; quick **stock adjust** dialog (delta ±, reason) — audited
      with before/after.
- [ ] **Categories & Brands** (A-6) on one tabbed page: CRUD dialogs, two-level parent select, sort order
      (up/down buttons), image/logo upload, archive guard.

## PART F — People, settings, audit
- [ ] **Customers** (A-9): list + detail; spend totals hidden from STAFF on the server; suspend/reactivate.
- [ ] **Admin users** (A-10, OWNER only): create (temporary password shown once in a copyable dialog + invite
      email), edit role, suspend/reactivate, reset password, reset PIN; last-OWNER and self-suspend guards.
- [ ] **Account settings** (A-11) for every admin: profile (email read-only), change password, set/change PIN.
- [ ] **Store settings** (A-12, OWNER): form sections Business · Contact · Bank details · Delivery · Orders ·
      Invoices; storefront and invoices read from here (public settings endpoint already exists).
- [ ] **Audit trail** (A-13): DataTable with filters (actor, action, entity type, date range), expandable diff
      view (before → after per field, secrets redacted), entity links, CSV. Prove append-only: model hooks throw
      on `updateOne/updateMany/findOneAndUpdate/deleteOne/deleteMany/findOneAndDelete` and there is no route.
- [ ] Sweep: confirm **every** admin mutation route writes an audit row (add a test that iterates the admin
      router's mutating endpoints with a seeded request and asserts an audit row was written).

## PART G — Verification, docs, deploy readiness
- [ ] Server tests: permission matrix (each role × each admin endpoint group), PIN (trivial rejected, wrong PIN,
      lockout, reset by OWNER), confirm-payment happy path → Payment + Invoice + audit + order state, wrong
      amount refused, double confirmation refused (idempotent 409), refund restocks, last-OWNER guard, dashboard
      maths against a hand-computed fixture, audit immutability, invoice PDF generated and non-empty.
- [ ] Playwright: OWNER logs in → overview KPIs render → opens awaiting order → wrong PIN error → correct PIN →
      order PAID + invoice issued → send invoice → email file in outbox → audit trail shows both actions;
      MANAGER cannot open Admin users or Settings (403 page); STAFF sees no revenue figures; create product with
      variant and image → visible on storefront. axe on admin overview, orders, product form.
- [ ] README complete (setup, scripts, env, demo accounts, architecture diagram, roles table, "Built with React
      (Next.js 15) · Node.js · Express · MongoDB"). `docs/API.md`: every endpoint — method, path, auth/permission,
      request body, response, error codes — grouped as Authentication · Products · Orders · Payments & Invoices ·
      Admin.
- [ ] Gates + full local E2E green. Commit on `batch/03-admin`.

## PART H — Deployment (Lab Phase 3)
Goal: the site runs in production and is proven there, not just on this laptop.

**H.1 Production readiness in code**
- [ ] `storage` interface gains a **Cloudinary** provider (`STORAGE_PROVIDER=cloudinary`, `CLOUDINARY_URL`) used for
      product images and invoice PDFs in production; local disk stays the dev default. Seed in production mode
      uploads its placeholder images through the same interface.
- [ ] Cookies: when client and API are on different sites, auth cookies must be `secure; sameSite=none` — but
      prefer **same-site via the Next.js rewrite**: the browser only ever talks to the Vercel domain, Vercel
      rewrites `/api/*` and `/uploads/*` to the Render URL, so cookies stay first-party and `sameSite=lax` works.
      Make this the default; document the fallback.
- [ ] `trust proxy` set on Express (Render sits behind a proxy — needed for rate limiting and secure cookies).
- [ ] Production seed guard: `pnpm seed:demo` is allowed against production **only** with
      `ALLOW_DEMO_SEED=true` (the lab needs demo data on the live site); it never runs automatically.
- [ ] The auto-cancel job tolerates Render free-tier sleep (runs on boot and every 15 min while awake).
- [ ] `render.yaml` (API: build `pnpm i --frozen-lockfile && pnpm --filter server build`, start
      `node server/dist/index.js`, health check `/api/health`) and Vercel settings (root `client`, env vars).

**H.2 Set up the hosting** (Claude Code prepares everything; the account sign-ups and secret values are done by
the student — never paste secrets into the repo or the chat)
- [ ] MongoDB Atlas M0 cluster, database user, network access, connection string → `MONGODB_URI`.
- [ ] Render web service from the GitHub repo using `render.yaml`; env vars from `server/.env.example`.
- [ ] Vercel project (root `client/`), `API_ORIGIN` = Render URL; production domain recorded.
- [ ] Cloudinary account (free) → `CLOUDINARY_URL`; SMTP (e.g. Brevo free) → `SMTP_*`, or the logged-mailer
      fallback (ADR-008).
- [ ] Write `docs/DEPLOYMENT.md`: architecture diagram (browser → Vercel → Render → Atlas/Cloudinary/SMTP), every
      env var per service, step-by-step setup with the exact clicks, how to redeploy, how to roll back, how to
      re-seed demo data, known limits (Render cold start ~30–50 s on free tier).

**H.3 Test it thoroughly in production**
- [ ] Production smoke checklist run by hand and recorded with ✅/❌ and notes in `docs/DEPLOYMENT.md` §
      "Production test report": health; home, shop, filters, product, cart on phone and desktop; register;
      checkout (bank transfer); "I've paid"; admin login; confirm payment with PIN; invoice PDF downloads;
      invoice email; product create with image upload appears on storefront; role restrictions; audit rows.
- [ ] Playwright suite pointed at the live URL (`E2E_BASE_URL`) using a dedicated test customer and test admin;
      read-only + self-cleaning (cancels the order it creates). Results pasted into the report.
- [ ] Lighthouse on the live home + product pages; zero console errors on key pages; `/api/health` p95 noted.
- [ ] Any production-only defect found is fixed, redeployed and re-tested; the report shows before/after.

## PART I — Pitch pack (Lab Phase 4)
- [ ] `docs/PITCH.md` — a 7–10 minute talk track and slide-by-slide outline:
      1. Title — ALI_IWANBUY Gadgets · *Clean. Modern. Reliable.* · live URL
      2. **Purpose & significance** — a real Birnin Kebbi phone shop selling through WhatsApp flyers; why an online
         store matters for it and for small Nigerian retailers
      3. **Objectives** — the goals G1–G6 from the overview, in plain language
      4. The solution — storefront + admin, MERN architecture diagram (React/Next.js · Express · MongoDB)
      5. Live demo (scripted, ≤ 4 min) — customer journey, then owner journey with PIN confirmation and invoice
      6. Engineering highlights — atomic stock (the last-phone race test), PIN-confirmed payments, append-only
         audit, integer-kobo money, role permissions enforced on the server
      7. **Outcomes** — what was delivered, test counts, Lighthouse scores, production test report summary
      8. **Findings / lessons learned** — what was hard, what changed, what I would do differently
      9. Roadmap — IMS stock sync, Paystack, WhatsApp notifications
      10. Thank you / Q&A — contacts, repo link
- [ ] `docs/DEMO-SCRIPT.md` — click-by-click demo with the demo accounts and a fallback (local run) if the free
      tier is cold.
- [ ] `docs/screenshots/` — Playwright-captured PNGs at desktop and mobile of: home, shop with filters, product,
      cart, checkout, success, My orders, account settings, admin overview, orders, PIN modal, invoice PDF, audit
      trail. Referenced from `PITCH.md`.
- [ ] Tick every row of `docs/LAB-PHASES.md` with the file/URL where it is satisfied.
- [ ] Final: merge all batches to `main`, tag `v1.0.0`, update `PROGRESS.md`.

## Acceptance criteria
- AC3.1 Each role sees and can do exactly what overview §3.2 says — proven by tests, not just hidden UI.
- AC3.2 No payment becomes PAID without a named admin's correct PIN; every confirmation creates a Payment, an
      Invoice and an audit row atomically.
- AC3.3 KPIs match a hand-computed fixture for at least two periods.
- AC3.4 Invoices are branded PDFs that can be downloaded by admin and customer and emailed to the customer.
- AC3.5 Products, variants, images and stock are fully manageable from admin and reflect on the storefront.
- AC3.6 The OWNER can create admins, set roles, suspend, reset password/PIN; the last OWNER is protected.
- AC3.7 The audit trail records every admin mutation and security event and cannot be altered.
- AC3.8 Gates + E2E green; README lets a stranger run the project in under 10 minutes.
- AC3.9 **Live**: the storefront and admin run on the production URL; the production test report is complete with
      every row ✅ (or a fixed-and-retested note); Playwright passes against the live URL.
- AC3.10 **Pitch pack**: `PITCH.md`, `DEMO-SCRIPT.md` and screenshots exist and cover purpose & significance,
      objectives, outcomes and findings; every `LAB-PHASES.md` row is ticked.

**Final report**: what was built per batch, live URLs, run instructions, demo accounts, test totals, Lighthouse,
production test summary, open client items (real bank details, real product photos, SMTP credentials, final logo
export, address spelling). Offer to turn `PITCH.md` into a slide deck.
