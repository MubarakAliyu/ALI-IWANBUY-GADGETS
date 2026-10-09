"use client";

import { useState } from "react";
import { ORDER_STATUS_LABEL, type OrderDetail } from "@aib/shared";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, DownloadIcon, FileTextIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { cancelOrder, declareTransfer, getOrder } from "@/lib/account";
import { ApiRequestError } from "@/lib/api";
import { formatDateTime } from "@/lib/date";
import { formatNaira } from "@/lib/money";

const DELIVERY_LABEL: Record<OrderDetail["deliveryMethod"], string> = {
  PICKUP: "Pickup at the shop",
  LOCAL_DELIVERY: "Delivery in Birnin Kebbi",
  NATIONWIDE: "Nationwide delivery",
};

const PAYMENT_LABEL: Record<OrderDetail["paymentMethod"], string> = {
  BANK_TRANSFER: "Bank transfer",
  PAY_ON_DELIVERY: "Pay on delivery or at pickup",
};

/** One order, with its timeline and whatever the customer can still do about it (S-11). */
export function OrderDetailView({ orderNumber }: { orderNumber: string }) {
  const queryClient = useQueryClient();
  const [transferOpen, setTransferOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: () => getOrder(orderNumber),
    retry: false,
  });

  async function run(action: () => Promise<OrderDetail>, message: string) {
    setBusy(true);
    try {
      const updated = await action();
      queryClient.setQueryData(["order", orderNumber], updated);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(message);
      setTransferOpen(false);
      setCancelOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "That did not work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="grid gap-4">
        <h2 className="text-h2 text-brand-navy">We cannot find that order</h2>
        <p className="text-body-sm text-text-muted">Check the order number, or look through your orders.</p>
        <div>
          <Button asChild variant="outline">
            <Link href="/account/orders">Back to my orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  const canDeclareTransfer = order.paymentMethod === "BANK_TRANSFER" && order.status === "PENDING_PAYMENT";
  const canCancel = order.status === "PENDING_PAYMENT" || order.status === "AWAITING_CONFIRMATION";

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Link
          href="/account/orders"
          className="inline-flex w-fit items-center gap-1.5 text-body-sm text-text-muted hover:text-brand-primary"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          My orders
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h2 numeric text-brand-navy">{order.orderNumber}</h2>
          <StatusBadge status={order.status} />
        </div>
        <p className="text-body-sm text-text-muted">Placed {formatDateTime(order.placedAt)}</p>
      </div>

      {canDeclareTransfer || canCancel ? (
        <div className="flex flex-wrap gap-2">
          {canDeclareTransfer ? (
            <Button data-testid="declare-transfer" onClick={() => setTransferOpen(true)}>
              I&apos;ve made the transfer
            </Button>
          ) : null}
          {canCancel ? (
            <Button variant="outline" data-testid="cancel-order" onClick={() => setCancelOpen(true)}>
              Cancel order
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="grid content-start gap-6">
          <section className="grid gap-3">
            <h3 className="text-h3 text-brand-navy">Items</h3>
            <ul className="grid gap-3">
              {order.items.map((item) => (
                <li
                  key={`${item.productId}:${item.variantId}`}
                  className="flex gap-3 rounded-md border border-grey-200 bg-white p-3"
                >
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-grey-50">
                    {item.image ? (
                      <Image src={item.image} alt="" fill sizes="64px" className="object-contain p-1" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/product/${item.slug}`}
                      className="text-body-sm font-medium text-brand-navy hover:text-brand-primary"
                    >
                      {item.name}
                    </Link>
                    <span className="block text-caption text-text-muted">
                      {item.variantLabel} · ×{item.qty}
                    </span>
                  </span>
                  <span className="text-body-sm font-semibold numeric text-brand-navy">
                    {formatNaira(item.lineTotalKobo)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-3">
            <h3 className="text-h3 text-brand-navy">Progress</h3>
            <ol className="grid gap-0">
              {order.statusHistory.map((event, index) => (
                <li key={`${event.status}-${event.at}`} className="grid grid-cols-[auto_1fr] gap-x-3">
                  <div className="flex flex-col items-center">
                    <span
                      aria-hidden="true"
                      className={
                        index === order.statusHistory.length - 1
                          ? "mt-1.5 size-3 rounded-full bg-brand-primary"
                          : "mt-1.5 size-3 rounded-full border-2 border-grey-300 bg-white"
                      }
                    />
                    {index < order.statusHistory.length - 1 ? (
                      <span aria-hidden="true" className="w-px flex-1 bg-grey-200" />
                    ) : null}
                  </div>
                  <div className="pb-5">
                    <p className="text-body-sm font-medium text-brand-navy">
                      {ORDER_STATUS_LABEL[event.status]}
                    </p>
                    <p className="text-caption text-text-muted">
                      {formatDateTime(event.at)} · {event.by}
                    </p>
                    {event.note ? <p className="mt-1 text-caption text-text-muted">{event.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {order.hasInvoice ? (
            <section className="grid gap-2">
              <h3 className="text-h3 text-brand-navy">Invoice</h3>
              <div>
                <Button asChild variant="outline" className="gap-2">
                  <a href={`/api/v1/orders/${order.orderNumber}/invoice.pdf`}>
                    <DownloadIcon aria-hidden="true" className="size-4" />
                    Download invoice
                  </a>
                </Button>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="grid content-start gap-4">
          <div className="grid gap-3 rounded-md border border-grey-200 bg-white p-4">
            <h3 className="text-h4 text-brand-navy">Summary</h3>
            <dl className="grid gap-2 text-body-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">Subtotal</dt>
                <dd className="numeric">{formatNaira(order.subtotalKobo)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Delivery</dt>
                <dd className="numeric">
                  {order.deliveryFeeKobo === 0 ? "Free" : formatNaira(order.deliveryFeeKobo)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-grey-200 pt-2 font-semibold">
                <dt>Total</dt>
                <dd className="numeric" data-testid="order-total">
                  {formatNaira(order.totalKobo)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-2 rounded-md border border-grey-200 bg-white p-4 text-body-sm">
            <h3 className="text-h4 text-brand-navy">Delivery</h3>
            <p className="text-text-muted">{DELIVERY_LABEL[order.deliveryMethod]}</p>
            {order.shippingAddress ? (
              <address className="text-text-muted not-italic">
                {order.shippingAddress.fullName}
                <br />
                {order.shippingAddress.line1}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}
                <br />
                <span className="numeric">{order.shippingAddress.phone}</span>
              </address>
            ) : null}
          </div>

          <div className="grid gap-2 rounded-md border border-grey-200 bg-white p-4 text-body-sm">
            <h3 className="text-h4 text-brand-navy">Payment</h3>
            <p className="text-text-muted">{PAYMENT_LABEL[order.paymentMethod]}</p>
            <p className="text-text-muted">
              Status: <span className="font-medium text-brand-navy">{order.paymentStatus.toLowerCase()}</span>
            </p>
            {order.customerTransferRef ? (
              <p className="text-caption numeric text-text-muted">Reference {order.customerTransferRef}</p>
            ) : null}
          </div>

          {order.note ? (
            <div className="grid gap-2 rounded-md border border-grey-200 bg-white p-4 text-body-sm">
              <h3 className="flex items-center gap-2 text-h4 text-brand-navy">
                <FileTextIcon aria-hidden="true" className="size-4" />
                Your note
              </h3>
              <p className="text-text-muted">{order.note}</p>
            </div>
          ) : null}
        </aside>
      </div>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tell us you have paid</DialogTitle>
            <DialogDescription>
              We will check for your transfer and confirm the order. This usually takes a few minutes during
              shop hours.
            </DialogDescription>
          </DialogHeader>

          <Field
            label="Transfer reference (optional)"
            hint="Anything your bank showed you — it helps us find it."
          >
            {(control) => (
              <Input
                {...control}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="e.g. GTB/0012345"
              />
            )}
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              Not yet
            </Button>
            <Button
              loading={busy}
              data-testid="confirm-transfer"
              onClick={() =>
                void run(
                  () => declareTransfer(order.orderNumber, reference.trim() || undefined),
                  "Thank you — we will confirm your payment shortly",
                )
              }
            >
              I have paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              The items go back on the shelf and nothing is charged. You can order again any time.
            </DialogDescription>
          </DialogHeader>

          <Field label="Reason (optional)">
            {(control) => (
              <Input
                {...control}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Changed my mind"
              />
            )}
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep my order
            </Button>
            <Button
              variant="danger"
              loading={busy}
              data-testid="confirm-cancel"
              onClick={() =>
                void run(
                  () => cancelOrder(order.orderNumber, reason.trim() || undefined),
                  "Your order is cancelled",
                )
              }
            >
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
