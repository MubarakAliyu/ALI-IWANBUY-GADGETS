# Progress

| Batch                                             | Branch                           | Status         | Commit | Date       |
| ------------------------------------------------- | -------------------------------- | -------------- | ------ | ---------- |
| 0 — Planning (overview, batch prompts, brand kit) | —                                | ✅ Done        | —      | 8 Oct 2026 |
| 1 — Foundation & Storefront                       | `batch/01-foundation-storefront` | ✅ Done        |        | 9 Oct 2026 |
| 2 — Accounts, wishlist & checkout                 | `batch/02-accounts-checkout`     | ⏳ Not started |        |            |
| 3 — Admin dashboard, deployment & pitch           | `batch/03-admin`                 | ⏳ Not started |        |            |

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
