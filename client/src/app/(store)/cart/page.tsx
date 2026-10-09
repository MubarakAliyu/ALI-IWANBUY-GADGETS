import type { Metadata } from "next";
import { CartView } from "@/components/store/cart-view";
import { Container } from "@/components/shared/container";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false, follow: false },
};

/** The cart page (S-6). The cart itself lives in the browser, so the page is a thin shell around it. */
export default function CartPage() {
  return (
    <Container className="py-8">
      <h1 className="mb-6 text-h1 text-brand-navy">Your cart</h1>
      <CartView />
    </Container>
  );
}
