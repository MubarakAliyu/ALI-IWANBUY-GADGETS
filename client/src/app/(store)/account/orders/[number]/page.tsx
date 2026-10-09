import type { Metadata } from "next";
import { OrderDetailView } from "@/components/account/order-detail-view";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ number: string }> };

export default async function OrderPage({ params }: PageProps) {
  const { number } = await params;
  return <OrderDetailView orderNumber={number} />;
}
