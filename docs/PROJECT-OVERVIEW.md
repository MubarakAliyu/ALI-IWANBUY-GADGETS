# ALI_IWANBUY Gadgets — E-Commerce Platform

## Master Project Overview (v1.0 · 8 October 2026)

|                |                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Product**    | ALI_IWANBUY Gadgets — online storefront + admin dashboard                                                                                              |
| **Client**     | ALI_IWANBUY INTEGRATED SERVICE LTD · RC 8276954 · TIN 32843883-0001                                                                                    |
| **Business**   | Phones & gadget retail — Birnin Kebbi, Kebbi State, Nigeria                                                                                            |
| **Built by**   | Starnova Labs (Mubarak Aliyu)                                                                                                                          |
| **Context**    | GoMyCode Lab Phase project — _E-Commerce Website_ ("Not So Easy", 4 phases, ~50 h). This business is the case study.                                   |
| **Stack**      | **MERN** — MongoDB · Express · React (Next.js 15 App Router) · Node.js 22, TypeScript end-to-end                                                       |
| **Folder**     | `ALI-IWANBUY/ALI_IWANBUY-STORE/` — a **separate project**. The IMS in `ALI-IWANBUY/ALI_IWANBUY-IMS/` is **read-only reference** and is never modified. |
| **Build plan** | Three execution batches (`docs/BATCH-01-PROMPT.md` → `02` → `03`)                                                                                      |
| **Tagline**    | _Clean. Modern. Reliable._                                                                                                                             |

---

## 0. How to use this document

This is the single source of truth for the e-commerce build. Claude Code reads it **completely** before Batch 1,
then executes the batches in order. Where a batch prompt and this document disagree, this document wins and the
conflict is written to `docs/DECISIONS.md`.

The lab submission (title _ALI IWANBUY GADGETS_) describes the product in one sentence, and every screen must
serve it:

> _An e-commerce website for browsing and purchasing gadgets and electronic products online. Users can explore
> available products, view product details, add items to a shopping cart, and place orders through a simple and
> user-friendly interface._

---

## 1. Executive summary

ALI_IWANBUY already has an internal **Inventory Management System (IWAN-IMS)** under construction — a Next.js +
PostgreSQL counter/stock tool for staff. What it does not have is a **public shop window**. Customers today find
the shop through WhatsApp and Instagram flyers ("CALL/CHAT +234 703 925 4143 TO ORDER NOW!") and must phone in.

This project builds that shop window as a **separate MERN application** with two faces:

1. **Storefront** (customers) — browse phones and gadgets, filter by category/brand/price, view details, add to
   cart, keep a wishlist, create an account, check out simply, and track "My Orders".
2. **Admin dashboard** (the owner and his staff) — manage products and stock, process orders, confirm payments
   with a PIN, keep payment history, generate and email invoices, read financial KPIs, manage admin users, and
   review a complete audit trail.

It must look and feel like the same company as the IMS: **same brand tokens, same Montserrat typography, same
AB mark, same component conventions** — but it is its own codebase, its own database and its own deployment.

---

## 2. Goals and non-goals

### 2.1 Goals

- **G1** A customer can go from the home page to a placed order in **under 2 minutes** on a phone.
- **G2** The owner can see, on one screen, **what was sold, what was paid, what is pending, and what is low**.
- **G3** No payment is marked "paid" without a **named admin entering their PIN**, and every such action is in
  the audit trail.
- **G4** Stock can never go negative and two customers can never buy the last unit twice.
- **G5** Brand-faithful, accessible (WCAG AA), fast (Lighthouse ≥ 90 perf/accessibility on the storefront home).
- **G6** Satisfies every requirement of the GoMyCode e-commerce lab phases (see §15).

### 2.2 Non-goals (v1)

- No integration with the IMS database (future roadmap, §16). Stock is managed in this app.
- No online card gateway charging real money in v1. Checkout supports **Bank Transfer** (admin-confirmed) and
  **Pay on Delivery / Pay at Pickup**. A Paystack _test-mode_ adapter is an optional stretch, off by default.
- No marketplace/multi-vendor, no coupons engine, no reviews/ratings, no SMS/WhatsApp notifications, no
  multi-currency. Naira only.
- No social login. Email + password only.

---

## 3. Users and roles

### 3.1 Customer (public)

Anyone browsing. Can browse/filter/search/view and use the cart as a **guest**. Must **create an account** to
check out, keep a wishlist and see their orders.

### 3.2 Admin roles

| Capability                                                       | OWNER |  MANAGER  |            STAFF            |
| ---------------------------------------------------------------- | :---: | :-------: | :-------------------------: |
| View dashboard KPIs & financial overview                         |  ✅   |    ✅     | ❌ (operational tiles only) |
| Products, categories, brands — create/edit/archive               |  ✅   |    ✅     |   view + edit stock only    |
| Orders — view, update fulfilment status                          |  ✅   |    ✅     |             ✅              |
| Orders — cancel / refund                                         |  ✅   | ✅ (PIN)  |             ❌              |
| **Confirm payment** (requires own PIN)                           |  ✅   |    ✅     |             ❌              |
| Payment history                                                  |  ✅   |    ✅     |             ❌              |
| Generate / send invoices                                         |  ✅   |    ✅     |             ❌              |
| Customers — view                                                 |  ✅   |    ✅     |    ✅ (no spend totals)     |
| Admin users — create, edit role, suspend, reset password/PIN     |  ✅   |    ❌     |             ❌              |
| Store settings (bank details, delivery fees, auto-cancel window) |  ✅   |    ❌     |             ❌              |
| Audit trail                                                      |  ✅   | ✅ (read) |             ❌              |
| Own account settings (name, password, PIN)                       |  ✅   |    ✅     |         ✅ (no PIN)         |

Permissions are enforced **on the server** in one matrix (`server/src/lib/permissions.ts`). The UI only hides
what the server would refuse anyway. There is always at least one active OWNER; the last OWNER cannot be
demoted or suspended.

---

## 4. Brand & design system (locked — inherited from IWAN-IMS)

Source: `brand/reference/` (Color Palette, Typography System, Logo Variations, Application Layouts, Brand
Guidelines, Brand Pattern) and the IMS token file copied to `brand/reference/ims-globals.css`.

### 4.1 Colour (contractual)

| Token           | Hex         | Use                                                                                     |
| --------------- | ----------- | --------------------------------------------------------------------------------------- |
| `brand-primary` | **#156FBF** | Logo, primary CTAs ("Add to cart", "Place order"), links, active states, chart series 1 |
| `brand-navy`    | **#1E2A35** | Headings, body text, header/footer bars, admin sidebar, "Dark Accent" buttons           |
| `brand-grey`    | **#88939E** | Borders, dividers, muted icons only — **never small text** (3.13:1)                     |
| `text-muted`    | **#646F7A** | All small secondary text (5.13:1 AA)                                                    |
| `brand-white`   | **#FFFFFF** | Backgrounds, cards                                                                      |
| `focus-on-dark` | **#6BA5DD** | Focus rings on navy surfaces                                                            |

Derived scales (UI states only): `primary-50 #EAF2FA … primary-900 #051A2E`, `navy-800 #2A3947`,
`navy-700 #3A4B5B`, `grey-300 #C3CAD1`, `grey-200 #DFE4E8`, `grey-100 #F1F4F6`, `grey-50 #F8FAFB`.
Semantic: success `#16A34A` (text `#15803D`, tint `#EAF7EE`), warning `#D97706` (text `#B45309`, tint `#FEF6E7`),
danger `#DC2626` (text `#B91C1C`, tint `#FDECEC`).

**Copy the `@theme` block from `brand/reference/ims-globals.css` verbatim** into `client/src/app/globals.css`
(Tailwind v4, default palette switched off), then add only the e-commerce status tokens in §4.5. The teal seen in
one social flyer is **not** a palette colour and is not used.

### 4.2 Typography

**Montserrat only**, weights 300/400/500/600/700, served from the subset WOFF2 files in `brand/fonts/woff2/`
via `next/font/local` (no Google Fonts network call). Scale identical to the IMS: Display 48/700, H1 32/700,
H2 24/600, H3 20/600, H4 16/500, Body 16/400, Body-sm 14, Label 13/600 tracked, Caption 12 muted. Never below
12px. Prices, order numbers and counts use the `numeric` utility (tabular lining figures).

### 4.3 Shape, elevation, motion

Radii `sm 6px` (inputs, badges) · `md 10px` (buttons, cards) · `lg 16px` (modals, hero panels) · `full` (pills,
avatars). Shadows `sm/md/lg` in navy alpha, flat-first. 1px `#DFE4E8` borders. 150 ms hover/press, 200 ms panels,
250 ms modals, `prefers-reduced-motion` respected. 4px spacing grid. Max content width 1280px on the storefront,
1440px in admin.

### 4.4 Logo

- `brand/logo/svg/logo-header.svg` — full lockup (light backgrounds; header, invoices, auth pages).
- `brand/logo/svg/Logo.svg` — AB mark (favicon, mobile header, app icon, below 48px width).
- `brand/logo/svg/Logo-3.svg` — AB mark in white (navy/blue surfaces: footer, admin sidebar, hero).
- `brand/logo/svg/logo-new-a-1.svg` — horizontal white lockup (admin sidebar head).
  Resolve every logo through **one manifest module** (`client/src/components/brand/logo-manifest.ts`), exactly as
  the IMS does, because the identity is being re-issued (new "I WAN BUY GADGETS" mark is **not** cleared for use).
  Never stretch, recolour, rotate or add effects. Clear space = cap height of the "A".

### 4.5 E-commerce status tokens (new)

| Order status                   | Background | Text      |
| ------------------------------ | ---------- | --------- |
| `PENDING_PAYMENT`              | `#FEF6E7`  | `#B45309` |
| `AWAITING_CONFIRMATION`        | `#EAF2FA`  | `#115A9A` |
| `PAID` / `PROCESSING`          | `#EAF2FA`  | `#0D4475` |
| `READY_FOR_PICKUP` / `SHIPPED` | `#F3EEFC`  | `#6D28D9` |
| `DELIVERED` / `COMPLETED`      | `#EAF7EE`  | `#15803D` |
| `CANCELLED` / `REFUNDED`       | `#FDECEC`  | `#B91C1C` |

Every badge carries text as well as colour.

### 4.6 Component conventions

Primary button solid `#156FBF`/white, 10px radius, 44px height on storefront (48px for the main product CTA);
"Dark Accent" button navy; outlined secondary white with grey border. Inputs 44px, 6px radius, label above.
Product card: white, 10px radius, 1px border, image on `grey-50` square, brand caption, name (2 lines max),
price bold navy, optional strike-through compare-at price, stock pill, wishlist heart top-right, add-to-cart
button. The storefront header is white with a 1px bottom border; the footer and announcement bar are navy. The
hero follows the Application Layouts "NEW ARRIVALS" panel: blue gradient `#156FBF → #0D4475`, white mark,
uppercase display headline, white pill CTA "SHOP NOW". The admin shell copies the IMS shell: navy 260px sidebar
(collapses to 72px rail), white top bar, KPI tiles, sticky-header tables.

### 4.7 Imagery

`brand/images/` holds 11 approved lifestyle/product photos — use them for the hero, category tiles, promo banners
and auth-page side panels (optimise to WebP with `sharp` at build/seed time; originals are large). Product
photos for seeded items are **generated placeholders** (a clean SVG device silhouette per category on `grey-50`
with the model name), clearly replaceable by the owner uploading real photos in admin. No stock photos from the
internet, no hot-linking.

---

## 5. Company details (for footer, invoices, emails)

```
ALI_IWANBUY INTEGRATED SERVICE LTD — Phones & Gadget Store
RC 8276954 · TIN 32843883-0001
Registered: No. 26, Olumbo Plaza, Ahmadu Bello Way, Birnin Kebbi, Kebbi State, Nigeria
Shop: Shop 7 & 8, Olumbu Plaza, Birnin Kebbi, Kebbi State (as shown on brand flyers)
Phone / WhatsApp: +234 703 925 4143
Tagline: Clean. Modern. Reliable.
```

All of these live in **Store Settings** (editable by the OWNER), seeded with the values above. The two address
spellings are recorded as an open question in `DECISIONS.md` — invoices use the registered address.

---

## 6. Architecture

### 6.1 Repository layout (pnpm workspaces)

```
ALI_IWANBUY-STORE/
├── CLAUDE.md                 build rules for Claude Code
├── README.md                 setup, scripts, demo accounts
├── package.json              workspace root: dev runs client + server together
├── pnpm-workspace.yaml
├── brand/                    logo, fonts, approved images, reference sheets (read-only inputs)
├── docs/                     this overview, batch prompts, PROGRESS.md, DECISIONS.md, LAB-PHASES.md
├── client/                   Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4
│   └── src/
│       ├── app/
│       │   ├── (store)/              storefront: /, /shop, /category/[slug], /product/[slug], /cart, /search
│       │   ├── (auth)/               /login, /register
│       │   ├── (account)/account/    /account/settings, /account/orders, /account/orders/[number], /account/wishlist
│       │   ├── checkout/             /checkout, /checkout/success/[number]
│       │   └── admin/
│       │       ├── login/
│       │       └── (panel)/          /admin, /admin/orders, /admin/products, /admin/payments, /admin/invoices,
│       │                             /admin/customers, /admin/users, /admin/audit, /admin/settings
│       ├── components/  ui/ brand/ store/ account/ checkout/ admin/ shared/
│       ├── lib/         api client, money, date, cn, validators (shared zod schemas re-exported)
│       ├── stores/      zustand: cart (persisted), ui
│       └── hooks/
├── server/                   Express 5 + Mongoose 8 + TypeScript
│   └── src/
│       ├── app.ts  index.ts  config/ (env via zod)
│       ├── models/           Mongoose schemas (§7)
│       ├── routes/           /api/v1/... routers (public, customer, admin)
│       ├── controllers/      thin HTTP layer
│       ├── services/         ALL business rules (orders, payments, invoices, stock, audit, auth)
│       ├── middleware/       auth (customer/admin), requirePermission, validate(zod), rateLimit, error
│       ├── lib/              money, permissions, numbering, pdf (invoice), mailer, logger, pagination
│       ├── jobs/             auto-cancel unpaid orders
│       └── seed/             seed + demo data + placeholder product images
│   └── tests/                vitest + supertest + mongodb-memory-server (replica set)
└── shared/                   (package) zod schemas + types used by both client and server
```

### 6.2 Request flow

**Component → API client → Express route → controller → service → Mongoose model.** No business rule lives in a
controller or a React component. Services write the audit log. Multi-document writes (place order, confirm
payment, cancel order) run in a **MongoDB transaction** (`session.withTransaction`) — this requires a replica
set: MongoDB Atlas (any tier) in dev/prod, `mongodb-memory-server` `MongoMemoryReplSet` in tests and for the
zero-install local mode (`pnpm db:local`).

### 6.3 Client ↔ server

- The Next.js app **rewrites `/api/*` → `http://localhost:4000/api/*`** (`API_ORIGIN` env), so the browser sees one
  origin and cookies stay first-party. Server Components call the API with `API_ORIGIN` directly, forwarding the
  cookie header.
- Public catalogue pages are **Server Components** with `revalidate` (60 s) for speed/SEO; cart, wishlist,
  checkout and admin tables are Client Components using **TanStack Query**.
- Forms: react-hook-form + zod (schemas from `shared/`), so client and server validate identically.

### 6.4 Auth

- Two separate realms: **customer** (`aib_c` cookie) and **admin** (`aib_a` cookie). Separate JWT secrets,
  `httpOnly`, `sameSite=lax`, `secure` in production. Customer session 7 days; admin 8 hours, sliding.
- Every authenticated request re-reads the user and compares `tokenVersion` (bumped on password change,
  suspension, role change), so revocation is immediate.
- Passwords: bcrypt (cost 12), min 8 chars with a letter and a number. 8 failed logins in 15 min → 30 min lock.
  Rate limit auth routes (5/min/IP).
- Next.js `middleware.ts` redirects unauthenticated users away from `/account`, `/checkout` and `/admin/(panel)`;
  the API is the real authority.

### 6.5 Payment PIN

- Every OWNER/MANAGER sets a **4–6 digit PIN** in their admin account settings before they can confirm payments,
  cancel paid orders or issue refunds. bcrypt-hashed, separate from the password.
- Rejects trivial PINs (`0000`, `1111`, `1234`, `123456`, `4321`, repeated digits). 5 wrong PINs → PIN locked
  for 15 min + audit row `PIN_LOCKED`. The OWNER can reset another admin's PIN (forcing them to set a new one).
- PIN is sent only in the body of the specific action request (`POST /admin/payments/:id/confirm { pin }`),
  never stored client-side.

### 6.6 Money, time, numbering

- Money is **integer kobo** everywhere (DB, API, client). Formatting `₦1,250,000` (no decimals on storefront,
  `.00` on invoices) happens at render only via `lib/money.ts`. No floats.
- Time zone **Africa/Lagos**. Dates render `12 Oct 2026`, times `14:05`.
- Human-readable numbers from an atomic `counters` collection: orders `AIB-ORD-202610-0001`, invoices
  `AIB-INV-202610-0001`, payments `AIB-PAY-202610-0001` (monthly sequence).

### 6.7 Files & email

- Product images: `multer` upload → `sharp` resize to 400/800/1400 WebP → stored under `server/uploads/`
  (served statically at `/uploads`) in development, through a `storage` interface; production uses Cloudinary
  (`STORAGE_PROVIDER=cloudinary`) because the API host's disk is ephemeral (ADR-008). Invoice PDFs use the same
  interface.
- Hosting (lab phase 3): client on **Vercel**, API on **Render**, database on **MongoDB Atlas**; Vercel rewrites
  `/api/*` to Render so cookies stay first-party. Full procedure in `docs/DEPLOYMENT.md` (written in Batch 3).
- Invoices: PDF generated server-side with **pdfkit**, branded (logo, company block, RC/TIN, bank details,
  line items, totals, "Clean. Modern. Reliable." footer), A4.
- Email: **nodemailer** behind a `mailer` interface. Dev uses a "file transport" that writes each email (HTML +
  PDF attachment) to `server/.local/outbox/` and logs the path; production uses SMTP env vars. Emails: welcome,
  order placed, payment confirmed, invoice, order status changed, admin invite.

### 6.8 Libraries (fixed)

Client: next 15.5, react 19, tailwindcss 4, radix-ui primitives (shadcn-style components copied/adapted from the
IMS `components/ui` _patterns_, rewritten in this repo), lucide-react, @tanstack/react-query, zustand,
react-hook-form, zod, sonner, recharts (admin charts only), clsx + tailwind-merge.
Server: express 5, mongoose 8, zod, bcryptjs, jsonwebtoken, cookie-parser, helmet, cors, express-rate-limit,
multer, sharp, pdfkit, nodemailer, pino + pino-http, dotenv. Dev: tsx, typescript, vitest, supertest,
mongodb-memory-server, eslint, prettier, playwright (smoke E2E).

---

## 7. Data model (MongoDB / Mongoose)

All documents have `createdAt/updatedAt`. Nothing is hard-deleted — archive flags (`isArchived`/`status`).
Money fields end in `Kobo` and are integers.

| Collection                      | Key fields                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Category**                    | name, slug (unique), parent (ObjectId, max 2 levels), image, sortOrder, isActive                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Brand**                       | name, slug (unique), logo?, isActive                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Product**                     | name, slug (unique), brand, category, shortDescription, description (markdown-lite), highlights[], specs [{label,value}], images [{url, alt, sortOrder}], condition (`NEW`, `UK_USED`, `REFURBISHED`), warrantyMonths, tags[], isFeatured, isNewArrival, status (`DRAFT`, `ACTIVE`, `ARCHIVED`), **variants[]**, priceFromKobo (denormalised min), ratingless                                                                                                                                                                                         |
| **Product.variants[]** (subdoc) | _id, sku (unique, sparse index across products), label (e.g. "256GB · Graphite"), attributes {storage?, colour?, ram?}, priceKobo, compareAtPriceKobo?, stock (int ≥ 0), lowStockThreshold, isActive                                                                                                                                                                                                                                                                                                                                                  |
| **Customer**                    | firstName, lastName, **email (unique, lower-case, immutable after creation)**, phone?, passwordHash, tokenVersion, addresses [{_id, label, fullName, phone, line1, line2?, city, state, landmark?, isDefault}], wishlist [productId], status (`ACTIVE`, `SUSPENDED`), lastLoginAt, failedLogins, lockedUntil                                                                                                                                                                                                                                          |
| **Cart**                        | customer (unique), items [{product, variantId, qty}] — server copy for signed-in customers; guests use the persisted client cart, merged on login                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Order**                       | orderNumber, customer, items [{product, variantId, name, variantLabel, sku, image, unitPriceKobo, qty, lineTotalKobo}] (snapshot), subtotalKobo, deliveryFeeKobo, totalKobo, deliveryMethod (`PICKUP`, `LOCAL_DELIVERY`, `NATIONWIDE`), shippingAddress (snapshot), paymentMethod (`BANK_TRANSFER`, `PAY_ON_DELIVERY`), paymentStatus (`UNPAID`, `AWAITING_CONFIRMATION`, `PAID`, `REFUNDED`), status (§8), customerTransferRef?, notes?, statusHistory [{status, at, by, byType, note}], invoice?, cancelledReason?, placedAt, paidAt?, completedAt? |
| **Payment**                     | paymentNumber, order, customer, amountKobo, method, reference?, status (`CONFIRMED`, `REFUNDED`), confirmedBy (Admin), confirmedAt, note?, refundOf?                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Invoice**                     | invoiceNumber, order, customer, issuedBy, issuedAt, totalKobo, pdfPath, sentAt[], status (`ISSUED`, `SENT`, `VOID`)                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Admin**                       | firstName, lastName, email (unique), phone?, role (`OWNER`, `MANAGER`, `STAFF`), passwordHash, mustChangePassword, pinHash?, pinFailed, pinLockedUntil, tokenVersion, status (`ACTIVE`, `SUSPENDED`), lastLoginAt, failedLogins, lockedUntil, createdBy                                                                                                                                                                                                                                                                                               |
| **AuditLog**                    | at, actorType (`ADMIN`, `CUSTOMER`, `SYSTEM`), actor, actorName (snapshot), action (e.g. `ORDER_STATUS_CHANGED`, `PAYMENT_CONFIRMED`, `PRODUCT_UPDATED`, `ADMIN_CREATED`, `PIN_FAILED`, `LOGIN_FAILED`, `PERMISSION_DENIED`), entityType, entityId, summary, diff {before, after} (changed fields only, secrets redacted), ip, userAgent. **Append-only**: model hooks reject update/delete. TTL none.                                                                                                                                                |
| **Setting** (singleton)         | storeName, legal block (§5), phone, whatsapp, email, bank {bankName, accountName, accountNumber}, deliveryFees {localKobo, nationwideKobo}, freeDeliveryThresholdKobo?, unpaidAutoCancelHours (default 48), lowStockDefault (default 3), invoiceFooterNote                                                                                                                                                                                                                                                                                            |
| **Counter**                     | _id (e.g. `order-202610`), seq                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

Indexes: product `slug`, `status+category`, `status+brand`, text index on name/brand/tags; `variants.sku`;
order `orderNumber`, `customer+placedAt`, `status+placedAt`, `paymentStatus`; payment `confirmedAt`; audit
`at`, `actor`, `entityType+entityId`.

---

## 8. Order lifecycle

```
PENDING_PAYMENT ──customer "I have paid"──▶ AWAITING_CONFIRMATION ──admin confirms (PIN)──▶ PAID
      │  (bank transfer)                                                                     │
      │                                                                                     ▼
      │                                                                                 PROCESSING
      │  (pay on delivery/pickup: order goes straight to PROCESSING, paymentStatus UNPAID)   │
      ▼                                                                    ┌────────────────┴───────────┐
  CANCELLED  ◀── customer (before paid) / admin / auto-cancel job     READY_FOR_PICKUP             SHIPPED
                                                                           └──────────┬─────────────────┘
                                                                                      ▼
                                                                          DELIVERED → COMPLETED
                                     PAID/PROCESSING ──admin refund (PIN)──▶ REFUNDED
```

Rules:

- **Stock** is decremented atomically when the order is placed (conditional update `stock >= qty` inside the
  transaction; any failure aborts the whole order and tells the customer which item is short). Stock is
  restored on CANCELLED and REFUNDED.
- Pay-on-delivery orders are confirmed as paid (with PIN) when cash/transfer is collected at hand-over; an order
  cannot reach COMPLETED while `paymentStatus ≠ PAID`.
- Unpaid bank-transfer orders in `PENDING_PAYMENT` older than `unpaidAutoCancelHours` are auto-cancelled by a
  job (runs every 15 min) with actor `SYSTEM`.
- Only legal transitions are accepted (one transition table in `server/src/lib/order-lifecycle.ts`); every
  transition appends to `statusHistory`, writes an audit row and (where relevant) emails the customer.
- Confirming a payment creates a `Payment` document and auto-issues an **Invoice** (status `ISSUED`) which the
  admin can then send.

---

## 9. Storefront — functional requirements

| ID   | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-1  | **Header**: logo, search bar (instant suggestions after 2 chars), category menu (mega-menu desktop, drawer mobile), icons for **Wishlist** (count), **Cart** (count, opens mini-cart drawer), **Account** dropdown: signed out → Sign in / Create account; signed in → _Account settings_, _My orders_, _Wishlist_, _Sign out_. Navy announcement bar above: "Call/WhatsApp +234 703 925 4143 · Pickup in Birnin Kebbi · Nationwide delivery".                                                                                        |
| S-2  | **Home**: hero (Application-Layouts "NEW ARRIVALS" style, brand photo), category tiles, Featured products, New arrivals, shop-by-brand strip, value props (Genuine devices · Warranty · Fast pickup · Secure payment), promo banner, footer.                                                                                                                                                                                                                                                                                          |
| S-3  | **Shop / category listing** (`/shop`, `/category/[slug]`): product grid (2 cols mobile, 3 tablet, 4 desktop), filters — category, brand (multi), price range (min/max), condition, in-stock only; sort — newest, price ↑, price ↓, name; pagination (24/page) or "Load more"; result count; active-filter chips with clear-all. **All filter/sort/page state in the URL.** Mobile filters in a bottom sheet. Empty state with reset.                                                                                                  |
| S-4  | **Search** (`/search?q=`): text search on name/brand/tags with the same filters.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| S-5  | **Product detail** (`/product/[slug]`): gallery (thumbnails, zoom-on-hover desktop, swipe mobile), brand, name, price + compare-at, condition badge, warranty, **variant selector** (storage/colour chips; price & stock update), quantity stepper capped at stock, **Add to cart**, **Buy now**, wishlist toggle, stock state ("In stock", "Only 2 left", "Out of stock" disables add), highlights, specs table, description, delivery/pickup info, "WhatsApp us about this" link, related products. SEO metadata + JSON-LD Product. |
| S-6  | **Cart**: mini-cart drawer + `/cart` page; change qty, remove, line totals, subtotal, delivery estimate note, "Proceed to checkout". Guest cart persisted in localStorage (zustand persist); on sign-in merged into the server cart (qty capped at stock). Prices are always re-validated by the server at checkout.                                                                                                                                                                                                                  |
| S-7  | **Wishlist** (signed in): heart on cards/detail toggles; `/account/wishlist` grid with move-to-cart. Clicking the heart while signed out prompts sign-in and returns.                                                                                                                                                                                                                                                                                                                                                                 |
| S-8  | **Create account** (`/register`): first name, last name, email, password, confirm password, accept terms. One screen. Auto sign-in, welcome email, redirect back to where they were (`?next=`, validated same-origin). **Sign in** (`/login`) with email + password, show/hide password.                                                                                                                                                                                                                                              |
| S-9  | **Checkout** (`/checkout`, signed in, cart not empty) — one page, three clear sections: **1 Delivery** (Pickup at shop / Local delivery Birnin Kebbi / Nationwide; choose saved address or add new inline — address required unless pickup), **2 Payment** (Bank transfer / Pay on delivery-pickup), **3 Review** (items, subtotal, delivery fee, total, order note). "Place order" → server validates prices & stock, creates order in a transaction.                                                                                |
| S-10 | **Order success** (`/checkout/success/[number]`): order number, summary; for bank transfer, the shop's bank details with copy buttons, amount, and an **"I've made the transfer"** button (optional transfer reference) → `AWAITING_CONFIRMATION`. Confirmation email sent.                                                                                                                                                                                                                                                           |
| S-11 | **My orders** (`/account/orders`): list (number, date, items count, total, status badge), filter by status; detail page with items, totals, address, payment info, **status timeline**, "I've made the transfer" (if pending), **Cancel order** (only while `PENDING_PAYMENT`/`AWAITING_CONFIRMATION`), download invoice PDF (once issued).                                                                                                                                                                                           |
| S-12 | **Account settings** (`/account/settings`): tabs — **Profile** (first name, last name editable; phone; **email shown read-only with a lock icon and "Email can't be changed"**), **Addresses** (add, edit, delete, set default; max 5), **Password** (current, new, confirm; bumps tokenVersion → other sessions signed out).                                                                                                                                                                                                         |
| S-13 | **Static pages**: About, Contact (address, map embed link, phone, WhatsApp), Delivery & Returns, Warranty, Privacy, Terms. Short, real content from §5.                                                                                                                                                                                                                                                                                                                                                                               |
| S-14 | 404 and error pages in brand. Loading skeletons on every data view. Toasts for cart/wishlist actions.                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## 10. Admin dashboard — functional requirements

| ID   | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-1  | **Admin sign-in** (`/admin/login`) separate from customer sign-in; forced password change on first login (`mustChangePassword`); then prompt OWNER/MANAGER to set their payment PIN. Suspended admins are refused.                                                                                                                                                                                                                                                                                                                                                    |
| A-2  | **Shell**: navy sidebar (Overview, Orders, Products, Categories & Brands, Payments, Invoices, Customers, Admin users, Audit trail, Settings) filtered by role; top bar with global search (order number / customer email / product), notifications count (orders awaiting confirmation), admin menu (Account settings, Sign out). Collapsible rail; mobile drawer.                                                                                                                                                                                                    |
| A-3  | **Overview / Financial KPIs** with period selector (Today, 7 days, 30 days, This month, Last month, custom range; in URL): KPI tiles — **Revenue (paid)**, **Orders**, **Average order value**, **Awaiting confirmation (₦ and count)**, **Refunds**, **New customers**, **Units sold**, **Low-stock variants** — each with delta vs previous period. Charts: revenue by day (line/area), orders by status (bar), payment-method split, top 5 products by revenue. Tables: recent orders, low stock. STAFF sees operational tiles only (orders to fulfil, low stock). |
| A-4  | **Orders**: table with search, filters (status, payment status, payment method, delivery method, date range), sort, pagination, CSV export of the filtered set. Order detail: customer, items, totals, address, transfer reference, payment panel, status timeline, actions — _advance status_ (legal next states only), _confirm payment_ (PIN modal), _cancel_ (reason; PIN if paid), _refund_ (PIN, reason), _generate/send invoice_, internal notes.                                                                                                              |
| A-5  | **Products**: table/grid with search, filters (category, brand, status, stock state), bulk activate/archive; create/edit form — details, category, brand, condition, warranty, highlights, specs (key/value rows), description, images (upload up to 6, drag reorder, set primary), **variants** (label, storage, colour, SKU auto-generated `BRD-MODEL-ATTR-NNNN` and editable, price, compare-at, stock, low-stock threshold, active), featured/new-arrival flags, status. Quick stock adjust from the list (reason required, audited).                             |
| A-6  | **Categories & Brands**: CRUD, two-level categories, sort order, image, activate/archive (cannot archive one with active products without moving them).                                                                                                                                                                                                                                                                                                                                                                                                               |
| A-7  | **Payments / payment history**: all confirmed payments and refunds with filters (date, method, admin), totals row, CSV export; each row links to the order and shows who confirmed it and when. "Awaiting confirmation" queue at the top.                                                                                                                                                                                                                                                                                                                             |
| A-8  | **Invoices**: list (number, order, customer, total, issued, sent status); generate for any PAID order (auto on confirmation); view/download PDF; **Send to customer** (emails PDF; records `sentAt`); resend; void (OWNER, reason).                                                                                                                                                                                                                                                                                                                                   |
| A-9  | **Customers**: list with search, orders count, total spent (OWNER/MANAGER), joined date, status; detail with orders and addresses; suspend/reactivate (audited). Admins cannot edit a customer's email.                                                                                                                                                                                                                                                                                                                                                               |
| A-10 | **Admin users** (OWNER only): list; **create admin** (name, email, role, phone) → temporary password shown once + invite email; edit role; suspend/reactivate; reset password (new temporary); reset PIN. Cannot remove/demote the last OWNER or suspend self.                                                                                                                                                                                                                                                                                                        |
| A-11 | **Account settings** (every admin): profile (name, phone; email read-only), change password, **set/change payment PIN** (current PIN or password required to change).                                                                                                                                                                                                                                                                                                                                                                                                 |
| A-12 | **Store settings** (OWNER): business details, contact, bank details shown at checkout and on invoices, delivery fees, free-delivery threshold, unpaid auto-cancel hours, low-stock default, invoice footer note. Every change audited with before/after.                                                                                                                                                                                                                                                                                                              |
| A-13 | **Audit trail**: reverse-chronological table — time, actor, action, entity (linked), summary; filters (actor, action type, entity type, date range), search, expandable row showing the before/after diff; CSV export. Read-only; nobody can edit or delete entries.                                                                                                                                                                                                                                                                                                  |

## 11. API surface (`/api/v1`)

Public: `GET /catalog/home`, `GET /products` (filters, sort, page), `GET /products/:slug`, `GET /products/:slug/related`,
`GET /categories`, `GET /brands`, `GET /search/suggest?q=`, `GET /settings/public`.
Customer auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
Customer (auth): `PATCH /me/profile`, `POST /me/password`, `GET|POST|PATCH|DELETE /me/addresses[/:id]`,
`GET|PUT /me/cart`, `POST /me/cart/merge`, `GET /me/wishlist`, `POST|DELETE /me/wishlist/:productId`,
`POST /orders` (checkout), `GET /orders`, `GET /orders/:number`, `POST /orders/:number/transfer-made`,
`POST /orders/:number/cancel`, `GET /orders/:number/invoice.pdf`.
Admin auth: `POST /admin/auth/login`, `POST /admin/auth/logout`, `GET /admin/auth/me`, `POST /admin/auth/change-password`, `POST /admin/me/pin`, `PATCH /admin/me/profile`.
Admin: `GET /admin/dashboard?period=`, `/admin/orders` (list, detail, `POST :id/status`, `POST :id/cancel`, `POST :id/refund`),
`/admin/payments` (list, `POST /admin/orders/:id/confirm-payment {pin, amountKobo, reference, note}`),
`/admin/invoices` (list, `POST` generate, `GET :id/pdf`, `POST :id/send`, `POST :id/void`),
`/admin/products` (CRUD, `POST :id/images`, `PATCH :id/images/order`, `POST :id/variants/:vid/stock`),
`/admin/categories`, `/admin/brands`, `/admin/customers` (list, detail, `POST :id/status`),
`/admin/users` (OWNER: CRUD-ish, `POST :id/reset-password`, `POST :id/reset-pin`, `POST :id/status`),
`/admin/settings` (GET/PATCH), `/admin/audit` (list, export). Lists: `?page&limit&sort&…filters`, response
`{ data, page, limit, total }`. Errors: `{ error: { code, message, fields? } }` with correct HTTP status.
CSV exports: `GET …/export.csv` with the same filters.

## 12. Non-functional requirements

- **Security**: helmet, CORS locked to the client origin, rate limits on auth/PIN, zod validation on every
  input, Mongo query sanitisation (strip `$`/`.` keys), no stack traces in responses, secrets only in env,
  `.env.example` documented, cost/financial fields never sent to STAFF.
- **Performance**: storefront home LCP < 2.5 s on simulated 4G; product list API p95 < 150 ms on seed data;
  images WebP with `next/image` sizes; no client JS for static marketing sections.
- **Accessibility**: WCAG 2.1 AA — keyboard reachable, visible focus, labels on all inputs, alt text, colour
  never the only signal; axe check in E2E smoke.
- **Responsive**: 360 px → 1920 px. Storefront is mobile-first (most customers are on phones).
- **Quality gates**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all clean at the end of every batch.
  No TODOs, no placeholder lorem ipsum, no commented-out code.
- **Observability**: pino request logs, `GET /api/health` (DB ping).

## 13. Seed data

`pnpm seed` (refuses to run when `NODE_ENV=production`) creates:

- Settings with §5 values and placeholder bank details clearly marked `UPDATE IN SETTINGS`.
- Categories: Phones (iPhone, Android), Tablets, Laptops, Smartwatches, Audio (Earbuds, Headphones, Speakers),
  Accessories (Chargers & Cables, Cases & Protection, Power Banks, Memory).
- Brands: Apple, Samsung, Tecno, Infinix, Xiaomi, Oppo, Itel, Nokia, Oraimo, Anker, JBL, Generic.
- ~40 products with realistic Nigerian prices and variants (e.g. iPhone 13 Pro Max 128/256GB, Samsung Galaxy
  A15/A25, Tecno Camon 30, Infinix Hot 40i, Redmi Note 13, iPad 10th Gen, MacBook Air M1, Apple Watch SE,
  AirPods Pro 2, Oraimo FreePods, JBL Flip 6, Anker 20W charger, Oraimo 20000mAh power bank, cases, screen
  guards), some low-stock and one out-of-stock, several featured/new-arrival.
- Admins: OWNER, MANAGER, STAFF (OWNER and MANAGER with PINs set); 6 customers; ~60 orders across the last 60
  days in every status with payments and invoices, so the dashboard has history.
- Demo credentials printed to the console and written to `docs/DEMO-ACCOUNTS.md` (dev only).

## 14. Testing strategy

- **Server** (vitest + supertest + MongoMemoryReplSet): auth (register, immutable email, lockout), permissions
  matrix, order placement (stock decrement, concurrent last-unit race → exactly one succeeds, price
  tampering ignored), lifecycle transitions (legal/illegal), PIN (wrong PIN, lockout, trivial PIN rejected),
  payment confirmation → payment + invoice + audit, cancel/refund restock, audit immutability, dashboard maths.
- **Client** (vitest + Testing Library): money formatting, cart store (add/merge/cap), filter URL state.
- **E2E** (Playwright smoke, desktop + mobile viewport): guest browse → filter → product → add to cart →
  register → checkout → success → "I've paid"; admin login → confirm payment with PIN → send invoice → audit row
  visible; axe on home, product, checkout, admin overview.

## 15. GoMyCode lab-phase alignment

The four phases are recorded verbatim in `docs/LAB-PHASES.md` with a line-by-line coverage checklist.

| Lab phase                                             | What it asks                                                                                                    | Delivered in                                                                                                                                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — **Front-end Development: User Interface Design**  | UI in **ReactJS**: layout, navigation, styling; visually appealing, easy to navigate, responsive on all devices | Batch 1 (design system, storefront, responsive), extended in Batches 2–3 (account, checkout, admin UI). Next.js is the React framework used — say so explicitly in README and pitch |
| 2 — **Back-end Development: Server-side Development** | **Node.js + Express** API endpoints for **user authentication, product management, order processing**           | Batch 1 (Express, MongoDB, catalogue API), Batch 2 (customer auth, orders), Batch 3 (admin auth, product CRUD, payments, invoices) + `docs/API.md`                                  |
| 3 — **Deployment**                                    | Deploy to production, test thoroughly, set up hosting, configure the server, ensure it runs smoothly            | Batch 3 Part H: Vercel (client) + Render (API) + MongoDB Atlas, production config, live smoke + Playwright against the live URL, `docs/DEPLOYMENT.md` with a test report            |
| 4 — **Pitch your work**                               | Presentation of purpose & significance, objectives, outcomes, findings                                          | Batch 3 Part I: `docs/PITCH.md` (talk track + slide outline), demo script, screenshots; deck built from it afterwards                                                               |

Rule: any lab requirement not covered is added to the relevant batch and logged in `DECISIONS.md` — never
silently skipped.

## 16. Roadmap beyond v1

IMS ↔ store stock sync (IMS as stock master via its `/api/v1`), Paystack/Flutterwave live payments, SMS/WhatsApp
order notifications, product reviews, coupons, delivery partner integration, the re-issued "I WAN BUY GADGETS"
logo once vector exports land.

## 17. Execution batches (summary)

| Batch                                          | Scope                                                                                                                                                                                                                                                                                                                                         | Exit criteria                                                                                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1 — Foundation & Storefront**                | Monorepo, tooling, design system, Express + Mongo foundation, catalogue models, seed, public catalogue API, home, shop/category/search with filters, product detail, cart (guest), static pages                                                                                                                                               | A guest can browse, filter, view and fill a cart on mobile and desktop; all gates green                                                                |
| **2 — Customer accounts, wishlist & checkout** | Customer auth, account settings (profile/email lock/addresses/password), wishlist, server cart + merge, checkout, orders with transactional stock, success page with bank details, My Orders + timeline + cancel, emails, auto-cancel job                                                                                                     | A customer registers, checks out, marks transfer made, and sees the order; race test passes                                                            |
| **3 — Admin dashboard, deployment & pitch**    | Admin auth + roles + PIN, shell, KPIs & charts, orders management, payment confirmation & history, invoices (PDF + email), products/categories/brands CRUD + images + stock, customers, admin users, store settings, audit trail, E2E, README, API docs; **production deployment + live testing** (lab phase 3); **pitch pack** (lab phase 4) | Owner runs the business end-to-end from `/admin` on the live URL; every mutation audited; all gates + local and production E2E green; pitch pack ready |
