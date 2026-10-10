import type { Metadata } from "next";
import Link from "next/link";
import { Article } from "@/components/shared/article";
import { telHref } from "@/lib/site";
import { getStoreDetails } from "@/lib/store-details";

export const metadata: Metadata = {
  title: "Warranty",
  description: "What the warranty covers on phones, laptops and accessories bought from ALI_IWANBUY Gadgets.",
  alternates: { canonical: "/warranty" },
};

export const revalidate = 60;

export default async function WarrantyPage() {
  const settings = await getStoreDetails();

  return (
    <Article
      title="Warranty"
      standfirst="Every product page states its warranty in months. This page explains what that covers."
    >
      <h2>What is covered</h2>
      <p>
        Faults in the device itself — a battery that will not hold charge, a screen that fails on its own, a
        port that stops working, a speaker that goes silent. Bring the device and your receipt, and we repair
        it, replace it, or refund it.
      </p>

      <h2>What is not covered</h2>
      <ul>
        <li>Physical damage: cracked screens, bent frames, crushed ports.</li>
        <li>Liquid damage, including rain and sweat on devices that are not rated for it.</li>
        <li>Damage from a charger or cable that did not come with the device and is not rated for it.</li>
        <li>Devices opened, repaired or modified by someone else.</li>
        <li>Normal wear: scratches, scuffs and a battery that ages with use.</li>
      </ul>

      <h2>Typical cover</h2>
      <ul>
        <li>New phones, tablets and laptops — 12 months.</li>
        <li>Clean UK-used devices — 3 months, battery health stated at the time of sale.</li>
        <li>Chargers and power banks — 12 to 18 months, depending on the brand.</li>
        <li>Cases and screen protectors — no warranty; we fit screen protectors free.</li>
      </ul>
      <p>
        The months shown on a product page are what applies to that product, and they take precedence here.
      </p>

      <h2>Making a claim</h2>
      <p>
        Call or WhatsApp {settings ? <a href={telHref(settings.phone)}>{settings.phone}</a> : "the shop"} with
        your order number, or bring the device to the shop. Keep the box and accessories where you can. If a
        claim is not covered, we will tell you what a repair would cost before doing anything.
      </p>
      <p>
        Returns and refunds are covered separately under{" "}
        <Link href="/delivery-and-returns">Delivery &amp; returns</Link>.
      </p>
    </Article>
  );
}
