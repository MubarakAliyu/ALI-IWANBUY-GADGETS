import type { Metadata } from "next";
import Link from "next/link";
import { Article } from "@/components/shared/article";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms you agree to when you order from ALI_IWANBUY Gadgets.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <Article
      title="Terms and conditions"
      standfirst={`These terms apply when you buy from ${SITE.legalName} through this website.`}
    >
      <h2>Prices</h2>
      <p>
        All prices are in Nigerian naira and include VAT where it applies. Prices change with the market, so
        the price that counts is the one shown when you place the order — we re-check it on our side before
        the order is accepted, and tell you if it has moved.
      </p>

      <h2>Placing an order</h2>
      <p>
        An order is a request to buy. It becomes a sale when we confirm it and set stock aside for you. If an
        item sells out between your order and our confirmation, we will tell you and refund anything you have
        already paid.
      </p>

      <h2>Payment</h2>
      <p>
        Bank transfer or pay on delivery. A transfer is only treated as received once a named member of our
        staff has confirmed it against our bank account. Never send money to an account that was not shown to
        you on this website — call <a href={SITE.phoneHref}>{SITE.phone}</a> if anything looks wrong.
      </p>

      <h2>Delivery</h2>
      <p>
        Delivery times are estimates, not guarantees. See{" "}
        <Link href="/delivery-and-returns">Delivery &amp; returns</Link> for what we charge and what happens
        if an order arrives damaged.
      </p>

      <h2>Your account</h2>
      <p>
        Keep your password to yourself; orders placed from your account are treated as yours. Your email
        address cannot be changed once the account exists. We may suspend an account that is used to abuse the
        shop or its staff.
      </p>

      <h2>Warranty and liability</h2>
      <p>
        Warranties are as stated on each product page and on the <Link href="/warranty">Warranty</Link> page.
        Beyond that, our liability for any order is limited to what you paid for it. Nothing here removes a
        right you have under Nigerian consumer law.
      </p>

      <h2>Contact</h2>
      <p>
        {SITE.legalName}, {SITE.registeredAddress}. RC {SITE.rcNumber} · TIN {SITE.tin}. Email{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
    </Article>
  );
}
