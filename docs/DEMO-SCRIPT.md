# Demo script

Four minutes, two journeys. A customer buys something; the owner turns it into money. The handover between
them is the point of the demo, so do not split them across slides.

## Before you start

- [ ] **Open the site a minute early.** The free hosting sleeps after fifteen minutes idle and the first page
      takes 30–50 seconds. Loading it while you are still on slide 1 means it is warm when you get here.
- [ ] Two browser windows, side by side: **left = customer**, **right = dashboard**. Sign the dashboard in
      beforehand, but stay on the Overview.
- [ ] Zoom to about 125% — the room is further away than your monitor.
- [ ] Have the PIN ready: **8426**. Type it; do not read it out.

## Accounts

| Where          | Who      | Email                    | Password      | PIN    |
| -------------- | -------- | ------------------------ | ------------- | ------ |
| `/admin/login` | Owner    | `owner@aliiwanbuy.com`   | `Owner12345`  | `8426` |
| `/admin/login` | Manager  | `manager@aliiwanbuy.com` | `Owner12345`  | `5193` |
| `/admin/login` | Staff    | `staff@aliiwanbuy.com`   | `Owner12345`  | —      |
| `/login`       | Customer | `amina@example.com`      | `Customer123` | —      |

These are demo accounts created by `pnpm seed`. The real shop's passwords are the owner's and are not in the
repository.

---

## Part 1 · The customer (≈ 2 min)

**1. Home** — `/`

> "This is the shop. Everything on this page is real data from the database — no hard-coded products."

Scroll once past the featured row. Do not linger.

**2. Shop with a filter** — click **All categories → Phones**

> "Filters are in the URL, so a filtered shop is a link the owner can paste into a WhatsApp status."

Set a price filter. Point at the address bar as it changes.

**3. A product** — open **Samsung Galaxy S23 Ultra**

> "Price and stock belong to the variant, not the product — switch the storage and both change. If something
> is sold out, it says so here rather than at checkout."

Switch the variant once. **Add to cart.**

**4. Cart** — click the cart

> "The cart lives in the browser, so it survives a reload — but the prices are re-checked against the server
> before any total is shown. A cart that sat in a tab for a week does not get last week's price."

**5. Checkout** — **Checkout**

> "Sign in — and notice the cart came with me. That is the one thing people lose most often."

Sign in as `amina@example.com` / `Customer123`.

> "Delivery here in Birnin Kebbi, or collect at the shop. Payment is by bank transfer, because that is how
> this shop is actually paid — and these are the shop's real bank details, which the owner edits in the
> dashboard, not in the code."

**Place order.**

**6. "I've made the transfer"**

> "The order number is the transfer narration. The customer taps this once they have sent the money — and
> that is all they can do. Nothing here marks the order paid. Only the shop can do that, and that is the
> interesting half."

Click **I've made the transfer** → confirm.

**Hand over to the right-hand window.**

---

## Part 2 · The owner (≈ 2 min)

**7. Overview** — `/admin`

> "This is the same business from the inside. Revenue, orders, average order value, what is waiting, what is
> running low — over whichever period the owner picks, and the period is in the URL too."

Point at the bell. It has just counted the new order.

**8. The queue** — click the bell → **Payments**

> "Here is the order we just placed, waiting. The shop checks the bank app, sees the money, and confirms."

Click **Confirm payment** on that card.

**9. The PIN — do this part slowly**

> "Being signed in is not enough to move money."

Type a **wrong** PIN. Let the refusal show.

> "That is the server refusing, not the page. Five wrong attempts locks the PIN for fifteen minutes, and
> every attempt is recorded."

Now type **8426** and confirm.

> "One transaction: the payment is recorded, an invoice is issued, the order moves, the customer is emailed,
> and a line goes into the audit trail. If I clicked that button twice, the second one would be refused and
> nothing would be written."

**10. The invoice** — **Invoices** → open the top row's PDF

> "A proper A4 invoice — the company's registered address, the RC number, the TIN, the items, the bank
> details. It is drawn on the server with the shop's own font and logo, not printed from a web page, so it
> looks the same wherever it is opened. The customer can download this from their account too."

Close the PDF. From the row's menu, **Send to the customer**.

**11. The audit trail** — **Audit trail**

> "And here is everything that just happened. The wrong PIN. The confirmation. The invoice going out. Who,
> when, from which IP, and what changed — expand one and you see the before and after."

Expand the payment row.

> "Nothing here can be edited or deleted. Not by a manager, not by the owner, not through this dashboard at
> all — there is no route that writes to it."

**12. Roles — the last ten seconds**

Sign out, sign in as `staff@aliiwanbuy.com`.

> "And the same dashboard as a staff member. No revenue, no payments, no invoices — and not because they are
> hidden. The server never sent them."

---

## If something goes wrong

| Problem                           | What to do                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| The first page hangs              | The host was asleep. Say so — it is a free tier, it is in the write-up — and keep talking; it will arrive. |
| The PIN says locked               | Five wrong attempts already. Use the **manager** account: `manager@aliiwanbuy.com` / PIN **5193**.         |
| The invoice email does not arrive | Show the Invoices row instead: the status says **Sent** with a count and a timestamp.                      |
| The live site is down entirely    | Fall back to local, below. Do not improvise.                                                               |

### Local fallback

Four terminals, and it works offline:

```bash
pnpm install
pnpm db:local     # terminal 1 — in-memory replica set, nothing to install
pnpm seed         # terminal 2 — catalogue, admins, customers, 60 days of orders
pnpm dev          # terminal 2 — storefront :3000, API :4000
```

Then open <http://localhost:3000>. The same accounts, the same script. Say plainly that you are running
locally because the host is down — that is a better look than a blank page.

---

## Afterwards

Leave the **Audit trail** on screen during questions. It is the slide that answers most of them.
