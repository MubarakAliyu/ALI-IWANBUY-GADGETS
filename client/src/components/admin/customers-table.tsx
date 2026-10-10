"use client";

import { useState } from "react";
import type { AdminCustomerRow, Permission } from "@aib/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserRoundXIcon, UsersIcon } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { setCustomerStatus, type Paginated } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { formatNaira } from "@/lib/money";

/**
 * Customers (A-9).
 *
 * `spendKobo` is null for a staff member, so the column simply is not built for them — and because the server
 * never sent the figure, there is nothing in the page source either.
 */
export function CustomersTable({
  result,
  permissions,
  exportHref,
}: {
  result: Paginated<AdminCustomerRow>;
  permissions: Set<Permission>;
  exportHref: string;
}) {
  const router = useRouter();
  const [changing, setChanging] = useState<AdminCustomerRow | null>(null);

  const canSeeSpend = permissions.has("customers.spend");
  const canManage = permissions.has("customers.manage");

  const columns: DataTableColumn<AdminCustomerRow>[] = [
    {
      id: "name",
      header: "Customer",
      sortKey: "name",
      cell: ({ row }) => (
        <span className="grid">
          <span className="truncate font-semibold text-brand-navy">{row.original.name}</span>
          <span className="truncate text-caption text-text-muted">{row.original.email}</span>
        </span>
      ),
    },
    { id: "phone", header: "Phone", cell: ({ row }) => row.original.phone || "—" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.status === "ACTIVE" ? (
          <Badge variant="paid">Active</Badge>
        ) : (
          <Badge variant="cancelled">Suspended</Badge>
        ),
    },
    {
      id: "orders",
      header: "Orders",
      numeric: true,
      cell: ({ row }) => (
        <Link
          href={`/admin/orders?q=${encodeURIComponent(row.original.email)}`}
          className="font-semibold text-brand-navy hover:text-brand-primary"
        >
          {row.original.orders}
        </Link>
      ),
    },
    ...(canSeeSpend
      ? [
          {
            id: "spendKobo",
            header: "Spent",
            numeric: true,
            cell: ({ row }) => (
              <span className="font-semibold">{formatNaira(row.original.spendKobo ?? 0)}</span>
            ),
          } satisfies DataTableColumn<AdminCustomerRow>,
        ]
      : []),
    {
      id: "createdAt",
      header: "Joined",
      sortKey: "createdAt",
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.createdAt)}</span>,
    },
    ...(canManage
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }) => (
              <Button variant="outline" size="sm" onClick={() => setChanging(row.original)}>
                {row.original.status === "ACTIVE" ? "Suspend" : "Reactivate"}
              </Button>
            ),
          } satisfies DataTableColumn<AdminCustomerRow>,
        ]
      : []),
  ];

  return (
    <div className="grid gap-4">
      <AdminFilterBar
        searchLabel="Search customers"
        searchPlaceholder="Name, email or phone…"
        exportHref={exportHref}
        selects={[
          {
            name: "status",
            label: "Status",
            options: [
              { value: "ACTIVE", label: "Active" },
              { value: "SUSPENDED", label: "Suspended" },
            ],
          },
        ]}
      />

      <DataTable
        caption="Customers"
        columns={columns}
        rows={result.data}
        total={result.total}
        page={result.page}
        pages={result.pages}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={<UsersIcon aria-hidden="true" />}
            title="No customers match that"
            description="Try a different search, or clear the filters."
          />
        }
      />

      <StatusDialog customer={changing} onClose={() => setChanging(null)} onDone={router.refresh} />
    </div>
  );
}

function StatusDialog({
  customer,
  onClose,
  onDone,
}: {
  customer: AdminCustomerRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const suspending = customer?.status === "ACTIVE";

  async function submit() {
    if (!customer) {
      return;
    }
    setBusy(true);
    try {
      await setCustomerStatus(customer.id, {
        status: suspending ? "SUSPENDED" : "ACTIVE",
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      toast.success(`${customer.name} ${suspending ? "suspended" : "reactivated"}`);
      setReason("");
      onClose();
      onDone();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={customer !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {suspending ? "Suspend" : "Reactivate"} {customer?.name}
          </DialogTitle>
          <DialogDescription>
            {suspending
              ? "They will be signed out everywhere and cannot sign in or order until they are reactivated. Their past orders are untouched."
              : "They will be able to sign in and order again."}
          </DialogDescription>
        </DialogHeader>

        {suspending ? (
          <Field label="Why?" hint="For the audit trail. The customer does not see it.">
            {(control) => (
              <Input
                {...control}
                value={reason}
                maxLength={200}
                placeholder="Repeated chargebacks"
                onChange={(event) => setReason(event.target.value)}
              />
            )}
          </Field>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={suspending ? "danger" : "primary"}
            loading={busy}
            onClick={() => void submit()}
          >
            {suspending ? (
              <>
                <UserRoundXIcon aria-hidden="true" className="size-4" />
                Suspend the account
              </>
            ) : (
              "Reactivate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
