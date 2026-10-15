# ALI_IWANBUY Gadgets — pitch

**GoMyCode Lab Phase 4.** Ten slides, 7–10 minutes, with a four-minute live demo in the middle.

A talk track is under each slide. It is written to be said out loud, not read off the screen — the slide
should carry the heading and a few words; everything else is spoken.

> Live URL: _to be filled in once the hosting in [`DEPLOYMENT.md`](DEPLOYMENT.md) is set up._
> Repository: _the GitHub URL._
> Demo accounts and the click-by-click run: [`DEMO-SCRIPT.md`](DEMO-SCRIPT.md).

---

## 1 · Title

> **ALI_IWANBUY Gadgets**
> _Clean. Modern. Reliable._
> A real phone shop in Birnin Kebbi, online.
> `<live URL>`

**Say:** "This is ALI_IWANBUY Gadgets — an online shop and a back office for a real business in Birnin Kebbi,
Kebbi State. It's live at this address, and everything you'll see in the next few minutes is running against
the real thing, not a mock-up."

---

## 2 · Purpose and significance

> A shop that sells on WhatsApp. One phone, one person, one conversation at a time.

**Say:**

"ALI_IWANBUY INTEGRATED SERVICE LTD sells phones, laptops and accessories from a shop on Ahmadu Bello Way.
The way it sells today is the way most small Nigerian retailers sell: a flyer on WhatsApp Status, and then
individual chats. 'Is the 15 Pro still available?' 'How much is the 256?' 'Can you deliver to Kalgo?' The
owner answers each one by hand.

That works until it doesn't. It doesn't scale past the hours in a day. It loses the customer who asks at
midnight. There's no record of what was quoted to whom. Stock lives in the owner's head, so two people can be
promised the last phone. And nobody outside the WhatsApp list ever finds the shop at all.

Why this matters beyond one shop: this is the shape of small retail across Nigeria. The gap isn't that these
businesses don't want to be online — it's that the available options are a Facebook page, which isn't a shop,
or a marketplace that takes a cut and owns the customer. What's missing is the thing in between: your own
shop, your own prices, your own customers, and a back office that actually matches how the business runs —
including paying by bank transfer, which is how most of these sales are actually settled.

So the significance isn't technical. It's that a shop that could only sell during conversations can now sell
while it's closed."

---

## 3 · Objectives

> G1 Sell online · G2 Run the shop from one place · G3 Trustworthy money
> G4 Fast on a phone · G5 Nothing unrecorded · G6 A stranger can run it

**Say:**

"Six goals, in plain language.

**One — sell without a conversation.** A customer finds a product, sees the real price and the real stock,
and orders, at any hour, without anybody replying.

**Two — run the shop from one place.** Orders, payments, stock, customers and prices in one dashboard, not
spread across a notebook, a chat and someone's memory.

**Three — money you can trust.** Payment is by bank transfer, so somebody has to look at a bank app and say
'yes, that landed.' That moment has to be deliberate, attributable, and impossible to do twice by accident.

**Four — fast on a phone, on Nigerian data.** Most customers are on mobile, often on a slow connection. A
page that takes eight seconds isn't a shop.

**Five — nothing happens that nobody can look up later.** Who cancelled that order? Who changed that price?
Who confirmed that payment? Always answerable.

**Six — a stranger can run the project.** Clone it, one command, it works. Including the examiner."

---

## 4 · The solution

> **Storefront** — browse, cart, checkout, account, order tracking
> **Dashboard** — overview, orders, payments, invoices, catalogue, people, audit
>
> React (Next.js 15) · Node.js · Express · MongoDB

```
Browser ──▶ Next.js 15 (Vercel) ──rewrite /api/*──▶ Express 5 (Render) ──▶ MongoDB Atlas
            React 19, Tailwind v4                   Mongoose 8, transactions   replica set
                                                           │
                                                    Cloudinary · SMTP
```

**Say:**

"It's a MERN application. MongoDB, Express, React, Node.

The storefront is Next.js 15 with React 19 — Next.js is a React framework, and the lab asks for ReactJS. The
API is Express 5 on Node 22. The database is MongoDB with Mongoose.

One detail worth pointing at: the browser only ever talks to the Next.js domain. Next rewrites `/api` through
to the Express service. That means the session cookies are first-party — no third-party cookie problems in
Safari — and there's no CORS preflight in front of every request. It's one line of configuration that removes
a whole class of deployment pain.

The two halves share a package: the validation schemas and the money helpers are the same code on both sides,
so the message a customer reads in a form is the message the server would have given."

---

## 5 · Live demo (≤ 4 minutes)

> Customer: find → cart → checkout → "I've paid"
> Owner: confirm with PIN → invoice → audit

**Say:** "Rather than describe it, let me show you." → run [`DEMO-SCRIPT.md`](DEMO-SCRIPT.md).

Two journeys, deliberately joined: the customer places the order, and then the owner is the one who turns it
into money. The handover is the point.

**If the site is cold** (free hosting sleeps after fifteen minutes) the first page takes 30–50 seconds. Open
it a minute before you start. The demo script has a local fallback.

---

## 6 · Engineering highlights

> Atomic stock · PIN-confirmed payments · Append-only audit · Integer kobo · Server-side permissions

**Say:**

"Five decisions worth defending.

**The last phone.** Two customers tap Buy on the last unit at the same instant. Naïvely you read the stock,
see 1, and write 0 — twice, and now you owe two people one phone. Instead the decrement is a single
conditional update: decrease the stock _only while_ there is enough. One of them matches, the other doesn't
and gets an honest 'only one left.' The whole order is a transaction, so stock and order can't disagree.
There's a test that races two orders at the last unit.

**Money needs a second key.** Being signed in isn't enough to mark an order paid. Confirming a payment,
cancelling an order that's been paid for, and refunding each ask for the admin's own PIN — separate from the
password, hashed, five wrong tries locks it for fifteen minutes. The confirmation writes the payment, the
invoice, the order's new state and the audit row in one transaction. Click twice and the second one is
refused; nothing is written.

**The audit trail cannot be edited.** Not by a manager, not by the owner, not through the dashboard. There's
no route that writes to it, no service function that changes a row, and the model throws if anything tries to
update or delete one. Passwords and PINs are redacted before the row is written, so the trail can't leak them
either. A test drives all thirteen mutating admin endpoints and fails if any of them forgets to record.

**Money is never a float.** `0.1 + 0.2` is not `0.3`, and a shop that rounds wrongly on every order
eventually owes somebody money. Everything is an integer number of kobo — database, API, state. The only
place naira arithmetic happens is one module, and it uses bigint. Naira appear at the last moment, when
something is rendered.

**Permissions are a server concern.** There's one matrix both sides import, so the dashboard hides what a
role can't do — but that's tidiness. The refusal comes from the server, and a refused request writes an audit
row. A staff member doesn't just not see the revenue figures: the server never computes them, so there's
nothing in the response to read."

---

## 7 · Outcomes

> Delivered in three batches · 311 automated tests · a11y 100 · Shipped

|                |                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Storefront** | 43 products, filters, search, cart, checkout, accounts, wishlist, order tracking, invoice download                                           |
| **Dashboard**  | Overview with eight KPIs and three charts, orders, payments, invoices, products, categories, brands, customers, admin users, settings, audit |
| **Tests**      | **245** unit and integration (193 server, 34 client, 18 shared) + **66** Playwright across desktop and Pixel 7 — **311** in all              |
| **Lighthouse** | Accessibility **100**, Best practices **100**, SEO **100**; performance 85 (home) / 81 (product)                                             |
| **Docs**       | Overview, API reference, deployment runbook, 21 numbered decisions                                                                           |

**Say:**

"Three batches. Batch one was the foundation and the storefront; batch two accounts and checkout; batch three
the dashboard, deployment and this pitch.

Three hundred and eleven automated tests, and they're not decoration — the race on the last unit, the double payment
confirmation, the audit immutability, the role matrix for every endpoint group, the dashboard arithmetic
against hand-computed numbers.

Accessibility, best practices and SEO are 100 out of 100. Performance is 85 and 81, and I'll be honest about
that in a moment.

And every quality gate — types, lint, tests, build — is green."

---

## 8 · Findings and lessons

> What was hard · What changed · What I'd do differently

**Say:**

"**What was hard.** The money path. Not writing it — making it impossible to get wrong. Every obvious design
has a hole: if you set stock rather than decrement it, a sale mid-count disappears; if you trust the price
the browser sends, you've built a discount generator; if you let an invoice be edited, it isn't a record.
Most of the work was closing holes nobody would have noticed until they cost real money.

**What changed along the way.** Twenty-one decisions are written down in the ADRs, with reasons. Two
examples. I had TanStack Query mounted only where it was used — then the wishlist heart appeared on every
product card, so it moved to the root, and I wrote down what that cost in kilobytes rather than pretending it
was free. And the trivial-PIN rule — '1234 is too easy' — was applied both when choosing a PIN _and_ when
entering one, which meant someone who mistyped got told their existing PIN was too easy to guess. Nonsense.
I only found it by actually using the dialog.

**What I'd do differently.** I'd start the admin's permission matrix in shared code on day one instead of
introducing it in batch three; retrofitting is more work than starting with it. And I'd set a performance
budget at the beginning — 85 is respectable but it's a number I chased at the end rather than defended all
along.

**What I'm still honest about.** The product photographs are generated placeholders, because only eleven
approved photos exist and none of them is a catalogue shot. They're obviously placeholders on purpose, so the
owner can see at a glance which products still need a real picture."

---

## 9 · Roadmap

> IMS stock sync · Paystack · WhatsApp notifications · Performance budget

**Say:**

"Four things next, in the order the business would want them.

**Stock sync with the inventory system.** There's a separate inventory system for this company. Today the
shop's stock and the warehouse's stock are two numbers. They should be one.

**Paystack.** Bank transfer with manual confirmation is honest and it matches how the shop already works, but
card and USSD would let an order complete itself at midnight, which is the whole point of being online.

**WhatsApp notifications.** Email is what we have. WhatsApp is where these customers actually are.

**A performance budget in CI.** Hold the line at 90 rather than chasing it afterwards."

---

## 10 · Thank you

> **ALI_IWANBUY Gadgets** · _Clean. Modern. Reliable._
> Live: `<URL>` · Code: `<repo>` · Built by Starnova Labs
> Questions

**Say:** "Thank you. The code is public, the deployment runbook is in the repository, and I'm happy to go
into any part of it."

### Questions to expect

| Question                                       | Answer                                                                                                                                                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Why Next.js when the brief says React?"       | Next.js is a React framework — React 19 throughout. It gives server rendering, which is what makes the catalogue fast on a phone. Recorded as ADR-007.                                                                                            |
| "Why no card payments?"                        | Because that is how this shop is actually paid. Bank transfer with a confirmed receipt matches the business today; Paystack is on the roadmap, and the order lifecycle already has the state for it.                                              |
| "Is the admin secure?"                         | Separate cookie, separate signing key, eight-hour sliding session, server-side permission on every route, a second PIN for anything involving money, and an audit trail that cannot be edited. The role matrix is proven by tests, not by the UI. |
| "What happens if two people buy the last one?" | One order, one honest refusal, no negative stock — and there is a test that races it.                                                                                                                                                             |
| "Performance is only 85?"                      | Yes. Accessibility, best practices and SEO are 100. The remaining cost is shared JavaScript; the levers are known and written down in `PROGRESS.md` rather than quietly ignored.                                                                  |
| "Could another shop use this?"                 | Nothing in it is specific to this one except the contents of Store Settings — name, address, bank, fees, hours — which are edited from the dashboard, not from the code.                                                                          |

---

## Screenshots

Twenty-four images in [`screenshots/`](screenshots/) — twelve pages, each at 1440px and at 390px, captured by
`pnpm screenshots` against the running app. Re-run it after any visual change; it overwrites in place.

| File (both `-desktop` and `-mobile`) | Slide                        |
| ------------------------------------ | ---------------------------- |
| `home`                               | 1, 4                         |
| `shop-filters`                       | 4                            |
| `product`                            | 5                            |
| `cart`                               | 5                            |
| `account-orders`, `account-settings` | 5                            |
| `admin-overview`                     | 4, 7                         |
| `admin-orders`, `admin-products`     | 5                            |
| `admin-payments`                     | 5                            |
| `admin-pin-modal`                    | 6 — the PIN dialog mid-entry |
| `admin-audit`                        | 6                            |

The invoice is not a screenshot: open the real PDF from the Invoices page during the demo, or export one
beforehand and put the PDF in the deck. A photograph of a document is less convincing than the document.
