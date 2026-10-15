# API

`https://<host>/api/v1`. Every response is JSON except the two that are files — an invoice PDF and a CSV
export.

In the browser nothing calls this host directly: the Next.js app rewrites `/api/*` to it, so the session
cookies stay first-party (see [DEPLOYMENT.md](DEPLOYMENT.md)).

## Conventions

**Authentication** is by cookie, and there are two realms that never mix:

| Realm    | Cookie  | Lifetime                    | Set by                   |
| -------- | ------- | --------------------------- | ------------------------ |
| Customer | `aib_c` | 7 days                      | `POST /auth/login`       |
| Admin    | `aib_a` | 8 hours, slid on every call | `POST /admin/auth/login` |

Both carry a token version. Changing a password, suspending an account or changing a role bumps it, which
invalidates every session that account has anywhere, immediately.

**Permissions** on admin routes come from one matrix in `@aib/shared` and are enforced by
`requirePermission()` on the server. The dashboard hides what a role cannot do as a courtesy; the refusal is
what stops it, and every refusal writes a `PERMISSION_DENIED` audit row.

**Money** is always an integer number of **kobo**, in the request, in the response and in the database.
`₦15,000.50` is `1500050`. There are no floats anywhere in the money path.

**Errors** all have the same shape:

```json
{
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "Only 2 of that left.",
    "fields": [{ "path": "items.0.qty", "message": "Only 2 left" }]
  }
}
```

`fields` is present only for validation failures. The common codes:

| Status | Code                       | Means                                                            |
| ------ | -------------------------- | ---------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`         | The body or query did not match the schema; see `fields`.        |
| 401    | `UNAUTHENTICATED`          | No session, or it no longer identifies anyone.                   |
| 401    | `PIN_INCORRECT`            | The payment PIN is wrong. The PIN is a second sign-in (ADR-020). |
| 403    | `FORBIDDEN`                | The role does not allow it.                                      |
| 403    | `PASSWORD_CHANGE_REQUIRED` | The admin is still carrying a temporary password.                |
| 403    | `PIN_REQUIRED`             | This order has been paid for, so the PIN is needed.              |
| 404    | `NOT_FOUND`                | Also the answer for someone else's order, deliberately.          |
| 409    | `OUT_OF_STOCK`             | Someone else bought the last one between the page and the post.  |
| 409    | `INVALID_TRANSITION`       | The order lifecycle does not allow that move.                    |
| 409    | `ALREADY_PAID`             | A second confirmation. Nothing is written.                       |
| 423    | `PIN_LOCKED` / `LOCKED`    | Too many wrong attempts; the message says for how long.          |
| 429    | `RATE_LIMITED`             | Too many requests.                                               |

**Lists** all answer `{ data, page, limit, total, pages }`. `page` starts at 1.

**Dates** in and out are ISO 8601. Anything grouped or filtered by day uses **Africa/Lagos** boundaries.

---

## Authentication

### Customer

| Method | Path             | Auth     | Body / query                                                         | Answers                                |
| ------ | ---------------- | -------- | -------------------------------------------------------------------- | -------------------------------------- |
| POST   | `/auth/register` | —        | `firstName, lastName, email, password, confirmPassword, acceptTerms` | 201 `{ customer }`, sets `aib_c`       |
| POST   | `/auth/login`    | —        | `email, password`                                                    | `{ customer }`, sets `aib_c`           |
| POST   | `/auth/logout`   | —        | —                                                                    | `{ ok: true }`, clears `aib_c`         |
| GET    | `/auth/me`       | optional | —                                                                    | `{ customer }` or `{ customer: null }` |

Registration and sign-in are rate limited (5/min in production, 100/min in development — ADR-014). A wrong
password and an unknown email give the identical answer, so neither confirms an address exists.

### Admin

| Method | Path                          | Auth  | Body                                                   | Answers                                     |
| ------ | ----------------------------- | ----- | ------------------------------------------------------ | ------------------------------------------- |
| POST   | `/admin/auth/login`           | —     | `email, password`                                      | `{ admin, mustChangePassword, mustSetPin }` |
| POST   | `/admin/auth/logout`          | —     | —                                                      | `{ ok: true }`                              |
| GET    | `/admin/auth/me`              | opt.  | —                                                      | `{ admin, permissions[] }`                  |
| POST   | `/admin/auth/change-password` | admin | `currentPassword, newPassword, confirmPassword`        | `{ ok: true }`, bumps the token version     |
| POST   | `/admin/me/pin`               | admin | `pin, confirmPin` + `password` (first) or `currentPin` | `{ ok: true }`                              |
| PATCH  | `/admin/me/profile`           | admin | `firstName, lastName, phone`                           | `{ admin, permissions[] }`                  |

Eight wrong passwords locks the account for 30 minutes. Five wrong PINs lock the PIN for 15. Everything
except `change-password` and `me/pin` is refused while `mustChangePassword` is set.

---

## Products

All public, all cached for 60 seconds.

| Method | Path                      | Query                                                                    | Answers                                 |
| ------ | ------------------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| GET    | `/catalog/home`           | —                                                                        | featured, new arrivals, categories      |
| GET    | `/products`               | `q, category, brand, condition, minPrice, maxPrice, inStock, sort, page` | paginated `ProductCard[]`               |
| GET    | `/products/:slug`         | —                                                                        | the full product with variants          |
| GET    | `/products/:slug/related` | —                                                                        | `ProductCard[]`                         |
| GET    | `/categories`             | —                                                                        | the two-level tree                      |
| GET    | `/brands`                 | —                                                                        | active brands                           |
| GET    | `/search/suggest`         | `q`                                                                      | up to 8 suggestions                     |
| GET    | `/settings/public`        | —                                                                        | name, address, phone, hours, bank, fees |
| POST   | `/cart/validate`          | body: `{ items[] }`                                                      | prices and stock as they are _now_      |

`/cart/validate` is what the cart page calls on load: a cart that has sat in a browser for a week may be
quoting last week's prices, and this is how it finds out.

---

## Orders

Customer-facing. Every one of these is scoped to the signed-in account — another customer's order number
answers 404, not 403, so a stranger learns nothing.

| Method | Path                            | Auth     | Body                                                                     | Answers                    |
| ------ | ------------------------------- | -------- | ------------------------------------------------------------------------ | -------------------------- |
| GET    | `/checkout/settings`            | —        | —                                                                        | fees, pickup address, bank |
| POST   | `/orders`                       | customer | `items[], deliveryMethod, paymentMethod, addressId \| newAddress, note?` | 201 `OrderDetail`          |
| GET    | `/orders`                       | customer | `status?, page?`                                                         | paginated summaries        |
| GET    | `/orders/:number`               | customer | —                                                                        | `OrderDetail`              |
| POST   | `/orders/:number/transfer-made` | customer | `reference?`                                                             | `OrderDetail`              |
| POST   | `/orders/:number/cancel`        | customer | `reason?`                                                                | `OrderDetail`              |
| GET    | `/orders/:number/invoice.pdf`   | customer | —                                                                        | `application/pdf`          |

**Placing an order is one transaction.** It takes the stock with a conditional atomic decrement, so two
people buying the last phone at the same moment produce one order and one `409 OUT_OF_STOCK` — never
negative stock. Cancelling puts it back, in a transaction, for the same reason.

A customer may only cancel before any money has been confirmed. After that the shop does it.

---

## Payments & invoices

Admin only. This is the money path, and it is the narrowest part of the API.

| Method | Path                                    | Permission         | Body                                 |
| ------ | --------------------------------------- | ------------------ | ------------------------------------ |
| POST   | `/admin/orders/:number/confirm-payment` | `payments.confirm` | `pin, amountKobo, reference?, note?` |
| POST   | `/admin/orders/:number/refund`          | `orders.refund`    | `pin, reason`                        |
| GET    | `/admin/payments`                       | `payments.view`    | `q, method, status, from, to, page`  |
| GET    | `/admin/payments/awaiting`              | `payments.view`    | —                                    |
| GET    | `/admin/payments/export`                | `payments.view`    | the same filters → `text/csv`        |
| GET    | `/admin/invoices`                       | `invoices.manage`  | `q, status, page`                    |
| GET    | `/admin/invoices/:number.pdf`           | `invoices.manage`  | → `application/pdf`                  |
| POST   | `/admin/invoices/:number/send`          | `invoices.manage`  | —                                    |
| POST   | `/admin/invoices/:number/void`          | `invoices.void`    | `reason`                             |
| GET    | `/admin/invoices/export`                | `invoices.manage`  | → `text/csv`                         |

**Confirming a payment** runs as one transaction and in this order: verify the PIN (outside the
transaction — a wrong PIN should cost nothing), assert the order is in a payable state, require
`amountKobo` to equal the order total exactly (v1 takes no part payments), then write the `Payment`, the
`Invoice`, the order's new state and the audit row together. A second click answers `409 ALREADY_PAID` and
writes nothing. The confirmation email is sent after the commit — an email is not worth rolling back for.

**A refund** is its own `Payment` row with a negative amount pointing at the one it reverses (ADR-018), so
revenue is a plain sum. It restocks every item and needs the PIN.

**An invoice** is issued automatically with every confirmed payment. The PDF is rendered the first time it
is asked for and then kept (ADR-021). Invoices are never edited or deleted — a wrong one is voided with a
reason, which the owner alone may do.

---

## Admin

### Overview

| Method | Path               | Permission              | Query                |
| ------ | ------------------ | ----------------------- | -------------------- |
| GET    | `/admin/dashboard` | `dashboard.operational` | `period, from?, to?` |

`period` is `today`, `7d`, `30d`, `month`, `last-month` or `custom`. The response has an `operational` half
every role receives and a `financial` half that is **null for STAFF** — not filtered out, never computed.
Each figure carries the same measure over the preceding period, so the delta has one definition.

### Orders

| Method | Path                           | Permission      | Body / query                                                                         |
| ------ | ------------------------------ | --------------- | ------------------------------------------------------------------------------------ |
| GET    | `/admin/orders`                | `orders.view`   | `q, status, paymentStatus, paymentMethod, deliveryMethod, from, to, sort, dir, page` |
| GET    | `/admin/orders/export`         | `orders.view`   | the same filters → `text/csv`                                                        |
| GET    | `/admin/orders/:number`        | `orders.view`   | —                                                                                    |
| POST   | `/admin/orders/:number/status` | `orders.fulfil` | `status, note?` — legal next states only                                             |
| POST   | `/admin/orders/:number/notes`  | `orders.view`   | `body` — internal, never shown to the customer                                       |
| POST   | `/admin/orders/:number/cancel` | `orders.cancel` | `reason` + `pin` **if the order has been paid for**                                  |

### Catalogue

| Method | Path                          | Permission         | Body                                                 |
| ------ | ----------------------------- | ------------------ | ---------------------------------------------------- |
| GET    | `/admin/products`             | `products.view`    | `q, status, category, brand, stock, sort, dir, page` |
| POST   | `/admin/products`             | `products.manage`  | the full product, with at least one variant          |
| GET    | `/admin/products/:id`         | `products.view`    | —                                                    |
| PATCH  | `/admin/products/:id`         | `products.manage`  | the full product; variants are merged by `id`        |
| POST   | `/admin/products/bulk-status` | `products.manage`  | `ids[], status`                                      |
| POST   | `/admin/products/:id/stock`   | `products.stock`   | `variantId, delta, reason`                           |
| POST   | `/admin/uploads/:folder`      | `products.manage`  | multipart `image` → `{ url, width, height }`         |
| GET    | `/admin/categories`           | `products.view`    | —                                                    |
| POST   | `/admin/categories`           | `catalogue.manage` | `name, parent?, sortOrder, isActive`                 |
| PATCH  | `/admin/categories/:id`       | `catalogue.manage` | the same                                             |
| DELETE | `/admin/categories/:id`       | `catalogue.manage` | refused while anything uses it                       |
| POST   | `/admin/categories/reorder`   | `catalogue.manage` | `ids[]` in the order wanted                          |
| GET    | `/admin/brands`               | `products.view`    | —                                                    |
| POST   | `/admin/brands`               | `catalogue.manage` | `name, code, isActive`                               |
| PATCH  | `/admin/brands/:id`           | `catalogue.manage` | a rename rewrites `brandName` on every product       |
| DELETE | `/admin/brands/:id`           | `catalogue.manage` | refused while anything uses it                       |

**Stock moves by a delta**, never by setting a total: "three arrived" is what actually happens, and a delta
cannot overwrite a sale that landed a second earlier. It runs in a transaction and can never go below zero.

**A variant is never replaced.** One sent with an `id` updates the existing document; one without is new;
one that is missing is removed _only_ if nothing has ever been ordered from it (`409 VARIANT_IN_USE`).

An upload is re-encoded by sharp to WebP at 400, 800 and 1400 wide. The original is not kept.

### People, settings and the trail

| Method | Path                               | Permission         | Body                                                                        |
| ------ | ---------------------------------- | ------------------ | --------------------------------------------------------------------------- |
| GET    | `/admin/customers`                 | `customers.view`   | `q, status, sort, dir, page`                                                |
| GET    | `/admin/customers/export`          | `customers.view`   | → `text/csv`                                                                |
| POST   | `/admin/customers/:id/status`      | `customers.manage` | `status, reason?`                                                           |
| GET    | `/admin/admins`                    | `admins.manage`    | —                                                                           |
| POST   | `/admin/admins`                    | `admins.manage`    | `firstName, lastName, email, phone?, role` → `{ admin, temporaryPassword }` |
| PATCH  | `/admin/admins/:id/role`           | `admins.manage`    | `role`                                                                      |
| PATCH  | `/admin/admins/:id/status`         | `admins.manage`    | `status`                                                                    |
| POST   | `/admin/admins/:id/reset-password` | `admins.manage`    | `reason?` → `{ admin, temporaryPassword }`                                  |
| GET    | `/admin/settings`                  | `settings.manage`  | —                                                                           |
| PATCH  | `/admin/settings`                  | `settings.manage`  | the whole settings document                                                 |
| GET    | `/admin/audit`                     | `audit.view`       | `q, action, entityType, actor, actorType, from, to, page`                   |
| GET    | `/admin/audit/filters`             | `audit.view`       | the actions and entity types present                                        |
| GET    | `/admin/audit/export`              | `audit.view`       | → `text/csv`                                                                |

`spendKobo` and `lastOrderAt` on a customer row are **null for STAFF**, for the same reason the dashboard's
financial half is: the figure is never computed, so there is nothing in the response to read.

A temporary password is returned **once** and is not in the invite email. `mustChangePassword` forces its
replacement at the first sign-in.

The last active owner cannot be demoted or suspended, and nobody can suspend or demote themselves.

**The audit trail has no write path.** There is no POST, PATCH or DELETE on `/admin/audit`, no service
function that edits a row, and the model throws on `updateOne`, `updateMany`, `findOneAndUpdate`,
`deleteOne`, `deleteMany` and `findOneAndDelete`. Values like passwords, PINs and tokens are redacted on the
way in, so the trail cannot reveal them.

---

## Health

| Method | Path          | Answers                                                          |
| ------ | ------------- | ---------------------------------------------------------------- |
| GET    | `/api/health` | `{ ok, db }` — 200 when the database is reachable, 503 otherwise |

Note the path: it is `/api/health`, not `/api/v1/health`, because it is the host's check rather than part of
the versioned API.
