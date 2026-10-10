# Progress

| Batch                                             | Branch                           | Status         | Commit    | Date       |
| ------------------------------------------------- | -------------------------------- | -------------- | --------- | ---------- |
| 0 — Planning (overview, batch prompts, brand kit) | —                                | ✅ Done        | —         | 8 Oct 2026 |
| 1 — Foundation & Storefront                       | `batch/01-foundation-storefront` | ✅ Done        | `fd71b5e` | 9 Oct 2026 |
| 2 — Accounts, wishlist & checkout                 | `batch/02-accounts-checkout`     | ✅ Done        | `687e062` | 9 Oct 2026 |
| 3 — Admin dashboard, deployment & pitch           | `batch/03-admin`                 | 🔨 In progress |           |            |

## Batch log

### Batch 1 — Foundation & Storefront · 9 Oct 2026

A guest can browse the real catalogue, filter it, open a product, choose a variant and fill a cart — on a phone
and on a desktop, in the brand.

**Monorepo & tooling.** pnpm workspaces (`client`, `server`, `shared`), TypeScript strict everywhere from one
`tsconfig.base.json`, ESLint 9 flat config covering all three packages (typescript-eslint, React 19, Next 15,
jsx-a11y), Prettier with the Tailwind plugin, `.editorconfig`, `.gitignore`, and `.env.example` for both apps.
Root scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`, `format`, `format:check`, `seed`,
`db:local`, `images:prepare`, `lighthouse`.

**Shared package.** Money in integer kobo with `bigint` arithmetic (`formatNaira`, `parseNairaToKobo`,
`koboToNaira`, `multiplyKobo`, `discountPercent`), the order/payment/condition/sort enums the later batches
need, and the zod schemas the catalogue API and the client are both typed from.

**Server.** Express 5 app factory plus `index.ts`; helmet, CORS locked to the client origin, cookie-parser, a
1 MB JSON limit, pino-http, a Mongo operator stripper, `/uploads` static, `/api/health`, a 404 handler and one
error handler that turns `AppError` and `ZodError` into the documented error shape. Env parsed by zod at boot,
naming anything missing. Models: `Category`, `Brand`, `Product` (variant subdocuments plus a pre-save hook that
keeps the denormalised price and stock in step), `Setting`, `Counter`, with their indexes in the schemas.
Libraries for atomic monthly numbering, pagination, slugs, SKUs and Lagos dates. Public catalogue routes: home
payload, product list with every filter, product by slug, related, categories tree, brands, search suggestions,
public settings, and `POST /cart/validate`.

**Seed.** `pnpm seed` writes settings (bank details marked `UPDATE IN SETTINGS`), 15 categories, 12 brands and
43 products with 60 variants — some low on stock, one sold out, several featured and new arrivals — and
generates a placeholder image per product (an SVG device silhouette, plus a WebP rasterised from it).
`pnpm db:local` runs a single-node MongoDB replica set with nothing to install.

**Client.** Next.js 15 App Router, React 19, Tailwind v4 with the IMS token sheet copied verbatim plus the
order-status tokens, Montserrat from local WOFF2 only, the logo behind one manifest module, and 21 brand-bound
UI primitives. Storefront: announcement bar; header with search suggestions, category mega-menu, mobile drawer,
mini-cart and account menu; home (hero, category tiles, featured, new arrivals, brands, value props, promo
banner); shop, category and search listings with filters, sort, chips and pagination all held in the URL;
product detail with gallery, variant selector, stock states, WhatsApp link, specs and JSON-LD; cart with
server-side revalidation; six written pages; 404, error and loading states; and a development-only
`/style-guide`.

#### Verified

| Gate             | Result                                                                           |
| ---------------- | -------------------------------------------------------------------------------- |
| `pnpm typecheck` | clean (3 packages)                                                               |
| `pnpm lint`      | clean, 0 warnings                                                                |
| `pnpm test`      | **91 passed** — 18 shared, 42 server, 31 client                                  |
| `pnpm build`     | clean; 43 product pages prerendered                                              |
| `pnpm test:e2e`  | **28 passed** — desktop + Pixel 7, including axe on home, shop, product and cart |

Lighthouse on a production build, median of three runs per page:

| Page    | Performance | Accessibility | Best practices | SEO |
| ------- | ----------- | ------------- | -------------- | --- |
| Home    | 85          | **100**       | 100            | 100 |
| Product | 81          | **100**       | 100            | 100 |

Accessibility meets the ≥ 90 target with room to spare; performance does not yet. What was done about it:
public pages were made static with a 60-second revalidate (ADR-011), all 43 product pages are prerendered, the
query client was moved off every page (ADR-012), search suggestions became a debounced fetch, and the product
gallery stopped preloading a second copy of the main image that a phone never shows. The remaining cost is
JavaScript: ~103 kB is shared by every page, and the header's interactive chrome adds most of the rest.
Measurements also move about ±5 points between runs on this machine, which is why the script now takes a
median. Follow-up below.

#### Screenshots taken during verification

Home, shop (filtered by brand, sorted by price), product detail and cart — each at 1280×800 and on a Pixel 7.
No horizontal scrolling at 360, 768, 1280 or 1920.

#### Decisions taken

ADR-009 (denormalised product fields), ADR-010 (substring search rather than a `$text` index, because
suggestions must work from two characters), ADR-011 (static catalogue pages; cookies forwarded only when a call
needs them), ADR-012 (TanStack Query mounted where it is used). OPEN-004 raised: the category tiles need real
photographs.

#### Deferred, with reasons

- **Performance to ≥ 90.** The lever left is the header's client JavaScript: loading the category mega-menu,
  the mobile drawer and the account menu on interaction rather than on first paint. It touches the chrome every
  page shares, so it belongs in its own change with the E2E suite green around it, not bolted onto the end of
  this one.
- **Wishlist and "Proceed to checkout"** link to `/login?next=…`, which Batch 2 builds. The account menu is
  built now with its signed-out items, so Batch 2 adds to it rather than replacing it.
- **`/uploads` is served from local disk.** The `STORAGE_PROVIDER` switch exists; Cloudinary is wired in
  Batch 3 per ADR-008.
- **Category tile photographs** — see OPEN-004.
- **Brand rename must rewrite `brandName` on products** (ADR-009) — for Batch 3's brand editor.

#### Needs the client

1. **Real bank details** — seeded as `UPDATE IN SETTINGS`; nothing can be paid for by transfer until the owner
   enters the account name, number and bank (OPEN-002).
2. **Real product photographs** — every product currently shows a generated placeholder (ADR-006).
3. **One photograph per category** for the home page tiles (OPEN-004).
4. **The shop address** — the registered address and the flyer address differ (OPEN-001). Invoices will use the
   registered one; the storefront shows the flyer one in the footer and both on the contact page.
5. **Opening hours** on the contact page are a reasonable assumption and need confirming.

### Batch 2 — Customer accounts, wishlist & checkout · 9 Oct 2026

A browser becomes a buyer: register in one screen, keep the cart you built as a guest, check out, and watch
the order move.

**Authentication.** `Customer` model with the email lower-cased, uniquely indexed, `immutable`, and stripped
from every query-level update as well — `PATCH /me/profile` refuses an `email` key outright with
`EMAIL_IMMUTABLE`. Register, sign in, sign out and `GET /auth/me`; bcrypt at cost 12; a generic "Email or
password is incorrect" for both halves; eight failures lock an account for thirty minutes; rate limits on the
session routes. `requireCustomer` re-reads the account and compares `tokenVersion` on every request, so a
password change ends every other session at once.

**Email.** A `mailer` interface with a development file transport that writes each message to
`server/.local/outbox/<timestamp>-<template>.html` and logs the path; SMTP takes over the moment `SMTP_HOST` is
set. One branded HTML layout (navy header strip, company block footer) behind four templates: welcome, order
placed, order cancelled and order status changed.

**Account area.** `/account` with a sidebar on a desktop and tabs on a phone. Profile (name, Nigerian phone
normalised to `+234…`, **email shown read-only with a lock and an explanation**), addresses (up to five, add
and edit in a dialog, delete with a confirm, set default, the 36 states and the FCT as a select), and password
(current, new, confirm; other sessions signed out). Every change writes an audit row.

**Wishlist and cart.** `GET|POST|DELETE /me/wishlist`, with optimistic hearts on cards and on the product
page and a count in the header; a signed-out heart offers sign-in. `Cart` model with `GET|PUT /me/cart` and
`POST /me/cart/merge`, which folds the browser's cart into the account's at sign-in — quantities added, then
capped at stock.

**Checkout and orders.** `order.service.placeOrder` runs in one MongoDB transaction: it ignores every price the
client sends, decrements each variant with a conditional update that only matches while enough stock remains,
prices the order and the delivery fee from the database, snapshots the lines and the address, clears the cart
and writes the audit row — then emails the customer after the commit. One transition table
(`lib/order-lifecycle.ts`) answers who may move an order from where to where, for this batch and for Batch 3.
Customer routes for the list, the detail, "I've made the transfer" and cancel-with-restock; an auto-cancel job
that releases stock held by unpaid orders. The checkout page is one screen — delivery, payment, review — with
a sticky total on a phone; the success page carries the order number, how to pay and copy buttons; the order
page shows a vertical timeline built from `statusHistory`.

#### Verified

| Gate             | Result                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` | clean (3 packages)                                                                                                   |
| `pnpm lint`      | clean, 0 warnings                                                                                                    |
| `pnpm test`      | **156 passed** — 18 shared, 34 client, 104 server                                                                    |
| `pnpm build`     | clean                                                                                                                |
| `pnpm test:e2e`  | **52 passed** — desktop + Pixel 7, axe on home, shop, product, cart, login, register, checkout and the account pages |

The server tests cover what this batch can get wrong: registration and the duplicate-email refusal, the email
being immutable through the route, a query update and a document save, lockout after eight failures, a
password change invalidating the old session, address CRUD and the five-address limit, the wishlist, a cart
merge capped at stock, the happy-path order (stock taken, totals right, cart cleared, audit row written), a
tampered price ignored, **ten customers racing for the last unit → exactly one order and nine honest 409s**,
cancel restocking exactly once under a double-click, another customer's order answering 404, every illegal
transition refused, and the auto-cancel sweep.

#### Bugs this batch found and fixed in its own work

- **The guest cart was emptied at sign-in.** `CartHydrator` sat in the storefront layout, so the sign-in and
  registration pages never read the stored cart and the merge sent nothing. Moved to the root layout (ADR-016).
- **Signing in bounced back to sign in.** Next had prefetched the protected page while the visitor was signed
  out and cached the middleware's redirect. Auth now ends in a full navigation (ADR-015).
- **The read-only email field had no label**, which axe caught on the account page. It is a real `<label>` now.

#### Decisions taken

ADR-013 (TanStack Query back in the root layout, revising ADR-012), ADR-014 (production-strength auth rate
limit; a looser one in development), ADR-015 (full navigation after auth), ADR-016 (cart hydrated from the root
layout).

#### Deferred, with reasons

- **Performance.** Home first-load JavaScript is now 263 kB (was 243 kB) because of ADR-013. The Batch 1
  follow-up — loading the header's menus on interaction — is still the lever, and now has more to gain.
- **`GET /orders/:number/invoice.pdf` answers 404** until Batch 3 issues invoices; the order page only shows the
  download when `order.invoice` exists.
- **Customer and order seed data.** `pnpm seed` still seeds the catalogue only. Batch 3 adds admins, customers
  and ~60 orders of history so the dashboard has something to show.
- **Payment documents** are not written yet: the model exists, and Batch 3's PIN-protected confirmation creates
  them.

#### Needs the client

1. **Real bank details** — still `UPDATE IN SETTINGS`. Until the owner enters them, the success page tells the
   customer to call the shop rather than showing an account number. This now blocks the main payment path.
2. **Real product photographs** and **category photographs** (ADR-006, OPEN-004).
3. **Which shop address is correct** (OPEN-001), and the opening hours used on the contact and pickup copy.
4. **An SMTP account** for production email. Development writes to `server/.local/outbox/`; nothing reaches a
   customer until `SMTP_HOST` is set (ADR-008).
