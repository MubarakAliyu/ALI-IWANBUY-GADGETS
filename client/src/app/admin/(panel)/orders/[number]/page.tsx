import type { Metadata } from "next";
import type { OrderStatus, Permission } from "@aib/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, DownloadIcon, MailIcon, PhoneIcon } from "lucide-react";
import { OrderActions } from "@/components/admin/order-actions";
import { OrderNotes } from "@/components/admin/order-notes";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminOrder, getAdminSession, invoicePdfHref } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/date";
import { formatNaira } from "@/lib/money";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  return { title: number };
}

/**
 * One order, with everything about it on a single screen (A-4) — because the question at the counter is
 * never "what is this order's status", it is "what is going on with this order", and that needs the items,
 * the money, the address and what has happened so far, all at once.
 */
export default async function AdminOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;

  const [order, session] = await Promise.all([
    getAdminOrder(number).catch((error: unknown) => {
      if (error instanceof ApiRequestError && error.isNotFound) {
        return null;
      }
      throw error;
    }),
    getAdminSession(),
  ]);

  if (!order) {
    notFound();
  }

  const permissions = new Set(session.permissions as Permission[]);
  const canSeeMoney = permissions.has("payments.view");

  return (
    <div className="grid gap-5">
      <Link
        href="/admin/orders"
        className="inline-flex w-fit items-center gap-1.5 text-body-sm text-text-muted hover:text-brand-navy"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        All orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h1 text-brand-navy">{order.orderNumber}</h1>
            <StatusBadge status={order.status as OrderStatus} />
          </div>
          <p className="text-body-sm text-text-muted">
            Placed {formatDateTime(order.placedAt)} · {order.itemCount}{" "}
            {order.itemCount === 1 ? "item" : "items"} · {formatNaira(order.totalKobo)}
          </p>
        </div>

        <OrderActions order={order} permissions={permissions} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="grid content-start gap-4">
          <Panel title="Items">
            <ul className="divide-y divide-grey-200">
              {order.items.map((item) => (
                <li key={item.sku} className="flex items-start justify-between gap-4 py-3">
                  <div className="grid min-w-0 gap-0.5">
                    <Link
                      href={`/product/${item.slug}`}
                      className="truncate font-semibold text-brand-navy hover:text-brand-primary"
                    >
                      {item.name}
                    </Link>
                    <span className="truncate text-caption text-text-muted">
                      {item.variantLabel} · {item.sku}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-brand-navy tabular-nums">
                      {formatNaira(item.lineTotalKobo)}
                    </p>
                    <p className="text-caption text-text-muted tabular-nums">
                      {item.qty} × {formatNaira(item.unitPriceKobo)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-3 grid gap-1.5 border-t border-grey-200 pt-3 text-body-sm">
              <Row label="Subtotal" value={formatNaira(order.subtotalKobo)} />
              <Row
                label="Delivery"
                value={order.deliveryFeeKobo === 0 ? "Free" : formatNaira(order.deliveryFeeKobo)}
              />
              <Row label="Total" value={formatNaira(order.totalKobo)} strong />
            </dl>
          </Panel>

          <Panel title="What has happened">
            <ol className="grid gap-0">
              {order.statusHistory.map((event, index) => (
                <li key={`${event.status}-${event.at}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                        index === order.statusHistory.length - 1 ? "bg-brand-primary" : "bg-grey-300"
                      }`}
                    />
                    {index < order.statusHistory.length - 1 ? (
                      <span aria-hidden="true" className="w-px flex-1 bg-grey-200" />
                    ) : null}
                  </div>
                  <div className="grid gap-0.5 pb-4">
                    <p className="text-body-sm font-semibold text-brand-navy">
                      {(
                        {
                          PENDING_PAYMENT: "Waiting for payment",
                          AWAITING_CONFIRMATION: "Customer says they have paid",
                          PAID: "Payment confirmed",
                          PROCESSING: "Being prepared",
                          READY_FOR_PICKUP: "Ready for pickup",
                          SHIPPED: "Sent out",
                          DELIVERED: "Delivered",
                          COMPLETED: "Completed",
                          CANCELLED: "Cancelled",
                          REFUNDED: "Refunded",
                        } as Record<string, string>
                      )[event.status] ?? event.status}
                    </p>
                    <p className="text-caption text-text-muted">
                      {formatDateTime(event.at)} · {event.by}
                    </p>
                    {event.note ? <p className="text-body-sm text-text-muted">{event.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <OrderNotes orderNumber={order.orderNumber} notes={order.adminNotes} />
        </div>

        <div className="grid content-start gap-4">
          <Panel title="Customer">
            <div className="grid gap-2">
              <Link
                href={`/admin/customers?q=${encodeURIComponent(order.customer.email)}`}
                className="font-semibold text-brand-navy hover:text-brand-primary"
              >
                {order.customer.name}
              </Link>
              <a
                href={`mailto:${order.customer.email}`}
                className="inline-flex items-center gap-2 text-body-sm text-text-muted hover:text-brand-navy"
              >
                <MailIcon aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">{order.customer.email}</span>
              </a>
              {order.customer.phone ? (
                <a
                  href={`tel:${order.customer.phone}`}
                  className="inline-flex items-center gap-2 text-body-sm text-text-muted hover:text-brand-navy"
                >
                  <PhoneIcon aria-hidden="true" className="size-4 shrink-0" />
                  {order.customer.phone}
                </a>
              ) : null}
              <p className="text-caption text-text-muted">
                {order.customer.orderCount} {order.customer.orderCount === 1 ? "order" : "orders"} in total
              </p>
            </div>
          </Panel>

          <Panel title={order.shippingAddress ? "Delivering to" : "Collecting from the shop"}>
            {order.shippingAddress ? (
              <address className="grid gap-0.5 text-body-sm text-text-muted not-italic">
                <span className="font-semibold text-brand-navy">{order.shippingAddress.fullName}</span>
                <span>{order.shippingAddress.line1}</span>
                {order.shippingAddress.line2 ? <span>{order.shippingAddress.line2}</span> : null}
                <span>
                  {order.shippingAddress.city}, {order.shippingAddress.state}
                </span>
                {order.shippingAddress.landmark ? (
                  <span className="text-caption">Near {order.shippingAddress.landmark}</span>
                ) : null}
                <span>{order.shippingAddress.phone}</span>
              </address>
            ) : (
              <p className="text-body-sm text-text-muted">
                The customer is collecting this order at the shop.
              </p>
            )}
          </Panel>

          {canSeeMoney ? (
            <Panel title="Payment">
              <dl className="grid gap-1.5 text-body-sm">
                <Row
                  label="Status"
                  value={
                    {
                      UNPAID: "Unpaid",
                      AWAITING_CONFIRMATION: "Awaiting",
                      PAID: "Paid",
                      REFUNDED: "Refunded",
                    }[order.paymentStatus] ?? order.paymentStatus
                  }
                />
                <Row
                  label="Method"
                  value={order.paymentMethod === "BANK_TRANSFER" ? "Bank transfer" : "On delivery"}
                />
                {order.customerTransferRef ? (
                  <Row label="Customer's reference" value={order.customerTransferRef} />
                ) : null}
                {order.paidAt ? <Row label="Paid" value={formatDate(order.paidAt)} /> : null}
              </dl>

              {order.payments.length > 0 ? (
                <ul className="mt-3 grid gap-2 border-t border-grey-200 pt-3">
                  {order.payments.map((payment) => (
                    <li key={payment.paymentNumber} className="grid gap-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-caption text-text-muted">{payment.paymentNumber}</span>
                        <span
                          className={`text-body-sm font-semibold tabular-nums ${
                            payment.amountKobo < 0 ? "text-danger-text" : "text-brand-navy"
                          }`}
                        >
                          {formatNaira(payment.amountKobo)}
                        </span>
                      </div>
                      <span className="text-caption text-text-muted">
                        {formatDateTime(payment.confirmedAt)}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {order.invoice && permissions.has("invoices.manage") ? (
                <a
                  href={invoicePdfHref(order.invoice.invoiceNumber)}
                  className="mt-3 inline-flex items-center gap-2 border-t border-grey-200 pt-3 text-body-sm font-semibold text-brand-primary hover:underline"
                >
                  <DownloadIcon aria-hidden="true" className="size-4" />
                  {order.invoice.invoiceNumber}
                </a>
              ) : null}
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid content-start gap-3 rounded-lg border border-grey-200 bg-white p-4">
      <h2 className="text-body-sm font-semibold text-brand-navy">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className={`tabular-nums ${strong ? "text-body font-bold text-brand-navy" : "text-brand-navy"}`}>
        {value}
      </dd>
    </div>
  );
}
