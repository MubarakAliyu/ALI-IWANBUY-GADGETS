/**
 * The handful of facts that are not the owner's to edit: what the shop is called, what it says about itself,
 * and where this site lives.
 *
 * Everything the owner can change — the address, the email, the phone, the bank account, the opening hours —
 * lives in Store Settings and reaches the storefront through `/settings/public` (ADR-017). None of it is
 * written down here, so there is exactly one copy of each and the owner's edit is the only version.
 */

export const SITE = {
  name: "ALI_IWANBUY Gadgets",
  legalName: "ALI_IWANBUY INTEGRATED SERVICE LTD",
  tagline: "Clean. Modern. Reliable.",
  description:
    "Phones, tablets, laptops and gadgets in Birnin Kebbi. Browse genuine devices, check the price, and order online for pickup or delivery.",
  city: "Birnin Kebbi",
  state: "Kebbi State",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

/** A phone number as a `tel:` link — `+234 703 925 4143` → `tel:+2347039254143`. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** A WhatsApp deep link with the message pre-filled (S-5). */
export function whatsappLink(whatsapp: string, message: string): string {
  return `https://wa.me/${whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`;
}

/** "Mon – Fri 8:00 am – 10:00 pm" as one line. */
export function formatOpeningHours(entry: { days: string; opens: string; closes: string }): string {
  return `${entry.days} · ${entry.opens} – ${entry.closes}`;
}

export function announcement(phone: string): string {
  return `Call or WhatsApp ${phone} · Pickup in ${SITE.city} · Nationwide delivery`;
}
