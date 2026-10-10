import type { Metadata } from "next";
import Link from "next/link";
import { Article } from "@/components/shared/article";
import { SITE, telHref } from "@/lib/site";
import { getStoreDetails } from "@/lib/store-details";

export const metadata: Metadata = {
  title: "Delivery & returns",
  description: "How we deliver, what it costs, and what happens if something is wrong with your order.",
  alternates: { canonical: "/delivery-and-returns" },
};

export const revalidate = 60;

export default async function DeliveryAndReturnsPage() {
  const settings = await getStoreDetails();

  return (
    <Article
      title="Delivery & returns"
      standfirst="Three ways to get your order, and a clear answer on what happens if something is wrong."
    >
      <h2>Pickup at the shop</h2>
      <p>
        Free. Order online, and collect at {settings?.shopAddress ?? "our shop"} once we confirm your payment.
        Bring the order number and a form of ID. Orders are held for seven days.
      </p>

      <h2>Delivery within {SITE.city}</h2>
      <p>
        A flat fee shown at checkout, usually the same day for orders confirmed before 15:00. The dispatch
        rider calls the number on the order before arriving.
      </p>

      <h2>Nationwide delivery</h2>
      <p>
        By courier, two to five working days depending on the state. The fee is shown at checkout before you
        place the order. Orders over the free-delivery threshold shown at checkout ship at no cost.
      </p>

      <h2>Paying</h2>
      <p>
        Bank transfer, which a named member of staff confirms by hand before the order moves, or pay on
        delivery and at pickup. We do not take card details on this website.
      </p>

      <h2>If something is wrong</h2>
      <ul>
        <li>
          <strong>Wrong or damaged item</strong> — tell us within 48 hours of receiving it and we will replace
          it or refund it in full, including the delivery fee.
        </li>
        <li>
          <strong>Change of mind</strong> — unopened, unused items in their sealed packaging can be returned
          within seven days. The delivery fee is not refunded.
        </li>
        <li>
          <strong>Faulty device</strong> — covered by the warranty on the product page. See{" "}
          <Link href="/warranty">Warranty</Link>.
        </li>
      </ul>
      <p>
        Activated software, used earphones, screen protectors that have been fitted, and items damaged by the
        customer cannot be returned.
      </p>

      <h2>How to start a return</h2>
      <p>
        Call or WhatsApp {settings ? <a href={telHref(settings.phone)}>{settings.phone}</a> : "the shop"} with
        your order number. We will tell you whether to bring the item in or send it back, and what to expect.
      </p>
    </Article>
  );
}
