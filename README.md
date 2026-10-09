# ALI_IWANBUY Gadgets — E-Commerce (MERN)

Online storefront and admin dashboard for **ALI_IWANBUY INTEGRATED SERVICE LTD**, a phones and gadgets store in
Birnin Kebbi, Kebbi State, Nigeria. Built by **Starnova Labs**. _Clean. Modern. Reliable._

- Spec: [`docs/PROJECT-OVERVIEW.md`](docs/PROJECT-OVERVIEW.md)
- Build plan: [`docs/BATCH-01-PROMPT.md`](docs/BATCH-01-PROMPT.md) → [`02`](docs/BATCH-02-PROMPT.md) → [`03`](docs/BATCH-03-PROMPT.md)
- Rules for Claude Code: [`CLAUDE.md`](CLAUDE.md) · Progress: [`docs/PROGRESS.md`](docs/PROGRESS.md) · Decisions: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Lab phases: [`docs/LAB-PHASES.md`](docs/LAB-PHASES.md)

```
brand/     logo (SVG/PNG), Montserrat (TTF + WOFF2), approved photos, brand reference sheets
docs/      overview, batch prompts, progress, decisions, lab phases
client/    Next.js 15 (App Router) storefront + admin UI
server/    Express 5 + MongoDB (Mongoose) REST API
shared/    zod schemas, types and money helpers used by both
scripts/   image preparation, Lighthouse
```

The inventory system in `../ALI_IWANBUY-IMS/` is a separate project and is not modified by this one.

---

## Getting started

**Prerequisites** — Node 22 and pnpm 10. If pnpm is missing: `corepack enable pnpm`.

```bash
pnpm install
```

The first install downloads a MongoDB binary (~600 MB, once) so the project runs without installing MongoDB.

### 1. Environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

`server/.env.example` documents every variable. The defaults work for local development; the session secrets
are only required in production.

### 2. Database

Transactions need a replica set (ADR-005). In development, one comes with the project:

```bash
pnpm db:local
```

That starts a single-node replica set on port 27027, keeps its data in `server/.local/mongo`, and prints the
`MONGODB_URI` to put in `server/.env` — which is already the default there. Leave it running in its own
terminal; stop it with Ctrl-C. Delete `server/.local/mongo` for a clean database.

For MongoDB Atlas instead, put the connection string from any Atlas tier in `MONGODB_URI` and skip `db:local`.

### 3. Seed the catalogue

```bash
pnpm seed
```

Settings, 15 categories, 12 brands and 43 products with 60 variants, including some low on stock and one sold
out. Product images are generated placeholders written to `server/uploads/seed/` (ADR-006) — the owner
replaces them with real photographs from the admin dashboard. The seed refuses to run with
`NODE_ENV=production`.

There are no customer accounts in the seed: create one at <http://localhost:3000/register>. Admins and order
history arrive with the dashboard in Batch 3.

### 4. Run it

```bash
pnpm dev
```

- Storefront — <http://localhost:3000>
- API — <http://localhost:4000/api/health>
- Design system (development only) — <http://localhost:3000/style-guide>

### Email in development

There is no SMTP server in development, so every message the shop sends — welcome, order placed, order
cancelled, status changed — is written to `server/.local/outbox/<timestamp>-<template>.html` and its path is
logged. Open the file in a browser to read exactly what the customer would have received. Setting `SMTP_HOST`
in `server/.env` switches to real delivery with no other change.

---

## Commands

| Command                                      | What it does                                                          |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `pnpm dev`                                   | Storefront (:3000) and API (:4000) together, with labelled output     |
| `pnpm db:local`                              | Local MongoDB replica set on :27027, no installation needed           |
| `pnpm seed`                                  | Replace the catalogue with the seed data                              |
| `pnpm build`                                 | Production build of all three packages                                |
| `pnpm typecheck` · `pnpm lint` · `pnpm test` | The quality gates                                                     |
| `pnpm test:e2e`                              | Playwright smoke and axe checks, desktop and Pixel 7                  |
| `pnpm lighthouse`                            | Performance and accessibility audit of a running production build     |
| `pnpm format` · `pnpm format:check`          | Prettier                                                              |
| `pnpm images:prepare`                        | Re-create `client/public/images` from the originals in `brand/images` |

### Running the E2E tests

They need the whole stack up, against a production build for realistic numbers:

```bash
pnpm db:local            # terminal 1
pnpm seed                # once
pnpm --filter @aib/server dev   # terminal 2
pnpm build && pnpm --filter @aib/client start   # terminal 3
pnpm test:e2e            # terminal 4
pnpm lighthouse
```

Do not run `pnpm build` while `pnpm dev` is running — the two write to the same `.next` directory and the
build output ends up unusable.

---

## How it fits together

- The browser only ever talks to `localhost:3000`. Next.js rewrites `/api/*` and `/uploads/*` to the Express
  API, so cookies stay first-party and there is no CORS preflight in the way (overview §6.3).
- Catalogue pages are Server Components with a 60-second revalidate; product pages are prerendered. The cart
  is a client component backed by `localStorage`, and the server re-prices it at `/api/v1/cart/validate`
  before any total is shown.
- Money is integer kobo everywhere — database, API and state. `shared/src/money.ts` is the only place naira
  arithmetic happens, and it runs in `bigint`.
- Business rules live in `server/src/services/`. Controllers only read the request and send the result.

## Where the money rules live

Three pieces of this codebase are worth reading before changing anything near them:

- **`server/src/services/order.service.ts`** — `placeOrder` runs in one transaction, ignores every price the
  browser sends, and decrements stock with a conditional update that only matches while enough is left. Two
  customers racing for the last unit produce one order and one honest refusal.
- **`server/src/lib/order-lifecycle.ts`** — the single table of which status may follow which, and who may make
  the move. Nothing writes `status` without going through `assertTransition`.
- **`shared/src/money.ts`** — the only place naira arithmetic happens, in `bigint`, on integer kobo.

## Demo

Register an account at `/register` — there are no seeded customers. The admin dashboard arrives in Batch 3.
