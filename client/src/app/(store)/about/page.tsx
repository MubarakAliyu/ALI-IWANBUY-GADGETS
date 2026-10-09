import type { Metadata } from "next";
import Link from "next/link";
import { Article } from "@/components/shared/article";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About us",
  description: `${SITE.legalName} — a phones and gadgets shop in ${SITE.city}, ${SITE.state}.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <Article
      title="About ALI_IWANBUY Gadgets"
      standfirst={`${SITE.legalName} sells phones, tablets, laptops and accessories from a shop in ${SITE.city}, ${SITE.state}.`}
    >
      <p>
        We started where most of our customers still find us: on WhatsApp and Instagram, answering questions
        about which phone to buy and what it costs today. This website is the same shop, with the prices and
        the stock written down so you can see them before you call.
      </p>

      <h2>What we sell</h2>
      <p>
        New and clean UK-used phones, tablets, laptops, smartwatches, earbuds, speakers, chargers, power
        banks, cases and memory cards. Every device is checked before it goes on the shelf, and the condition
        is stated on its page — we do not describe a used phone as new.
      </p>

      <h2>How buying works</h2>
      <ul>
        <li>Browse the shop and add what you want to your cart.</li>
        <li>Choose pickup at the shop, delivery in {SITE.city}, or nationwide courier.</li>
        <li>Pay by bank transfer, which we confirm by hand, or pay on delivery or at pickup.</li>
        <li>You get a receipt, and an invoice by email for every paid order.</li>
      </ul>

      <h2>Where to find us</h2>
      <p>
        {SITE.shopAddress}. Our registered office is {SITE.registeredAddress}. Call or WhatsApp{" "}
        <a href={SITE.phoneHref}>{SITE.phone}</a>, or read the <Link href="/contact">contact page</Link> for
        opening times.
      </p>

      <h2>Who we are</h2>
      <p>
        {SITE.legalName} is registered in Nigeria — RC {SITE.rcNumber}, TIN {SITE.tin}. The website was built
        by Starnova Labs.
      </p>
    </Article>
  );
}
