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

**ADR-009 · 9 Oct 2026 · Three denormalised fields on `Product` (Batch 1).** `priceFromKobo`,
`compareAtPriceKobo` and `totalStock` are recomputed from the variants in a pre-save hook, and `brandName` is
copied from the brand. Without them every listing query would need an aggregation over the variant subdocuments
to filter by price or stock and to sort, and search could not match a brand without a join. Consequence: a brand
rename has to rewrite `brandName` on its products — Batch 3's brand editor must do this, and the batch prompt
carries the note.

**ADR-010 · 9 Oct 2026 · Substring search instead of a MongoDB text index.** The overview §7 lists a text index
on name/brand/tags, but S-1 requires suggestions from the second character typed, and `$text` matches whole
stemmed words only — "ip" would return nothing for "iPhone". One search behaviour is used everywhere instead: a
case-insensitive substring match on name, brand name and tags, with names that start with the query ranked
first. At this catalogue's size (tens of products, not millions) it is fast and, unlike `$text`, it gives the
same results in the suggestion list and on the results page. Revisit if the catalogue passes a few thousand
products, where an Atlas Search index would be the replacement.

**ADR-011 · 9 Oct 2026 · Catalogue pages are rendered statically; cookies are forwarded only when needed.**
Reading the incoming request headers makes a Next.js route dynamic. The API client therefore forwards the
session cookie only when a call is told to (`forwardCookies`), which Batch 2's account and checkout pages will
set. As a result the home page, the written pages and all 43 product pages are prerendered with a 60-second
revalidate, which is what overview §6.3 asks for. `/shop`, `/search` and `/category/[slug]` read the URL's query
string and are rendered per request by nature.

**ADR-012 · 9 Oct 2026 · TanStack Query is mounted where it is used, not in the root layout.** Overview §6.3
assigns it to the cart, checkout and admin tables, so the query client is created inside the cart view. The
header's search suggestions use a debounced `fetch` with an abort signal instead, so a customer browsing the
catalogue never downloads a query cache to answer three keystrokes.

**OPEN-004 · Category photographs.** The six category tiles use the approved lifestyle photographs, which are
only an approximate match for Tablets, Laptops and Smartwatches. The owner should supply one photograph per
category, or the tiles should fall back to a generated image as the products do.
