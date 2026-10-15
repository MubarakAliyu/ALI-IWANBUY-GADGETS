"use client";

import { useState } from "react";
import type { InvoiceRow } from "@aib/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BanIcon, DownloadIcon, FileTextIcon, MailIcon, MoreHorizontalIcon } from "lucide-react";
import { AdminFilterBar } from "@/components/admin/admin-filter-bar";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { invoicePdfHref, sendInvoice, voidInvoice, type Paginated } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { formatNaira } from "@/lib/money";

const STATUS_VARIANT = {
  ISSUED: "paid",
  SENT: "complete",
  VOID: "cancelled",
} as const;

/**
 * The invoices list (A-8). An invoice is never edited or deleted — it is sent, sent again, or voided with a
 * reason, and all three are recorded. This is the shop's accounting record, not a document editor.
 */
export function InvoicesTable({
  result,
  exportHref,
  canVoid,
}: {
  result: Paginated<InvoiceRow>;
  exportHref: string;
  canVoid: boolean;
}) {
  const router = useRouter();
  const [voiding, setVoiding] = useState<InvoiceRow | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  async function send(invoice: InvoiceRow) {
    setSending(invoice.invoiceNumber);
    try {
      const result = await sendInvoice(invoice.invoiceNumber);
      toast.success(`Sent to ${result.sentTo}`, {
        description:
          result.sentCount === 1
            ? "First time this invoice has gone out."
            : `Sent ${result.sentCount} times now.`,
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "We could not send that invoice.");
    } finally {
      setSending(null);
    }
  }

  const columns: DataTableColumn<InvoiceRow>[] = [
    {
      id: "invoiceNumber",
      header: "Invoice",
      cell: ({ row }) => <span className="font-semibold">{row.original.invoiceNumber}</span>,
    },
    {
      id: "issuedAt",
      header: "Issued",
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.issuedAt)}</span>,
    },
    {
      id: "orderNumber",
      header: "Order",
      cell: ({ row }) => (
        <Link
          href={`/admin/orders/${row.original.orderNumber}`}
          className="text-brand-navy hover:text-brand-primary"
        >
          {row.original.orderNumber}
        </Link>
      ),
    },
    {
      id: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <span className="grid">
          <span className="truncate">{row.original.customerName}</span>
          <span className="truncate text-caption text-text-muted">{row.original.customerEmail}</span>
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className="grid gap-0.5">
          <Badge variant={STATUS_VARIANT[row.original.status]}>
            {{ ISSUED: "Issued", SENT: "Sent", VOID: "Void" }[row.original.status]}
          </Badge>
          {row.original.sentCount > 0 ? (
            <span className="text-caption text-text-muted">
              {row.original.sentCount}× · last {formatDate(row.original.lastSentAt as string)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "totalKobo",
      header: "Total",
      numeric: true,
      cell: ({ row }) => <span className="font-semibold">{formatNaira(row.original.totalKobo)}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${row.original.invoiceNumber}`}
              className="inline-flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-grey-100 hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
            >
              <MoreHorizontalIcon aria-hidden="true" className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={invoicePdfHref(row.original.invoiceNumber)} target="_blank" rel="noreferrer">
                <DownloadIcon aria-hidden="true" className="size-4" />
                Open the PDF
              </a>
            </DropdownMenuItem>

            {row.original.status !== "VOID" ? (
              <DropdownMenuItem
                disabled={sending === row.original.invoiceNumber}
                onSelect={() => void send(row.original)}
              >
                <MailIcon aria-hidden="true" className="size-4" />
                {row.original.sentCount > 0 ? "Send it again" : "Send to the customer"}
              </DropdownMenuItem>
            ) : null}

            {canVoid && row.original.status !== "VOID" ? (
              <DropdownMenuItem onSelect={() => setVoiding(row.original)}>
                <BanIcon aria-hidden="true" className="size-4" />
                Void it
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="grid gap-4">
      <AdminFilterBar
        searchLabel="Search invoices"
        searchPlaceholder="Invoice number, order or customer…"
        exportHref={exportHref}
        selects={[
          {
            name: "status",
            label: "Status",
            options: [
              { value: "ISSUED", label: "Issued" },
              { value: "SENT", label: "Sent" },
              { value: "VOID", label: "Void" },
            ],
          },
        ]}
      />

      <DataTable
        caption="Invoices"
        columns={columns}
        rows={result.data}
        total={result.total}
        page={result.page}
        pages={result.pages}
        rowKey={(row) => row.invoiceNumber}
        empty={
          <EmptyState
            icon={<FileTextIcon aria-hidden="true" />}
            title="No invoices match that"
            description="An invoice is issued automatically whenever a payment is confirmed."
          />
        }
      />

      <VoidDialog invoice={voiding} onClose={() => setVoiding(null)} onDone={router.refresh} />
    </div>
  );
}

function VoidDialog({
  invoice,
  onClose,
  onDone,
}: {
  invoice: InvoiceRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!invoice) {
      return;
    }
    setBusy(true);
    try {
      await voidInvoice(invoice.invoiceNumber, { reason: reason.trim() });
      toast.success(`${invoice.invoiceNumber} voided`);
      setReason("");
      onClose();
      onDone();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "We could not void that invoice.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={invoice !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void {invoice?.invoiceNumber}</DialogTitle>
          <DialogDescription>
            A voided invoice stays on the record with your reason beside it — nothing is deleted. It can no
            longer be sent to the customer.
          </DialogDescription>
        </DialogHeader>

        <Field label="Why is it being voided?">
          {(control) => (
            <Input
              {...control}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Issued against the wrong order"
              maxLength={400}
            />
          )}
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep it
          </Button>
          <Button
            variant="danger"
            disabled={reason.trim().length < 3}
            loading={busy}
            loadingLabel="Voiding…"
            onClick={() => void submit()}
          >
            Void the invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
