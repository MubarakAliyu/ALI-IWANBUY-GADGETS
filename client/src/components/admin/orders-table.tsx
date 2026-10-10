"use client";

import type { AdminOrderRow, OrderStatus } from "@aib/shared";
import { ORDER_STATUS, ORDER_STATUS_LABEL, PAYMENT_METHOD, PAYMENT_STATUS } from "@aib/shared";
import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";
import { AdminFilterBar } from "@/components/admin/admin-filter-bar";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/date";
import { formatNaira } from "@/lib/money";
import type { Paginated } from "@/lib/admin";

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Transfer",
  PAY_ON_DELIVERY: "On delivery",
};

const PAYMENT_LABEL: Record<string, string> = {
  UNPAID: "Unpaid",
  AWAITING_CONFIRMATION: "Awaiting",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

const columns: DataTableColumn<AdminOrderRow>[] = [
  {
    id: "orderNumber",
    header: "Order",
    sortKey: "orderNumber",
    cell: ({ row }) => (
      <Link
        href={`/admin/orders/${row.original.orderNumber}`}
        className="font-semibold text-brand-navy hover:text-brand-primary"
      >
        {row.original.orderNumber}
      </Link>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <span className="grid">
        <span className="truncate">{row.original.customerName}</span>
        <span className="truncate text-caption text-text-muted">{row.original.customerEmail}</span>
      </span>
    ),
  },
  {
    id: "placedAt",
    header: "Placed",
    sortKey: "placedAt",
    cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.placedAt)}</span>,
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status as OrderStatus} />,
  },
  {
    id: "paymentStatus",
    header: "Payment",
    cell: ({ row }) => (
      <span className="grid">
        <span>{PAYMENT_LABEL[row.original.paymentStatus] ?? row.original.paymentStatus}</span>
        <span className="text-caption text-text-muted">
          {METHOD_LABEL[row.original.paymentMethod] ?? row.original.paymentMethod}
        </span>
      </span>
    ),
  },
  {
    id: "itemCount",
    header: "Items",
    numeric: true,
    cell: ({ row }) => row.original.itemCount,
  },
  {
    id: "totalKobo",
    header: "Total",
    sortKey: "totalKobo",
    numeric: true,
    cell: ({ row }) => <span className="font-semibold">{formatNaira(row.original.totalKobo)}</span>,
  },
];

/** The orders table (A-4): everything the shop has sold, searchable and exportable. */
export function OrdersTable({
  result,
  exportHref,
}: {
  result: Paginated<AdminOrderRow>;
  exportHref: string;
}) {
  return (
    <div className="grid gap-4">
      <AdminFilterBar
        searchLabel="Search orders"
        searchPlaceholder="Order number, customer name, email or reference…"
        exportHref={exportHref}
        dateFilter
        selects={[
          {
            name: "status",
            label: "Status",
            options: ORDER_STATUS.map((status) => ({
              value: status,
              label: ORDER_STATUS_LABEL[status],
            })),
          },
          {
            name: "paymentStatus",
            label: "Payment",
            options: PAYMENT_STATUS.map((status) => ({
              value: status,
              label: PAYMENT_LABEL[status] ?? status,
            })),
          },
          {
            name: "paymentMethod",
            label: "Method",
            options: PAYMENT_METHOD.map((method) => ({
              value: method,
              label: METHOD_LABEL[method] ?? method,
            })),
          },
        ]}
      />

      <DataTable
        caption="Orders"
        columns={columns}
        rows={result.data}
        total={result.total}
        page={result.page}
        pages={result.pages}
        rowKey={(row) => row.orderNumber}
        empty={
          <EmptyState
            icon={<ShoppingBagIcon aria-hidden="true" />}
            title="No orders match that"
            description="Try a different search, or clear the filters to see everything."
          />
        }
      />
    </div>
  );
}
