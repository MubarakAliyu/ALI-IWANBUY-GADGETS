"use client";

import { useState } from "react";
import type { OrderStatus, Permission } from "@aib/shared";
import { ORDER_STATUS_LABEL } from "@aib/shared";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircleIcon, ArrowRightIcon, BanIcon, RotateCcwIcon } from "lucide-react";
import { ConfirmPaymentDialog } from "@/components/admin/confirm-payment-dialog";
import { PinInput } from "@/components/admin/pin-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { advanceOrder, cancelAdminOrder, refundAdminOrder, type AdminOrderDetail } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";
import { formatNaira } from "@/lib/money";

/**
 * Everything an admin can do to an order (A-4).
 *
 * Only the moves the lifecycle allows are offered, and the list comes from the server with the order — the
 * dashboard does not keep its own copy of the rules. A button missing here is a convenience; the server would
 * refuse the request anyway.
 */
export function OrderActions({
  order,
  permissions,
}: {
  order: AdminOrderDetail;
  permissions: Set<Permission>;
}) {
  const router = useRouter();

  const paid = order.paymentStatus === "PAID";
  const canConfirm = permissions.has("payments.confirm") && !paid && order.paymentStatus !== "REFUNDED";
  const canCancel = permissions.has("orders.cancel") && !["CANCELLED", "REFUNDED"].includes(order.status);
  const canRefund = permissions.has("orders.refund") && paid && order.status !== "REFUNDED";
  const nextStatuses = order.nextStatuses.filter(
    (status) => status !== "CANCELLED" && status !== "REFUNDED",
  ) as OrderStatus[];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canConfirm ? (
        <ConfirmPaymentDialog
          orderNumber={order.orderNumber}
          totalKobo={order.totalKobo}
          suggestedReference={order.customerTransferRef}
        />
      ) : null}

      {permissions.has("orders.fulfil") && nextStatuses.length > 0 ? (
        <AdvanceDialog orderNumber={order.orderNumber} statuses={nextStatuses} onDone={router.refresh} />
      ) : null}

      {canRefund ? <RefundDialog order={order} onDone={router.refresh} /> : null}
      {canCancel ? <CancelDialog order={order} requiresPin={paid} onDone={router.refresh} /> : null}
    </div>
  );
}

/** The error banner every one of these dialogs shows. */
function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-tint p-3 text-body-sm text-danger-text"
    >
      <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

function AdvanceDialog({
  orderNumber,
  statuses,
  onDone,
}: {
  orderNumber: string;
  statuses: OrderStatus[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OrderStatus>(statuses[0] as OrderStatus);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await advanceOrder(orderNumber, { status, ...(note.trim() ? { note: note.trim() } : {}) });
      setOpen(false);
      setNote("");
      toast.success(`${orderNumber} is now ${ORDER_STATUS_LABEL[status].toLowerCase()}`, {
        description: "The customer has been emailed.",
      });
      onDone();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "We could not move that order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowRightIcon aria-hidden="true" className="size-4" />
          Move on
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move {orderNumber} along</DialogTitle>
          <DialogDescription>
            The customer is emailed when the order changes, so the note is worth writing.
          </DialogDescription>
        </DialogHeader>

        <FormError message={error} />

        <div className="grid gap-4">
          <Field label="New status">
            {(control) => (
              <select
                {...control}
                value={status}
                onChange={(event) => setStatus(event.target.value as OrderStatus)}
                className="h-10 rounded-md border border-grey-200 bg-white px-3 text-body-sm text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
              >
                {statuses.map((option) => (
                  <option key={option} value={option}>
                    {ORDER_STATUS_LABEL[option]}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Note for the customer (optional)">
            {(control) => (
              <Input
                {...control}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ready at the shop from 10am"
                maxLength={400}
              />
            )}
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy} loadingLabel="Saving…">
            Move to {ORDER_STATUS_LABEL[status]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  order,
  requiresPin,
  onDone,
}: {
  order: AdminOrderDetail;
  requiresPin: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await cancelAdminOrder(order.orderNumber, {
        reason: reason.trim(),
        ...(requiresPin ? { pin } : {}),
      });
      setOpen(false);
      setReason("");
      setPin("");
      toast.success(`${order.orderNumber} cancelled`, { description: "The stock has gone back on the shelf." });
      onDone();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "We could not cancel that order.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BanIcon aria-hidden="true" className="size-4" />
          Cancel order
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {order.orderNumber}</DialogTitle>
          <DialogDescription>
            The stock goes back on the shelf and the customer is emailed your reason.
            {requiresPin
              ? " This order has been paid for, so your PIN is needed — and the money still has to be sent back by hand."
              : ""}
          </DialogDescription>
        </DialogHeader>

        <FormError message={error} />

        <div className="grid gap-4">
          <Field label="Why is it being cancelled?">
            {(control) => (
              <Input
                {...control}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Customer could not pay"
                maxLength={400}
              />
            )}
          </Field>

          {requiresPin ? (
            <Field label="Your payment PIN">
              {(control) => (
                <PinInput {...control} value={pin} onChange={(event) => setPin(event.target.value)} />
              )}
            </Field>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            onClick={() => void submit()}
            disabled={reason.trim().length < 3 || (requiresPin && pin.length < 4)}
            loading={busy}
            loadingLabel="Cancelling…"
          >
            Cancel the order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefundDialog({ order, onDone }: { order: AdminOrderDetail; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await refundAdminOrder(order.orderNumber, { reason: reason.trim(), pin });
      setOpen(false);
      setReason("");
      setPin("");
      toast.success(`${order.orderNumber} refunded`, {
        description: "Send the money back from the bank app — this records it, it does not move it.",
      });
      onDone();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "We could not record that refund.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RotateCcwIcon aria-hidden="true" className="size-4" />
          Refund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund {formatNaira(order.totalKobo)}</DialogTitle>
          <DialogDescription>
            This records the refund against {order.orderNumber} and puts the stock back. It does not move any
            money — send that from the bank app yourself.
          </DialogDescription>
        </DialogHeader>

        <FormError message={error} />

        <div className="grid gap-4">
          <Field label="Why is it being refunded?">
            {(control) => (
              <Input
                {...control}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Faulty on arrival"
                maxLength={400}
              />
            )}
          </Field>

          <Field label="Your payment PIN">
            {(control) => (
              <PinInput {...control} value={pin} onChange={(event) => setPin(event.target.value)} />
            )}
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void submit()}
            disabled={reason.trim().length < 3 || pin.length < 4}
            loading={busy}
            loadingLabel="Recording…"
          >
            Record the refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
