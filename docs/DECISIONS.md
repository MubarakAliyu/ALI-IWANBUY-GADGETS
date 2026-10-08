# Decisions (ADRs)

New decisions are appended with the next number, date, context, decision and consequence.

**ADR-001 · 8 Oct 2026 · Separate project from the IMS.** The storefront is its own repository
(`ALI_IWANBUY-STORE/`), own MongoDB database and own deployment. The IMS (`ALI_IWANBUY-IMS/`) is read-only
reference for brand and UI conventions. Integration (IMS as stock master) is roadmap, not v1.

**ADR-002 · 8 Oct 2026 · MERN with Next.js as the React layer.** Required by the lab ("MERN") and by the client
brief (Next.js). Express owns all data and rules; Next.js renders UI and proxies `/api` so cookies are first-party.

**ADR-003 · 8 Oct 2026 · Brand inherited verbatim.** Tokens copied from the IMS `globals.css`; Montserrat only;
logo through a manifest because the identity is being re-issued (new "I WAN BUY GADGETS" mark not yet cleared).

**ADR-004 · 8 Oct 2026 · No live payment gateway in v1.** Bank transfer (admin-confirmed with PIN) and pay on
delivery/pickup. Paystack test mode is an optional, off-by-default stretch.

**ADR-005 · 8 Oct 2026 · Transactions need a replica set.** Atlas in dev/prod; `MongoMemoryReplSet` for tests and
`pnpm db:local`.

**ADR-006 · 8 Oct 2026 · Seed product photos are generated placeholders.** Only 11 approved lifestyle photos
exist; they are used for hero/banners/categories. The owner uploads real product photos in admin.

**OPEN-001 · Address spelling.** Registered address "No. 26, Olumbo Plaza, Ahmadu Bello Way" (PRD/CAC) vs flyer
"Shop 7 & 8, Olumbu Plaza". Invoices use the registered address; storefront contact shows both until confirmed.

**OPEN-002 · Bank details.** Seeded as placeholders marked "UPDATE IN SETTINGS"; the owner must enter the real
account before launch.

**ADR-007 · 8 Oct 2026 · Lab phases mapped (resolves OPEN-003).** Phase 1 (React UI) → Batch 1–3 UI; Phase 2
(Node/Express API: auth, products, orders) → Batches 1–3; Phase 3 (Deployment) → Batch 3 Part H; Phase 4 (Pitch)
→ Batch 3 Part I. Phase 1 says "ReactJS": Next.js is a React framework, so it satisfies the requirement; the
README and pitch state this explicitly.

**ADR-008 · 8 Oct 2026 · Hosting for the lab deployment.** Client on Vercel (free), API on Render web service
(free tier; cold starts acceptable for the demo, documented), database on MongoDB Atlas M0. Uploaded images and
invoice PDFs go to Cloudinary in production (Render's disk is ephemeral) via the existing `storage` interface;
local disk in development. Email via any SMTP provider (e.g. Brevo free tier) — if no SMTP credentials are
available at deploy time, the production mailer logs and stores the email so invoices remain downloadable.
