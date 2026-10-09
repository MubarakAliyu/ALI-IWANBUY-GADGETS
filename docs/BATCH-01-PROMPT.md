# ALI_IWANBUY Gadgets — BATCH 1 BUILD PROMPT

### Foundation & Storefront — the shop window

> First batch. Read `CLAUDE.md` and `docs/PROJECT-OVERVIEW.md` in full before starting.
> Lab alignment: **Phase 1 — Front-end Development: User Interface Design** ("using ReactJS … layout, navigation,
> and styling … visually appealing, easy to navigate, and responsive on all devices"), plus the **Phase 2**
> foundation (Node.js + Express + MongoDB, product endpoints). Tick the matching rows in `docs/LAB-PHASES.md`.
> Goal: by the end, a guest on a phone can browse the real catalogue, filter it, open a product, choose a
> variant and fill a cart — in the brand, fast, accessible. Nothing in this batch requires sign-in.

---

## PART 0 — Ground rules for this batch

1. Work only inside `ALI_IWANBUY-STORE/`. The IMS at `../ALI_IWANBUY-IMS/` is **read-only reference**.
2. `git init` in `ALI_IWANBUY-STORE/` (its own repository), first commit on `main` = docs + brand, then work on
   `batch/01-foundation-storefront`.
3. Node 22, pnpm 10. If pnpm is missing: `corepack enable pnpm` or `npm i -g pnpm@10`.

## PART A — Monorepo & tooling

- [ ] Root `package.json` + `pnpm-workspace.yaml` with workspaces `client`, `server`, `shared`.
- [ ] Root scripts: `dev` (runs client + server concurrently with labelled output), `build`, `typecheck`, `lint`,
      `test`, `format`, `format:check`, `seed`, `db:local`, `test:e2e`.
- [ ] TypeScript strict everywhere; shared `tsconfig.base.json`. ESLint 9 flat config + Prettier
      (+ `prettier-plugin-tailwindcss` in client). `.editorconfig`, `.gitignore` (node_modules, .next, dist,
      .env*, server/uploads, server/.local, playwright artefacts).
- [ ] `.env.example` for client and server listing every variable with a comment (`MONGODB_URI`,
      `CUSTOMER_JWT_SECRET`, `ADMIN_JWT_SECRET`, `CLIENT_ORIGIN`, `API_ORIGIN`, `PORT`, `SMTP_*`, `MAIL_FROM`,
      `STORAGE_PROVIDER`, …). Server env parsed with zod at boot — a missing variable fails fast with a clear
      message.
- [ ] `shared/` package: zod schemas + inferred types for catalogue entities and list queries; money helpers
      (`koboToNaira`, `formatNaira`, `parseNairaToKobo` — bigint-safe integer maths); `ORDER_STATUS`,
      `PAYMENT_STATUS` enums (used from Batch 2).

## PART B — Server foundation (Express + MongoDB)

- [ ] `server/src/app.ts` (express app factory, testable) and `index.ts` (connect + listen). Middleware: helmet,
      cors (`CLIENT_ORIGIN`, credentials), cookie-parser, json limit 1 MB, pino-http, mongo key sanitiser,
      `/uploads` static, `/api/v1` router, 404 + central error handler (`AppError` with code/status; zod errors →
      400 with `fields`).
- [ ] `GET /api/health` → `{ ok, db: "up" }`.
- [ ] `pnpm db:local`: starts a `MongoMemoryReplSet` (single node, persisted to `server/.local/mongo`) on port
      27027 and prints the URI, so the project runs with **no MongoDB install**. README also documents Atlas.
- [ ] Models (overview §7): `Category`, `Brand`, `Product` (with variants subdocs), `Setting`, `Counter`. Write the
      indexes in the schemas. `Product.priceFromKobo` kept in sync in a pre-save hook.
- [ ] `lib/numbering.ts` (atomic monthly counters), `lib/pagination.ts`, `lib/slug.ts`, `lib/sku.ts`
      (`BRD-MODEL-ATTR-NNNN`).
- [ ] Public catalogue routes (overview §11): home payload (featured, new arrivals, categories with counts,
      brands), product list with filters `category` (includes children), `brand` (multi), `minPrice`,
      `maxPrice`, `condition`, `inStock`, `q`, `sort` (`newest|price-asc|price-desc|name`), `page`, `limit`
      (max 48); product by slug (404 for DRAFT/ARCHIVED); related (same category, excluding self, 8);
      categories tree; brands; search suggestions (top 6 by text score); public settings.
- [ ] **Seed** (`pnpm seed`, refuses in production): settings, categories, brands and ~40 products exactly as
      overview §13 (catalogue part only — admins/customers/orders come in later batches; structure the seed so
      they slot in). Product placeholder images: generate a clean SVG per product (device silhouette by category
      — phone, tablet, laptop, watch, earbuds, headphones, speaker, charger, power bank, case — on `#F8FAFB`,
      brand name + model in Montserrat-styled text), write to `server/uploads/seed/`. Brand lifestyle photos in
      `brand/images/` → resized WebP (1600/800) into `client/public/images/` with clean kebab-case names via a
      `scripts/prepare-images.mjs` (sharp) — do not ship the multi-MB originals.
- [ ] Tests: health, list filters (each filter + combinations), sort, pagination bounds, slug 404 for drafts,
      numbering uniqueness under concurrency (50 parallel increments → 50 distinct numbers).

## PART C — Client foundation & design system

- [ ] Next.js 15.5 App Router, React 19, TS, Tailwind v4. `next.config.ts` rewrites `/api/:path*` and
      `/uploads/:path*` to `API_ORIGIN`; `images.remotePatterns` for the API origin.
- [ ] `globals.css`: copy the `@theme` block from `brand/reference/ims-globals.css` verbatim, plus the order
      status tokens (overview §4.5) and the `numeric` utility. Montserrat via `next/font/local` from
      `brand/fonts/woff2/` (copy into `client/src/app/fonts/`).
- [ ] `components/brand/`: `logo-manifest.ts`, `<Logo variant="primary|white|mark|markWhite|horizontalWhite">`.
      Favicon / apple icon from `Logo.svg`.
- [ ] `components/ui/` primitives (radix-based, brand-bound): Button (primary, dark, outline, ghost, danger;
      sizes; loading), Input, Label, Field (label + helper + error), Select, Checkbox, RadioGroup, Badge
      (+ StatusBadge), Card, Sheet/Drawer, Dialog, DropdownMenu, Tabs, Skeleton, Separator, Tooltip, Pagination,
      QuantityStepper, PriceTag (price + compare-at + "-x%" chip), Toaster (sonner), EmptyState.
- [ ] `lib/api.ts` (fetch wrapper: JSON, error shape, server-side cookie forwarding), `lib/money.ts` (re-export
      shared), `lib/date.ts` (Africa/Lagos), `lib/cn.ts`. TanStack Query provider.
- [ ] A dev-only `/style-guide` page showing every primitive and state (excluded from production build output).

## PART D — Storefront screens (overview §9)

- [ ] **Layout**: navy announcement bar; header (logo, search with suggestions dropdown — keyboard navigable,
      category mega-menu / mobile drawer, wishlist icon (links to `/login?next=/account/wishlist` for now), cart
      icon with live count opening the **mini-cart drawer**, account icon → dropdown with "Sign in" and
      "Create account" (those pages are built in Batch 2; the menu component is built now so Batch 2 only adds
      the signed-in items)); navy footer (white mark, company block, quick links, categories, contact, socials,
      © ALI_IWANBUY INTEGRATED SERVICE LTD · RC 8276954).
- [ ] **Home** (S-2): hero in the Application-Layouts "NEW ARRIVALS" style using a brand photo, category tiles,
      Featured, New arrivals (horizontal scroll on mobile), shop-by-brand strip, value props, promo banner.
- [ ] **Shop / Category / Search** (S-3, S-4): server-rendered grid, filter sidebar (desktop) / bottom sheet
      (mobile), sort select, active-filter chips, result count, pagination, empty state. **All state in the URL**
      (`/shop?brand=apple,samsung&minPrice=100000&sort=price-asc&page=2`, prices in naira in the URL, converted
      to kobo for the API).
- [ ] **Product card** per overview §4.6, with skeleton.
- [ ] **Product detail** (S-5): gallery, variant chips updating price/stock/SKU, quantity stepper capped at
      stock, Add to cart (toast + opens mini-cart), Buy now (adds then goes to `/cart`), stock states, highlights,
      specs table, description, delivery & warranty info, WhatsApp deep link (`https://wa.me/2347039254143?text=…`
      with product name), related products, `generateMetadata` + JSON-LD.
- [ ] **Cart** (S-6): zustand store persisted to localStorage (`aib-cart-v1`), items keyed by
      `productId:variantId`, qty capped by last-known stock; mini-cart drawer and `/cart` page; "Proceed to
      checkout" links to `/checkout` (built in Batch 2 — until then it routes to `/login?next=/checkout`).
      A `POST /api/v1/cart/validate` public endpoint re-prices the cart from the DB and flags out-of-stock / price
      changes; the cart page calls it on load and shows changes clearly.
- [ ] **Static pages** (S-13): About, Contact, Delivery & Returns, Warranty, Privacy, Terms — short real copy.
- [ ] 404 / error pages, loading skeletons for every route segment.
- [ ] Mobile-first: check 360, 768, 1280, 1920 widths. No horizontal scroll anywhere.

## PART E — Verification

- [ ] Client unit tests: money formatting, cart store (add, merge same line, cap at stock, remove, persist),
      filter ↔ URL serialisation.
- [ ] Playwright smoke (desktop + Pixel 7 projects): home renders hero + featured; filter by brand and price
      updates URL and results; open product, change variant, add to cart, cart count = 1, cart page total correct;
      axe has no serious/critical violations on home, shop, product, cart.
- [ ] Lighthouse (production build) on home and a product page: record scores in `docs/PROGRESS.md`
      (target ≥ 90 performance & accessibility).
- [ ] All four gates green. Commit. Update `docs/PROGRESS.md` (what was built, screenshots list, decisions,
      anything deferred with reason). Write the README setup section (prereqs, `pnpm i`, `.env`, `pnpm db:local`,
      `pnpm seed`, `pnpm dev`).

## Acceptance criteria

- AC1.1 `pnpm i && pnpm db:local & pnpm seed && pnpm dev` gives a working storefront at :3000 with ~40 products.
- AC1.2 Every filter, sort and page is reflected in and restorable from the URL.
- AC1.3 Variant change updates price, stock state and the add-to-cart target; out-of-stock cannot be added.
- AC1.4 Cart survives a reload; quantities never exceed stock; `/cart/validate` corrections are shown.
- AC1.5 Only brand tokens and Montserrat are used (grep finds no hex colours outside `globals.css`/tokens and no
  other font).
- AC1.6 Gates green; E2E smoke + axe green on both viewports.

**Report** at the end: what was built, how to run it, test counts, Lighthouse numbers, decisions taken, and
anything that needs the client (e.g. real bank details, real product photos). Then stop.
