import type { Metadata } from "next";
import { MailIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";
import { Article } from "@/components/shared/article";
import { SITE, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Call, WhatsApp or visit ALI_IWANBUY Gadgets in ${SITE.city}, ${SITE.state}.`,
  alternates: { canonical: "/contact" },
};

const MAP_QUERY = encodeURIComponent("Olumbu Plaza, Birnin Kebbi, Kebbi State, Nigeria");

export default function ContactPage() {
  return (
    <Article title="Contact us" standfirst="The fastest answer is on WhatsApp. We reply during shop hours.">
      <ul className="not-prose grid gap-3">
        <li className="flex items-start gap-3 rounded-md border border-grey-200 bg-white p-4">
          <PhoneIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-primary" />
          <span>
            <strong className="block font-semibold">Call us</strong>
            <a href={SITE.phoneHref} className="text-brand-primary underline underline-offset-4">
              {SITE.phone}
            </a>
          </span>
        </li>
        <li className="flex items-start gap-3 rounded-md border border-grey-200 bg-white p-4">
          <MessageCircleIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-primary" />
          <span>
            <strong className="block font-semibold">WhatsApp</strong>
            <a
              href={whatsappLink(`Hello ${SITE.name}, I would like to ask about a product.`)}
              target="_blank"
              rel="noreferrer noopener"
              className="text-brand-primary underline underline-offset-4"
            >
              Open a chat with the shop
            </a>
          </span>
        </li>
        <li className="flex items-start gap-3 rounded-md border border-grey-200 bg-white p-4">
          <MailIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-primary" />
          <span>
            <strong className="block font-semibold">Email</strong>
            <a href={`mailto:${SITE.email}`} className="text-brand-primary underline underline-offset-4">
              {SITE.email}
            </a>
          </span>
        </li>
        <li className="flex items-start gap-3 rounded-md border border-grey-200 bg-white p-4">
          <MapPinIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-primary" />
          <span>
            <strong className="block font-semibold">Visit the shop</strong>
            {SITE.shopAddress}
            <br />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-brand-primary underline underline-offset-4"
            >
              Open in Google Maps
            </a>
          </span>
        </li>
      </ul>

      <h2>Opening hours</h2>
      <ul>
        <li>Monday to Saturday — 9:00 to 18:00</li>
        <li>Friday — closed between 13:00 and 14:30 for prayers</li>
        <li>Sunday — closed</li>
      </ul>

      <h2>Registered office</h2>
      <p>
        {SITE.legalName}, {SITE.registeredAddress}. RC {SITE.rcNumber} · TIN {SITE.tin}. Invoices are issued
        from this address.
      </p>
    </Article>
  );
}
