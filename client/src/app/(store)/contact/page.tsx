import type { Metadata } from "next";
import Link from "next/link";
import { ClockIcon, MailIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";
import { Article } from "@/components/shared/article";
import { formatOpeningHours, SITE, telHref, whatsappLink } from "@/lib/site";
import { getStoreDetails } from "@/lib/store-details";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contact",
  description: `Call, WhatsApp or visit ALI_IWANBUY Gadgets in ${SITE.city}, ${SITE.state}.`,
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getStoreDetails();

  if (!settings) {
    return (
      <Article title="Contact us" standfirst="Our details are being updated.">
        <p>
          We could not load the shop&apos;s contact details just now. Please try again in a moment, or{" "}
          <Link href="/">return to the shop</Link>.
        </p>
      </Article>
    );
  }

  const mapQuery = encodeURIComponent(settings.shopAddress);

  return (
    <Article title="Contact us" standfirst="The fastest answer is on WhatsApp. We reply during shop hours.">
      <ul className="not-prose grid gap-3">
        <li className="flex items-start gap-3 rounded-md border border-grey-200 bg-white p-4">
          <PhoneIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-primary" />
          <span>
            <strong className="block font-semibold">Call us</strong>
            <a href={telHref(settings.phone)} className="text-brand-primary underline underline-offset-4">
              {settings.phone}
            </a>
          </span>
        </li>

        <li className="flex items-start gap-3 rounded-md border border-grey-200 bg-white p-4">
          <MessageCircleIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-primary" />
          <span>
            <strong className="block font-semibold">WhatsApp</strong>
            <a
              href={whatsappLink(
                settings.whatsapp,
                `Hello ${SITE.name}, I would like to ask about a product.`,
              )}
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
            <a href={`mailto:${settings.email}`} className="text-brand-primary underline underline-offset-4">
              {settings.email}
            </a>
          </span>
        </li>

        <li className="flex items-start gap-3 rounded-md border border-grey-200 bg-white p-4">
          <MapPinIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-primary" />
          <span>
            <strong className="block font-semibold">Visit the shop</strong>
            {settings.shopAddress}
            <br />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-brand-primary underline underline-offset-4"
            >
              Open in Google Maps
            </a>
          </span>
        </li>

        {settings.openingHours.length > 0 ? (
          <li className="flex items-start gap-3 rounded-md border border-grey-200 bg-white p-4">
            <ClockIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-primary" />
            <span>
              <strong className="block font-semibold">Opening hours</strong>
              {settings.openingHours.map((entry) => (
                <span key={entry.days} className="block">
                  {formatOpeningHours(entry)}
                </span>
              ))}
            </span>
          </li>
        ) : null}
      </ul>

      <h2>Registered office</h2>
      <p>
        {settings.legalName}, {settings.registeredAddress}. RC {settings.rcNumber} · TIN {settings.tin}.
        Invoices are issued from this address.
      </p>
    </Article>
  );
}
