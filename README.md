# ALI_IWANBUY Gadgets — E-Commerce (MERN)

Online storefront and admin dashboard for **ALI_IWANBUY INTEGRATED SERVICE LTD**, a phones and gadgets store in
Birnin Kebbi, Kebbi State, Nigeria. Built by **Starnova Labs**. *Clean. Modern. Reliable.*

- Spec: [`docs/PROJECT-OVERVIEW.md`](docs/PROJECT-OVERVIEW.md)
- Build plan: [`docs/BATCH-01-PROMPT.md`](docs/BATCH-01-PROMPT.md) → [`02`](docs/BATCH-02-PROMPT.md) → [`03`](docs/BATCH-03-PROMPT.md)
- Rules for Claude Code: [`CLAUDE.md`](CLAUDE.md) · Progress: [`docs/PROGRESS.md`](docs/PROGRESS.md) · Decisions: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Lab phases: [`docs/LAB-PHASES.md`](docs/LAB-PHASES.md)

```
brand/     logo (SVG/PNG), Montserrat (TTF + WOFF2), approved photos, brand reference sheets
docs/      overview, batch prompts, progress, decisions, lab phases
client/    Next.js 15 storefront + admin UI           (created in Batch 1)
server/    Express 5 + MongoDB (Mongoose) REST API    (created in Batch 1)
shared/    zod schemas, types, money helpers           (created in Batch 1)
```

The inventory system in `../ALI_IWANBUY-IMS/` is a separate project and is not modified by this one.

Setup instructions are written at the end of Batch 1.
