"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, CopyIcon, PackageIcon, StoreIcon } from "lucide-react";
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
import { declareTransfer, getCheckoutSettings, getOrder } from "@/lib/account";
import { ApiRequestError } from "@/lib/api";
import { formatNaira } from "@/lib/money";
import { SITE } from "@/lib/site";

/**
 * The page after an order is placed (S-10). For a bank transfer it is the only place the customer is told
 * where to send money, so the account details, the exact amount and the narration are all copyable — a
 * mistyped account number is a lost payment.
 */
export function OrderSuccessView({ orderNumber }: { orderNumber: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: () => getOrder(orderNumber),
    retry: false,
  });
  const { data: settings } = useQuery({ queryKey: ["checkout-settings"], queryFn: getCheckoutSettings });

  async function copy(value: string, what: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Your browser would not let us copy that — please select it by hand.");
    }
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!order) {
    return (
      <div className="grid justify-items-center gap-4 text-center">
        <h1 className="text-h1 text-brand-navy">We cannot find that order</h1>
        <Button asChild variant="outline">
          <Link href="/account/orders">My orders</Link>
        </Button>
      </div>
    );
  }

  const awaitingTransfer = order.paymentMethod === "BANK_TRANSFER" && order.status === "PENDING_PAYMENT";
  const bankMissing = !settings?.bank.accountNumber || settings.bank.accountNumber.startsWith("UPDATE");

  return (
    <div className="mx-auto grid max-w-2xl gap-8">
      <div className="grid justify-items-center gap-3 text-center">
        <CheckCircle2Icon aria-hidden="true" className="size-12 text-success" />
        <h1 className="text-h1 text-brand-navy">Thank you — we have your order</h1>
        <p className="text-body text-text-muted">A confirmation is on its way to your email.</p>

        <p className="flex items-center gap-2 rounded-md border border-grey-200 bg-grey-50 px-4 py-2">
          <span className="text-h3 numeric text-brand-navy" data-testid="order-number">
            {order.orderNumber}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Copy the order number"
            onClick={() => void copy(order.orderNumber, "Order number")}
          >
            <CopyIcon aria-hidden="true" className="size-4" />
          </Button>
        </p>
      </div>

      {order.paymentMethod === "BANK_TRANSFER" ? (
        <section className="grid gap-4 rounded-lg border border-grey-200 bg-white p-6">
          <h2 className="text-h3 text-brand-navy">How to pay</h2>

          {bankMissing ? (
            <p className="rounded-md bg-warning-tint p-3 text-body-sm text-warning-text">
              Our bank details are not published yet. Please call or WhatsApp{" "}
              <a href={SITE.phoneHref} className="font-semibold underline underline-offset-4">
                {SITE.phone}
              </a>{" "}
              and we will give you the account over the phone.
            </p>
          ) : (
            <dl className="grid gap-3">
              <CopyRow label="Bank" value={settings.bank.bankName} onCopy={copy} />
              <CopyRow label="Account name" value={settings.bank.accountName} onCopy={copy} />
              <CopyRow label="Account number" value={settings.bank.accountNumber} onCopy={copy} numeric />
              <CopyRow label="Amount" value={formatNaira(order.totalKobo)} onCopy={copy} numeric />
              <CopyRow label="Narration" value={order.orderNumber} onCopy={copy} numeric />
            </dl>
          )}

          <p className="text-body-sm text-text-muted">
            Use your order number as the transfer narration — it is how we match your payment to this order.
          </p>

          {awaitingTransfer ? (
            <div>
              <Button size="hero" data-testid="declare-transfer" onClick={() => setOpen(true)}>
                I&apos;ve made the transfer
              </Button>
            </div>
          ) : (
            <p className="rounded-md bg-primary-50 p-3 text-body-sm text-brand-navy">
              Thank you — we are checking for your payment now.
            </p>
          )}
        </section>
      ) : (
        <section className="grid gap-3 rounded-lg border border-grey-200 bg-white p-6">
          <h2 className="text-h3 text-brand-navy">What happens next</h2>
          <p className="flex items-start gap-3 text-body-sm text-text-muted">
            <PackageIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-primary" />
            We are preparing your order. You will pay {formatNaira(order.totalKobo)} when it reaches you.
          </p>
          {order.deliveryMethod === "PICKUP" ? (
            <p className="flex items-start gap-3 text-body-sm text-text-muted">
              <StoreIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-primary" />
              Collect it at {settings?.pickupAddress ?? SITE.shopAddress}, Monday to Saturday, 9:00 to 18:00.
            </p>
          ) : null}
        </section>
      )}

      <section className="grid gap-3 rounded-lg border border-grey-200 bg-white p-6">
        <h2 className="text-h3 text-brand-navy">Your order</h2>
        <ul className="grid gap-2">
          {order.items.map((item) => (
            <li
              key={`${item.productId}:${item.variantId}`}
              className="flex justify-between gap-3 text-body-sm"
            >
              <span className="text-brand-navy">
                {item.name}
                <span className="text-text-muted">
                  {" "}
                  · {item.variantLabel} · ×{item.qty}
                </span>
              </span>
              <span className="shrink-0 font-semibold numeric">{formatNaira(item.lineTotalKobo)}</span>
            </li>
          ))}
        </ul>

        <dl className="grid gap-2 border-t border-grey-200 pt-3 text-body-sm">
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
          <div className="flex justify-between text-h4">
            <dt>Total</dt>
            <dd className="numeric">{formatNaira(order.totalKobo)}</dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href={`/account/orders/${order.orderNumber}`}>Track this order</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/shop">Keep shopping</Link>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tell us you have paid</DialogTitle>
            <DialogDescription>
              We will look for your transfer and confirm the order, usually within a few minutes during shop
              hours.
            </DialogDescription>
          </DialogHeader>

          <Field label="Transfer reference (optional)" hint="Anything your bank showed you helps us find it.">
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              Not yet
            </Button>
            <Button
              loading={busy}
              data-testid="confirm-transfer"
              onClick={async () => {
                setBusy(true);
                try {
                  const updated = await declareTransfer(order.orderNumber, reference.trim() || undefined);
                  queryClient.setQueryData(["order", orderNumber], updated);
                  setOpen(false);
                  toast.success("Thank you — we will confirm your payment shortly");
                } catch (error) {
                  toast.error(
                    error instanceof ApiRequestError ? error.message : "That did not work. Please try again.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              I have paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CopyRow({
  label,
  value,
  numeric,
  onCopy,
}: {
  label: string;
  value: string;
  numeric?: boolean;
  onCopy: (value: string, what: string) => Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-grey-200 pb-2 last:border-0 last:pb-0">
      <dt className="text-body-sm text-text-muted">{label}</dt>
      <dd className="flex items-center gap-2">
        <span className={numeric ? "text-body-sm font-semibold numeric" : "text-body-sm font-semibold"}>
          {value}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() => void onCopy(value, label)}
        >
          <CopyIcon aria-hidden="true" className="size-4" />
        </Button>
      </dd>
    </div>
  );
}
