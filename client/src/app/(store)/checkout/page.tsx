import type { Metadata } from "next";
import { Container } from "@/components/shared/container";
import { CheckoutView } from "@/components/checkout/checkout-view";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

/** Checkout (S-9). The guard in `middleware.ts` keeps signed-out visitors away from this page. */
export default function CheckoutPage() {
  return (
    <Container className="py-8">
      <h1 className="mb-6 text-h1 text-brand-navy">Checkout</h1>
      <CheckoutView />
    </Container>
  );
}
