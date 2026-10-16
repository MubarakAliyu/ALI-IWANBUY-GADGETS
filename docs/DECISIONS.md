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

**ADR-013 · 9 Oct 2026 · TanStack Query returns to the root layout (revises ADR-012).** Batch 2 puts a
wishlist heart on every product card and a session-aware menu in the header, both of which overview §6.3
assigns to TanStack Query. The query client therefore lives in the root layout again, with the session as its
first query. It costs the catalogue pages about 20 kB of first-load JavaScript (243 → 263 kB on the home
page), which is recorded against the performance follow-up in `PROGRESS.md`. Search suggestions stayed on a
plain debounced `fetch`, because the overview never put them on the cache.

**ADR-014 · 9 Oct 2026 · The auth rate limit is production-strength only.** Overview §6.4 specifies five
sign-in or registration attempts per minute per IP, and production does exactly that. In development the limit
is 100, because the developer, the browser and the whole end-to-end suite — which registers a fresh customer
per test — all arrive from one address, and a shared budget of five made the suite fail for a reason unrelated
to the code. The per-account lockout (eight failures, thirty minutes) is unchanged in every environment, and it
is the control that actually stops a patient guesser.

**ADR-015 · 9 Oct 2026 · Signing in is a full page navigation.** After a successful sign-in or registration the
client calls `window.location.assign(next)` rather than `router.replace(next)`. While the visitor was signed
out, Next may have prefetched the page they were heading for and cached the middleware's redirect back to the
sign-in form; replaying that cached answer bounced a freshly signed-in customer straight back to sign in. A
full navigation also re-renders every server component as the signed-in customer, which is what that moment
means.

**ADR-016 · 9 Oct 2026 · The browser cart is hydrated from the root layout.** `CartHydrator` was mounted in the
storefront layout, so the sign-in and registration pages — which live in their own route group — never read the
stored cart. The merge that runs at sign-in therefore sent an empty cart and silently emptied it. The cart
belongs to the browser rather than to a route group, so it is now read back in the root layout, where every
page has it.

**ADR-017 · 9 Oct 2026 · Owner's store details (resolves OPEN-001 and OPEN-002).** The owner confirmed the shop
address as **Shop No. 26, Bindawa Plaza, Ahmadu Bello Way, Birnin Kebbi, Kebbi State** — used everywhere,
including invoices, replacing both the "Olumbo Plaza" (registration paperwork) and "Olumbu Plaza" (flyer)
versions. Store email iwanbuygadgets@gmail.com. Bank for transfers: Moniepoint · ALI ABDULLAHI · 5737727740 —
shown to every customer at checkout and on invoices, so it is public-facing data and is seeded, editable in Store
Settings. Opening hours: Mon–Fri 8 am–10 pm, Sat–Sun 10 am–10 pm (resolves the assumed hours). SMTP credentials
are never committed.

**ADR-018 · 10 Oct 2026 · A refund is a negative `Payment`, not an edited one.** The Batch 1 `Payment` schema
constrained `amountKobo` to `min: 0`, which the refund path in Batch 3 cannot satisfy. Rather than storing a
positive amount and inferring direction from `status`, a refund is written as its own row with a **negative**
amount and `refundOf` pointing at the payment it reverses. The constraint is lifted. The sum of the collection
is then the net money taken, the dashboard's revenue figure is a plain `$sum` with no special cases, and no
payment row is ever edited after it is written — which is what an accounting record has to be.

**ADR-019 · 10 Oct 2026 · The admin orders table gained internal notes.** Overview §10 A-4 lists "internal
notes" among the order-detail actions; the Batch 3 prompt's Part D summary does not repeat it. The overview
wins, so `Order.adminNotes` was added: append-only entries with the author and time, visible only through
`/admin`, and never in the customer's `OrderDetail`. Correcting a note means writing another one.

**ADR-020 · 10 Oct 2026 · A wrong payment PIN answers 401, not 400.** The PIN is a second sign-in rather than a
form field, so a wrong one is an authentication failure. 401 lets the confirm-payment modal tell "that PIN is
wrong" (shake the input, let them retry) apart from a 400 on the amount, while the response still carries the
`pin` field detail so the input can be marked. The lock answers 423 as before.

**ADR-021 · 10 Oct 2026 · Invoice PDFs are rendered on first download, not when issued.** Confirming a payment
creates the `Invoice` row inside the transaction with an empty `pdfPath`; the A4 document is drawn the first
time someone asks for it and then kept. Rendering inside the transaction would hold it open for a file write,
and seeding sixty historical orders would otherwise mean drawing sixty documents nobody opens. If the stored
file goes missing the renderer simply draws it again, since everything it prints comes from the order snapshot
and Store Settings.

**ADR-022 · 10 Oct 2026 · Chart containers are `inert`, not merely `aria-hidden`.** Each recharts container
was marked `aria-hidden` with a visually hidden table beside it carrying the same figures. axe found the hole:
recharts wraps its SVG in a focusable element, so a keyboard user could tab onto something a screen reader had
been told did not exist — a WCAG failure, and a confusing one. The containers are now `aria-hidden` **and**
`inert`, which takes the whole subtree out of the tab order, leaving the table as the one version that is
announced. Found by adding the dashboard to the axe suite rather than by reading the code.

**ADR-023 · 10 Oct 2026 · The admin menu button carries its own label.** Below `sm` the button's name block is
hidden and its avatar is decorative, which left the trigger with no accessible name at all on a phone — found
by running axe at the Pixel 7 viewport, where the desktop run was clean. It now has an explicit `aria-label`.
The general lesson is recorded here because it will happen again: a control whose name comes from content that
a breakpoint hides has no name at that breakpoint.

**ADR-024 · 10 Oct 2026 · "Visible on the storefront" is proven on the product's own page.** The end-to-end
test for creating a product first asserted it appeared in `/search`. That fails against a production build and
should: catalogue listings are statically rendered and revalidate every 60 seconds (ADR-011), so a product
created a second ago is legitimately not in them. A new product's own page has no cached copy and is rendered
on demand, so it is there immediately — which is the claim worth testing. The listing catches up within the
minute, which is the documented behaviour rather than a defect.

**ADR-025 · 16 Oct 2026 · Demo credentials come from the environment in production.** The passwords and PINs
for the seeded demo accounts were constants in `server/src/seed/demo.ts`. That is right for a classroom and
wrong for a public repository: those accounts can confirm payments, so anyone reading the source could sign
in to the live dashboard and mark orders paid. In production the seed now reads `DEMO_ADMIN_PASSWORD`,
`DEMO_CUSTOMER_PASSWORD`, `DEMO_OWNER_PIN` and `DEMO_MANAGER_PIN`, refuses while naming any that are missing,
and refuses weak values too — passwords under ten characters, and PINs that are a run, a repeat or a date —
because "put it in the environment" is no improvement if what gets put there is `1234`. The check runs before
the database is touched. Outside production the old constants remain the defaults: a demo password nobody can
remember is no use.

**ADR-026 · 16 Oct 2026 · The first deployment runs on local storage.** Cloudinary sign-up was unavailable, so
`STORAGE_PROVIDER` moved out of `render.yaml` and into the dashboard (`sync: false`) and the first deployment
goes out on `local`. Everything works; the cost is that Render's disk is wiped on every deploy, so uploaded
product images are lost. The API logs one warning at boot saying exactly that rather than refusing to start —
this is a supported setup, just a lossy one. Invoice PDFs are unaffected because they re-render on demand
(ADR-021). Switching later is two dashboard settings and a re-seed, with no code change, because the seed now
writes its placeholder images through the storage interface rather than straight to disk.
