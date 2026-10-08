# ALI_IWANBUY Gadgets — BATCH 2 BUILD PROMPT
### Customer accounts, wishlist & checkout — the moment a browser becomes a buyer

> Send only once **Batch 1 is committed and green**. Re-read overview §3.1, §6.4–6.7, §7 (Customer, Cart, Order,
> Payment), §8 and §9 (S-6 to S-12) before starting.
> Lab alignment: **Phase 2 — Server-side Development** (Express endpoints for **user authentication** and **order
> processing**) and Phase 1 UI for accounts and checkout. Tick the matching rows in `docs/LAB-PHASES.md`.
> From this batch on, a bug can mean selling the last phone twice or losing an order. Treat the order
> transaction as the most important code in the project.

---

## PART A — Customer authentication
- [ ] `Customer` model (overview §7). Email lower-cased + trimmed, unique index; **immutable**: the schema
      marks it `immutable: true` and `PATCH /me/profile` rejects an `email` key with 400 `EMAIL_IMMUTABLE`.
- [ ] `POST /auth/register` (firstName, lastName, email, password, confirmPassword, acceptTerms) → creates,
      signs in (`aib_c` cookie), sends welcome email, returns the customer. Duplicate email → 409 with a
      friendly message ("An account with this email already exists — sign in instead").
- [ ] `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`. Lockout + rate limiting (overview §6.4).
      Generic "Email or password is incorrect" — never reveal which.
- [ ] `requireCustomer` middleware (JWT + `tokenVersion` check + status ACTIVE).
- [ ] Mailer interface with dev **file transport** → `server/.local/outbox/<timestamp>-<template>.html` (+ attachments),
      path logged. Branded HTML email layout (logo, navy header strip, footer with company block). Templates:
      welcome, order placed, order cancelled, status changed (Batch 3 uses payment-confirmed, invoice).
- [ ] Client: `/register` and `/login` pages — split layout (form left, brand photo panel right on desktop),
      react-hook-form + shared zod schemas, inline errors, show/hide password, `?next=` honoured (validated
      same-origin path). Next `middleware.ts` guards `/account/*` and `/checkout*`.
- [ ] Header account dropdown when signed in: greeting with first name, **Account settings**, **My orders**,
      **Wishlist**, **Sign out**. Signed out: Sign in / Create account.

## PART B — Account settings (S-12)
- [ ] `/account` layout with side nav (desktop) / tabs (mobile): Settings, My orders, Wishlist.
- [ ] **Profile** tab: first name, last name, phone (Nigerian format validation, normalised to `+234…`);
      **email displayed read-only with a lock icon and helper "Your email can't be changed."**
- [ ] **Addresses** tab: list cards, add/edit in a dialog (full name, phone, address line 1/2, city, state —
      select of the 36 states + FCT, landmark), delete with confirm, set default, max 5.
- [ ] **Password** tab: current, new, confirm; on success `tokenVersion++`, re-issue this session's cookie,
      other sessions are signed out; toast.
- [ ] Every change writes an audit row (`actorType: CUSTOMER`).

## PART C — Wishlist & server cart
- [ ] `GET /me/wishlist`, `POST|DELETE /me/wishlist/:productId`. Heart toggles on cards and detail are
      optimistic (TanStack Query), header shows count. Signed-out click → `/login?next=<current>` and the item is
      added after sign-in. `/account/wishlist` grid with "Move to cart" and remove.
- [ ] `Cart` model; `GET|PUT /me/cart`; `POST /me/cart/merge` called once after login/registration — merges the
      local cart (sum quantities, cap at stock, drop inactive) and the client store then mirrors the server cart
      while signed in.

## PART D — Checkout & orders (S-9, S-10, overview §8)
- [ ] Models: `Order`, `Payment` (Payment documents are created in Batch 3, the model exists now). Counter-based
      `AIB-ORD-YYYYMM-NNNN`.
- [ ] `order.service.placeOrder(customerId, input)` in **one transaction**:
      1. load cart lines from the request (product/variant/qty only — **client prices are ignored**);
      2. re-read products, reject inactive/archived;
      3. for each line `updateOne({ _id, "variants._id": vid, "variants.stock": { $gte: qty } }, { $inc: … })`
         using the positional/arrayFilters form; if `modifiedCount === 0` abort with 409 `OUT_OF_STOCK` naming
         the item and available qty;
      4. compute subtotal, delivery fee from Settings (`PICKUP` = 0; free-delivery threshold respected), total;
      5. snapshot items + address; status `PENDING_PAYMENT` for bank transfer, `PROCESSING` (paymentStatus
         `UNPAID`) for pay on delivery/pickup; `statusHistory` first entry;
      6. clear the server cart; audit `ORDER_PLACED`; after commit send "order placed" email.
- [ ] Customer order routes (overview §11): list (filter by status, paginated), detail by number (own orders
      only — another customer's number → 404), `transfer-made` (optional reference, only from
      `PENDING_PAYMENT` → `AWAITING_CONFIRMATION`), `cancel` (only `PENDING_PAYMENT`/`AWAITING_CONFIRMATION`,
      restocks in a transaction, reason optional).
- [ ] `lib/order-lifecycle.ts`: the single transition table for the whole project (Batch 3 reuses it), with
      `assertTransition(from, to, actorType)`.
- [ ] Auto-cancel job (`jobs/auto-cancel.ts`): every 15 min, cancel `PENDING_PAYMENT` orders older than
      `unpaidAutoCancelHours`, restock, actor `SYSTEM`, email the customer. Started by `index.ts`, not by `app.ts`
      (tests call the function directly).
- [ ] Client **/checkout** (one page): Delivery (method radio cards with fee; saved-address picker + "add new"
      inline; pickup shows shop address & hours), Payment (Bank transfer / Pay on delivery-pickup radio cards with
      a one-line explanation each), Review (lines, subtotal, delivery, **total**, note). Sticky order summary on
      desktop, bottom bar with total + "Place order" on mobile. Disabled while submitting; handles 409 by
      updating the cart and showing exactly what changed.
- [ ] **/checkout/success/[number]**: big confirmation, order number (copy), summary; for bank transfer: bank
      name, account name, account number (copy buttons), exact amount, "Use your order number as the transfer
      narration", **"I've made the transfer"** button (dialog with optional reference). Pay-on-delivery shows
      next steps.
- [ ] **/account/orders**: list with status badges and filter tabs; **/account/orders/[number]**: items, totals,
      delivery, payment, **vertical status timeline** from `statusHistory`, actions per state (transfer made,
      cancel with confirm), "Download invoice" placeholder area that appears only when `order.invoice` exists
      (wired in Batch 3 — the route `GET /orders/:number/invoice.pdf` returns 404 until then).

## PART E — Verification
- [ ] Server tests: register/login/logout, duplicate email, **email immutable** (PATCH with email → 400; direct
      model update → rejected), lockout after 8 failures, password change invalidates old token, address CRUD +
      limit, wishlist, cart merge caps at stock, **place order happy path** (stock decremented, totals right,
      cart cleared, audit row), **price tampering ignored**, **concurrency: stock 1, 10 parallel orders → exactly
      1 succeeds, stock 0, 9 × 409**, cancel restocks, illegal transitions refused, other customer's order → 404,
      auto-cancel job.
- [ ] Playwright: guest adds 2 items → register → cart merged → checkout (local delivery, new address, bank
      transfer) → success page shows bank details → "I've made the transfer" → My orders shows
      `Awaiting confirmation` with timeline; account settings: email field is read-only, change name, add address,
      change password then sign in with the new one. axe on login, register, checkout, account pages.
- [ ] Gates green. Commit on `batch/02-accounts-checkout`. Update `PROGRESS.md` + README.

## Acceptance criteria
- AC2.1 A new customer registers in one screen and is signed in; their email can never be changed by any route.
- AC2.2 Guest cart survives sign-in (merged); wishlist works from cards, detail and the account page.
- AC2.3 Checkout creates exactly one order atomically; stock can never go negative; client prices are ignored.
- AC2.4 Bank-transfer flow reaches `AWAITING_CONFIRMATION`; pay-on-delivery reaches `PROCESSING/UNPAID`.
- AC2.5 Customers see only their own orders, with a correct timeline, and can cancel only before payment.
- AC2.6 Every customer mutation is audited; emails land in `server/.local/outbox/`.
- AC2.7 Gates + E2E green.

**Report**, then stop.
