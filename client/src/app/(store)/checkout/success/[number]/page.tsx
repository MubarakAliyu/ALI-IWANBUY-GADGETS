import type { Metadata } from "next";
import { Container } from "@/components/shared/container";
import { OrderSuccessView } from "@/components/checkout/order-success-view";

export const metadata: Metadata = {
  title: "Order placed",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ number: string }> };

export default async function CheckoutSuccessPage({ params }: PageProps) {
  const { number } = await params;
  return (
    <Container className="py-10">
      <OrderSuccessView orderNumber={number} />
    </Container>
  );
}
