"use client";

import type { AwaitingPaymentRow, PaymentRow, PaymentTotals } from "@aib/shared";
import Link from "next/link";
import { BanknoteIcon, ClockIcon } from "lucide-react";
import { AdminFilterBar } from "@/components/admin/admin-filter-bar";
import { ConfirmPaymentDialog } from "@/components/admin/confirm-payment-dialog";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/lib/date";
import { formatNaira } from "@/lib/money";
import type { Paginated } from "@/lib/admin";

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Transfer",
  PAY_ON_DELIVERY: "On delivery",
};

const columns: DataTableColumn<PaymentRow>[] = [
  { id: "paymentNumber", header: "Payment", cell: ({ row }) => row.original.paymentNumber },
  {
    id: "confirmedAt",
    header: "When",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{formatDateTime(row.original.confirmedAt)}</span>
    ),
  },
  {
    id: "orderNumber",
    header: "Order",
    cell: ({ row }) => (
      <Link
        href={`/admin/orders/${row.original.orderNumber}`}
        className="font-semibold text-brand-navy hover:text-brand-primary"
      >
        {row.original.orderNumber}
      </Link>
    ),
  },
  { id: "customerName", header: "Customer", cell: ({ row }) => row.original.customerName },
  {
    id: "method",
    header: "Method",
    cell: ({ row }) => (
      <span className="grid">
        <span>{METHOD_LABEL[row.original.method] ?? row.original.method}</span>
        {row.original.reference ? (
          <span className="text-caption text-text-muted">{row.original.reference}</span>
        ) : null}
      </span>
    ),
  },
  { id: "confirmedBy", header: "Confirmed by", cell: ({ row }) => row.original.confirmedBy },
  {
    id: "amountKobo",
    header: "Amount",
    numeric: true,
    cell: ({ row }) => (
      <span
        className={`font-semibold ${row.original.amountKobo < 0 ? "text-danger-text" : "text-brand-navy"}`}
      >
        {formatNaira(row.original.amountKobo)}
      </span>
    ),
  },
];

/**
 * The payments page (A-7): the queue of transfers waiting on someone, then every payment and refund that has
 * been recorded, with a totals row for the whole filtered set rather than for the page on screen.
 */
export function PaymentsView({
  awaiting,
  result,
  exportHref,
  canConfirm,
}: {
  awaiting: AwaitingPaymentRow[];
  result: Paginated<PaymentRow> & { totals: PaymentTotals };
  exportHref: string;
  canConfirm: boolean;
}) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-3">
        <div className="flex items-center gap-2">
          <ClockIcon aria-hidden="true" className="size-4 text-brand-primary" />
          <h2 className="text-body-sm font-semibold text-brand-navy">
            Waiting to be confirmed ({awaiting.length})
          </h2>
        </div>

        {awaiting.length === 0 ? (
          <p className="rounded-lg border border-dashed border-grey-200 bg-grey-50 px-4 py-6 text-center text-body-sm text-text-muted">
            Nothing is waiting. Every transfer a customer has declared has been checked.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {awaiting.map((row) => (
              <li
                key={row.orderNumber}
                className="grid content-start gap-3 rounded-lg border border-warning-border bg-warning-tint p-4"
              >
                <div className="grid gap-0.5">
                  <Link
                    href={`/admin/orders/${row.orderNumber}`}
                    className="font-semibold text-brand-navy hover:text-brand-primary"
                  >
                    {row.orderNumber}
                  </Link>
                  <span className="text-caption text-text-muted">
                    {row.customerName} · placed {formatDate(row.placedAt)}
                  </span>
                  {row.reference ? (
                    <span className="text-caption text-text-muted">
                      Their reference: <span className="font-semibold">{row.reference}</span>
                    </span>
                  ) : null}
                </div>

                <p className="text-h3 font-bold text-brand-navy tabular-nums">
                  {formatNaira(row.totalKobo)}
                </p>

                {canConfirm ? (
                  <ConfirmPaymentDialog
                    orderNumber={row.orderNumber}
                    totalKobo={row.totalKobo}
                    suggestedReference={row.reference}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4">
        <h2 className="text-body-sm font-semibold text-brand-navy">Every payment and refund</h2>

        <AdminFilterBar
          searchLabel="Search payments"
          searchPlaceholder="Payment number, reference, order or customer…"
          exportHref={exportHref}
          dateFilter
          selects={[
            {
              name: "method",
              label: "Method",
              options: [
                { value: "BANK_TRANSFER", label: "Transfer" },
                { value: "PAY_ON_DELIVERY", label: "On delivery" },
              ],
            },
            {
              name: "status",
              label: "Kind",
              options: [
                { value: "CONFIRMED", label: "Payments" },
                { value: "REFUNDED", label: "Refunds" },
              ],
            },
          ]}
        />

        <dl className="grid gap-3 sm:grid-cols-3">
          <Total label="Taken" value={formatNaira(result.totals.confirmedKobo)} />
          <Total label="Refunded" value={formatNaira(result.totals.refundedKobo)} />
          <Total label="Net" value={formatNaira(result.totals.netKobo)} strong />
        </dl>

        <DataTable
          caption="Payments"
          columns={columns}
          rows={result.data}
          total={result.total}
          page={result.page}
          pages={result.pages}
          rowKey={(row) => row.paymentNumber}
          empty={
            <EmptyState
              icon={<BanknoteIcon aria-hidden="true" />}
              title="No payments match that"
              description="Try a different search, or clear the filters to see everything."
            />
          }
        />
      </section>
    </div>
  );
}

function Total({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid gap-1 rounded-lg border border-grey-200 bg-white p-4">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd
        className={`tabular-nums ${strong ? "text-h2 font-bold text-brand-navy" : "text-h3 text-brand-navy"}`}
      >
        {value}
      </dd>
    </div>
  );
}
