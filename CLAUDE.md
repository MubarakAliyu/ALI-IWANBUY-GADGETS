# CLAUDE.md — ALI_IWANBUY Gadgets (e-commerce) build instructions

You are building **ALI_IWANBUY Gadgets**, a MERN e-commerce storefront + admin dashboard for ALI_IWANBUY
INTEGRATED SERVICE LTD (phones & gadgets, Birnin Kebbi), on behalf of Starnova Labs. It is also the student's
GoMyCode *E-Commerce Website* lab-phase project.

## Before you write any code
1. Read `docs/PROJECT-OVERVIEW.md` **completely**. It is the source of truth.
2. Read `docs/LAB-PHASES.md` and check every lab requirement is covered by a batch.
3. Execute the batch you were given (`docs/BATCH-0N-PROMPT.md`) and nothing beyond it. Report, then stop.

## The IMS is read-only
`../ALI_IWANBUY-IMS/` is a **different project** (Next.js + PostgreSQL inventory system). You may **read** it to
match look-and-feel: `app/src/app/globals.css`, `app/src/components/ui/*`, `app/src/components/shell/*`,
`app/src/lib/money.ts`, `docs/PRD.md` §13. **Never write, move, rename, delete, install into, run scripts in,
or commit to anything under `../ALI_IWANBUY-IMS/`.** Never import from it — re-implement in this repo. Everything
this project needs from the brand is already copied into `./brand/`.

## Standing rules
- **One batch at a time.** Finish, verify against its acceptance criteria, commit on a `batch/0N-…` branch, update
  `docs/PROGRESS.md`, report, stop.
- **Definition of Done** (every batch): `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all clean from
  the repo root; acceptance criteria demonstrably met; no TODOs, no lorem ipsum, no commented-out code.
- **The overview wins.** Conflicts and open questions go to `docs/DECISIONS.md` as numbered ADRs.
- **Never invent scope; never silently drop scope.**
- Speed matters: the client wants this fast. Prefer finishing a feature properly over polishing a finished one.
  Cosmetic follow-ups go to `PROGRESS.md`, not into another loop.

## Non-negotiables

| Rule | Detail |
|---|---|
| Font | **Montserrat only**, local WOFF2 from `brand/fonts/woff2/`. No other typeface. |
| Colours | `#156FBF` primary · `#1E2A35` navy · `#88939E` grey (never small text) · `#FFFFFF`. Small grey text = `#646F7A`. Tailwind default palette off; tokens copied from `brand/reference/ims-globals.css`. |
| Logo | Only through `client/src/components/brand/logo-manifest.ts`. Never recolour/stretch. |
| Money | Integer **kobo** in DB, API and state. `lib/money.ts` formats `₦` at render. No floats. |
| Time | **Africa/Lagos**. Dates `12 Oct 2026`. |
| Layers | Component → API → route → controller → **service** → model. Business rules only in services. |
| Permissions | Enforced server-side by `requirePermission()` from one matrix. UI hiding is not security. |
| Audit | Every admin mutation and every security event writes an `AuditLog` row via `audit.service`. Audit is append-only. |
| Transactions | Place order, confirm payment, cancel, refund, stock adjust: one MongoDB transaction each. |
| Stock | Never negative. Conditional atomic decrement. Restock on cancel/refund. |
| Email | Customer email is **immutable** after registration — server rejects any change. |
| PIN | Payment confirmation, paid-order cancel and refund require the acting admin's own PIN. |

## Commands (from repo root)
`pnpm dev` (client :3000 + server :4000) · `pnpm db:local` (in-memory replica-set Mongo, no install) ·
`pnpm seed` · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm test:e2e` · `pnpm build`.
