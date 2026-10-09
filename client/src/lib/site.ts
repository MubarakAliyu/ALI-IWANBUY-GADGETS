/**
 * The company facts that appear in the chrome of every page (overview §5). The authoritative copy lives in
 * Store Settings and arrives from `/settings/public`; these values are the fallback the footer, the contact
 * page and the metadata use when the API has not answered — and they are what the static pages are written
 * against, so the shop still reads correctly before the database is seeded.
 */

export const SITE = {
  name: "ALI_IWANBUY Gadgets",
  legalName: "ALI_IWANBUY INTEGRATED SERVICE LTD",
  tagline: "Clean. Modern. Reliable.",
  description:
    "Phones, tablets, laptops and gadgets in Birnin Kebbi. Browse genuine devices, check the price, and order online for pickup or delivery.",
  rcNumber: "8276954",
  tin: "32843883-0001",
  registeredAddress: "No. 26, Olumbo Plaza, Ahmadu Bello Way, Birnin Kebbi, Kebbi State, Nigeria",
  shopAddress: "Shop 7 & 8, Olumbu Plaza, Birnin Kebbi, Kebbi State, Nigeria",
  city: "Birnin Kebbi",
  state: "Kebbi State",
  phone: "+234 703 925 4143",
  phoneHref: "tel:+2347039254143",
  whatsapp: "2347039254143",
  email: "sales@aliiwanbuy.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

/** A WhatsApp deep link with the message pre-filled (S-5). */
export function whatsappLink(message: string): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const ANNOUNCEMENT = `Call or WhatsApp ${SITE.phone} · Pickup in ${SITE.city} · Nationwide delivery`;
