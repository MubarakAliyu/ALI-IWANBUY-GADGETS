"use client";

import { useState } from "react";
import { confirmPaymentSchema, type ConfirmPaymentFormInput } from "@aib/shared";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AlertCircleIcon, BanknoteIcon } from "lucide-react";
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
import { confirmOrderPayment } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/money";

/**
 * Confirming that money arrived (A-4).
 *
 * The amount is pre-filled with the order total and the shop confirms it rather than typing it, because the
 * server refuses anything else — a part payment is not a payment in v1, and a form that invites one only
 * invites an error message.
 *
 * A wrong PIN shakes the field and stays open: the usual case is a mistyped digit, and throwing the whole
 * dialog away would mean re-entering the reference too.
 */
export function ConfirmPaymentDialog({
  orderNumber,
  totalKobo,
  suggestedReference,
  disabled,
}: {
  orderNumber: string;
  totalKobo: number;
  suggestedReference: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const form = useForm<ConfirmPaymentFormInput>({
    resolver: zodResolver(confirmPaymentSchema),
    defaultValues: {
      amountKobo: totalKobo,
      reference: suggestedReference ?? "",
      note: "",
      pin: "",
    },
  });

  async function onSubmit(values: ConfirmPaymentFormInput) {
    setFormError(null);
    try {
      const result = await confirmOrderPayment(orderNumber, values);
      setOpen(false);
      form.reset({ amountKobo: totalKobo, reference: suggestedReference ?? "", note: "", pin: "" });
      toast.success(`Payment confirmed — invoice ${result.invoiceNumber}`, {
        description: "The customer has been emailed a receipt.",
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "We could not confirm that payment.";
      setFormError(message);
      form.setValue("pin", "");

      if (error instanceof ApiRequestError && error.code === "PIN_INCORRECT") {
        setShake(true);
        window.setTimeout(() => setShake(false), 500);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <BanknoteIcon aria-hidden="true" className="size-4" />
          Confirm payment
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm payment for {orderNumber}</DialogTitle>
          <DialogDescription>
            Check the money has actually landed in the {formatNaira(totalKobo)} account before you confirm.
            This issues an invoice and emails the customer.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-tint p-3 text-body-sm text-danger-text"
          >
            <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {formError}
          </p>
        ) : null}

        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="rounded-md bg-grey-50 p-3">
            <p className="text-caption text-text-muted">Amount to confirm</p>
            <p className="text-h2 font-bold text-brand-navy tabular-nums">{formatNaira(totalKobo)}</p>
          </div>

          {/* The amount is fixed to the total — carried in the form so the API gets it, not typed by hand. */}
          <input type="hidden" {...form.register("amountKobo", { valueAsNumber: true })} />

          <Field
            label="Payment reference"
            hint="The transfer reference from the bank app, if there is one."
            error={form.formState.errors.reference?.message}
          >
            {(control) => <Input {...control} {...form.register("reference")} placeholder="MNP-884412" />}
          </Field>

          <Field label="Note (optional)" error={form.formState.errors.note?.message}>
            {(control) => <Input {...control} {...form.register("note")} placeholder="Paid at the counter" />}
          </Field>

          <Field label="Your payment PIN" error={form.formState.errors.pin?.message}>
            {(control) => (
              <PinInput
                {...control}
                {...form.register("pin")}
                className={cn(shake && "animate-[shake_0.4s_ease-in-out] border-danger-border")}
              />
            )}
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting} loadingLabel="Confirming…">
              Confirm {formatNaira(totalKobo)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
