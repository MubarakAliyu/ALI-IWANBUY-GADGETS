import type { Metadata } from "next";
import { OrdersView } from "@/components/account/orders-view";

export const metadata: Metadata = {
  title: "My orders",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  return <OrdersView initialStatus={status} />;
}
