# GoMyCode Lab Phase — E-Commerce Website

Course page: GoMyCode → Lab Phase → **E-Commerce Website** · Difficulty _Not So Easy_ · Duration 50 hours · 4 phases.
Submitted application: **ALI IWANBUY GADGETS** (08 Oct 2026, 8:25 PM) — status _In Review_.

> Submitted description: "Ali Iwanbuy Gadgets is an e-commerce website for browsing and purchasing gadgets and
> electronic products online. Users can explore available products, view product details, add items to a
> shopping cart, and place orders through a simple and user-friendly interface."

## The four phases (verbatim from the course page)

### Phase 1 — Front-end Development : User Interface Design

In this phase, you will design the user interface for the e-commerce website using ReactJS. You will be
responsible for creating the website's layout, navigation, and styling. The design should be visually appealing,
easy to navigate, and responsive on all devices.

### Phase 2 — Back-end Development : Server-side Development

In this phase, you will develop the server-side functionality of the e-commerce website using Node.js and
Express. You will create the API endpoints for user authentication, product management, and order processing.

### Phase 3 — Deployment

In this phase, you will deploy the e-commerce website to a production environment and test it thoroughly. You
will be responsible for setting up the hosting environment, configuring the server, and ensuring the website
runs smoothly.

### Phase 4 — Pitch your work

Provide a brief overview of the presentation phase, including its purpose and significance. Explain that this is
an opportunity to showcase the project's objectives, outcomes, and findings.

## Coverage checklist (Claude Code ticks each row and fills "Where" as it builds)

| #    | Lab requirement                                                                                           | Batch | Where                                                                                    | Done                |
| ---- | --------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------- | ------------------- |
| P1.1 | UI built with **ReactJS** (Next.js 15 / React 19 — a React framework; state this in the README and pitch) | 1     | `client/` — Next.js 15, React 19                                                         | ✅                  |
| P1.2 | Layout — header, footer, page grids, admin shell                                                          | 1, 3  | `app/(store)/layout.tsx`, `components/store/site-header.tsx`, `site-footer.tsx`          | ✅ storefront       |
| P1.3 | Navigation — category menu, search, account menu, mobile drawer, breadcrumbs                              | 1–2   | `components/store/` — category-menu, mobile-nav, search-box, header-actions, breadcrumbs | ✅ guest            |
| P1.4 | Styling — brand design system (tokens, Montserrat, components), style guide page                          | 1     | `app/globals.css`, `components/ui/*` (21 primitives), `/style-guide`                     | ✅                  |
| P1.5 | Visually appealing & easy to navigate — Lighthouse a11y ≥ 90, axe clean                                   | 1–3   | Lighthouse a11y 100/100, axe clean — `docs/PROGRESS.md`                                  | ✅ Batch 1 pages    |
| P1.6 | Responsive on all devices — verified at 360 / 768 / 1280 / 1920, E2E on desktop + mobile                  | 1–3   | `client/e2e/*` — desktop + Pixel 7, 28 tests                                             | ✅ Batch 1 pages    |
| P2.1 | Server-side with **Node.js + Express**                                                                    | 1     | `server/` — Express 5 on Node 22                                                         | ✅                  |
| P2.2 | API endpoints — **user authentication** (customer + admin)                                                | 2, 3  | `server/src/routes/auth*.ts`                                                             | ☐                   |
| P2.3 | API endpoints — **product management** (public catalogue + admin CRUD, images, stock)                     | 1, 3  | `server/src/routes/catalog.routes.ts`, `services/catalog.service.ts`                     | ✅ public catalogue |
| P2.4 | API endpoints — **order processing** (checkout, lifecycle, payments, invoices)                            | 2, 3  | `server/src/routes/orders*.ts`                                                           | ☐                   |
| P2.5 | Database — MongoDB (completes MERN)                                                                       | 1     | `server/src/models/*` — Mongoose 8                                                       | ✅                  |
| P2.6 | API documentation — endpoint reference                                                                    | 3     | `docs/API.md`                                                                            | ☐                   |
| P3.1 | Production hosting set up — client (Vercel), API (Render), DB (MongoDB Atlas)                             | 3     | `docs/DEPLOYMENT.md`                                                                     | ☐                   |
| P3.2 | Server configured — env vars, CORS, secure cookies, health check, logs, seed for demo                     | 3     | `docs/DEPLOYMENT.md`                                                                     | ☐                   |
| P3.3 | Tested thoroughly in production — smoke checklist + Playwright run against the live URL                   | 3     | `docs/DEPLOYMENT.md` § Production test report                                            | ☐                   |
| P3.4 | Runs smoothly — Lighthouse on live URL, no console errors, uptime check                                   | 3     | `docs/DEPLOYMENT.md`                                                                     | ☐                   |
| P4.1 | Pitch — purpose & significance, objectives, outcomes, findings                                            | 3     | `docs/PITCH.md`                                                                          | ☐                   |
| P4.2 | Live demo script + demo accounts + screenshots                                                            | 3     | `docs/PITCH.md`, `docs/screenshots/`                                                     | ☐                   |

## Batch 1 coverage note (9 Oct 2026)

Phase 1 is complete for everything a guest sees, and the parts of Phase 2 that Batch 1 owns — Express, MongoDB
and the public catalogue endpoints — are in place. The rows still open need the later batches: authentication
and order processing (P2.2, P2.4) in Batches 2 and 3, API documentation (P2.6), deployment (P3.x) and the pitch
(P4.x) in Batch 3. Phase 1 asks for "ReactJS": Next.js is a React framework, which the README states
explicitly (ADR-007).
