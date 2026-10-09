"use client";

import { ORDER_STATUS_LABEL, type OrderStatus } from "@aib/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PackageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { listOrders } from "@/lib/account";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/date";
import { formatNaira } from "@/lib/money";

/** The filters above the list: the states a customer actually looks for (S-11). */
const FILTERS: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All orders" },
  { value: "PENDING_PAYMENT", label: ORDER_STATUS_LABEL.PENDING_PAYMENT },
  { value: "AWAITING_CONFIRMATION", label: ORDER_STATUS_LABEL.AWAITING_CONFIRMATION },
  { value: "PROCESSING", label: ORDER_STATUS_LABEL.PROCESSING },
  { value: "COMPLETED", label: ORDER_STATUS_LABEL.COMPLETED },
  { value: "CANCELLED", label: ORDER_STATUS_LABEL.CANCELLED },
];

/**
 * The order list (S-11). The filter and the page live in the URL, so the back button works and a customer can
 * send themselves a link to "my cancelled orders" exactly as they see it.
 */
export function OrdersView({ initialStatus }: { initialStatus?: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const requested = params.get("status") ?? initialStatus;
  const status: OrderStatus | "ALL" = FILTERS.some((filter) => filter.value === requested)
    ? (requested as OrderStatus)
    : "ALL";
  const pageParam = Number(params.get("page"));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  function hrefFor(next: { status?: OrderStatus | "ALL"; page?: number }): string {
    const query = new URLSearchParams();
    const nextStatus = next.status ?? status;
    const nextPage = next.page ?? 1;
    if (nextStatus !== "ALL") {
      query.set("status", nextStatus);
    }
    if (nextPage > 1) {
      query.set("page", String(nextPage));
    }
    const suffix = query.toString();
    return `/account/orders${suffix ? `?${suffix}` : ""}`;
  }

  const { data, isLoading } = useQuery({
    queryKey: ["orders", status, page],
    queryFn: () => listOrders({ ...(status === "ALL" ? {} : { status }), page }),
  });

  return (
    <div className="grid gap-5">
      <ul className="scroll-slim -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filter orders">
        {FILTERS.map((filter) => (
          <li key={filter.value} className="shrink-0">
            <button
              type="button"
              aria-pressed={status === filter.value}
              onClick={() => router.push(hrefFor({ status: filter.value, page: 1 }), { scroll: false })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-body-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out",
                status === filter.value
                  ? "border-brand-primary bg-primary-50 text-brand-primary"
                  : "border-grey-200 bg-white text-brand-navy hover:bg-grey-50",
              )}
            >
              {filter.label}
            </button>
          </li>
        ))}
      </ul>

      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (data?.data.length ?? 0) === 0 ? (
        <EmptyState
          icon={<PackageIcon />}
          title={status === "ALL" ? "No orders yet" : "Nothing with that status"}
          description={
            status === "ALL"
              ? "When you place an order it will appear here, with its progress."
              : "Try another filter, or look at all your orders."
          }
          action={
            <Button asChild>
              <Link href={status === "ALL" ? "/shop" : "/account/orders"}>
                {status === "ALL" ? "Start shopping" : "Show all orders"}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="grid gap-3">
            {data?.data.map((order) => (
              <li key={order.orderNumber}>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  data-testid="order-row"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-grey-200 bg-white p-4 transition-shadow duration-150 ease-out hover:shadow-md"
                >
                  <div className="grid gap-1">
                    <span className="text-body-sm font-semibold numeric text-brand-navy">
                      {order.orderNumber}
                    </span>
                    <span className="text-caption text-text-muted">
                      {formatDate(order.placedAt)} · {order.itemCount}{" "}
                      {order.itemCount === 1 ? "item" : "items"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-body-sm font-semibold numeric text-brand-navy">
                      {formatNaira(order.totalKobo)}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            page={data?.page ?? 1}
            pages={data?.pages ?? 1}
            hrefFor={(target) => hrefFor({ page: target })}
          />
        </>
      )}
    </div>
  );
}
