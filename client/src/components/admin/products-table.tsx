"use client";

import { useState } from "react";
import type { AdminProductRow, Permission } from "@aib/shared";
import { PRODUCT_STATUS, PRODUCT_STATUS_LABEL } from "@aib/shared";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BoxesIcon, EyeIcon, EyeOffIcon, PackageIcon, PlusIcon } from "lucide-react";
import { AdminFilterBar, type FilterSelect } from "@/components/admin/admin-filter-bar";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StockDialog } from "@/components/admin/stock-dialog";
import { setProductStatus, type BrandRow, type CategoryRow, type Paginated } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { formatNaira } from "@/lib/money";

const STATUS_VARIANT = { ACTIVE: "paid", DRAFT: "pending", ARCHIVED: "cancelled" } as const;

/**
 * The products table (A-5).
 *
 * Selection is deliberately plain: checkboxes that pick rows on this page, and two bulk buttons. A shop with
 * forty products does not need "select everything matching this filter", and a bulk action that reaches rows
 * nobody has looked at is how a whole catalogue gets archived by accident.
 */
export function ProductsTable({
  result,
  categories,
  brands,
  permissions,
}: {
  result: Paginated<AdminProductRow>;
  categories: CategoryRow[];
  brands: BrandRow[];
  permissions: Set<Permission>;
}) {
  const router = useRouter();
  const canManage = permissions.has("products.manage");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [counting, setCounting] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function applyStatus(status: AdminProductRow["status"]) {
    setBusy(true);
    try {
      const { changed } = await setProductStatus({ ids: [...selected], status });
      toast.success(
        `${changed} product${changed === 1 ? "" : "s"} ${status === "ACTIVE" ? "made visible" : "hidden"}`,
      );
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  const allOnPage = result.data.length > 0 && result.data.every((row) => selected.has(row.id));

  const columns: DataTableColumn<AdminProductRow>[] = [
    ...(canManage
      ? [
          {
            id: "select",
            header: () => (
              <input
                type="checkbox"
                checked={allOnPage}
                aria-label={allOnPage ? "Clear the selection" : "Select every product on this page"}
                onChange={() =>
                  setSelected(allOnPage ? new Set() : new Set(result.data.map((row) => row.id)))
                }
                className="size-4 rounded-sm border-grey-300 accent-[#156FBF]"
              />
            ),
            cell: ({ row }) => (
              <input
                type="checkbox"
                checked={selected.has(row.original.id)}
                aria-label={`Select ${row.original.name}`}
                onChange={() => toggle(row.original.id)}
                className="size-4 rounded-sm border-grey-300 accent-[#156FBF]"
              />
            ),
          } satisfies DataTableColumn<AdminProductRow>,
        ]
      : []),
    {
      id: "name",
      header: "Product",
      sortKey: "name",
      cell: ({ row }) => (
        <span className="flex items-center gap-3">
          <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-grey-100">
            {row.original.image ? (
              <Image
                src={row.original.image}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
                unoptimized
              />
            ) : null}
          </span>
          <span className="grid min-w-0">
            <Link
              href={`/admin/products/${row.original.id}`}
              className="truncate font-semibold text-brand-navy hover:text-brand-primary"
            >
              {row.original.name}
            </Link>
            <span className="truncate text-caption text-text-muted">
              {row.original.brandName} · {row.original.categoryName}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]}>
          {PRODUCT_STATUS_LABEL[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "totalStock",
      header: "Stock",
      sortKey: "totalStock",
      numeric: true,
      cell: ({ row }) => (
        <span className="grid">
          <span
            className={
              row.original.totalStock === 0
                ? "font-semibold text-danger-text"
                : row.original.totalStock <= 3
                  ? "font-semibold text-warning-text"
                  : ""
            }
          >
            {row.original.totalStock}
          </span>
          <span className="text-caption text-text-muted">
            {row.original.variantCount} variant{row.original.variantCount === 1 ? "" : "s"}
          </span>
        </span>
      ),
    },
    {
      id: "priceFromKobo",
      header: "From",
      sortKey: "priceFromKobo",
      numeric: true,
      cell: ({ row }) => <span className="font-semibold">{formatNaira(row.original.priceFromKobo)}</span>,
    },
    {
      id: "updatedAt",
      header: "Updated",
      sortKey: "updatedAt",
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.updatedAt)}</span>,
    },
    ...(permissions.has("products.stock")
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCounting({ id: row.original.id, name: row.original.name })}
              >
                <PackageIcon aria-hidden="true" className="size-4" />
                Stock
              </Button>
            ),
          } satisfies DataTableColumn<AdminProductRow>,
        ]
      : []),
  ];

  const selects: FilterSelect[] = [
    {
      name: "status",
      label: "Status",
      options: PRODUCT_STATUS.map((status) => ({ value: status, label: PRODUCT_STATUS_LABEL[status] })),
    },
    {
      name: "stock",
      label: "Stock",
      options: [
        { value: "in", label: "In stock" },
        { value: "low", label: "Running low" },
        { value: "out", label: "Sold out" },
      ],
    },
    {
      name: "category",
      label: "Category",
      options: categories.map((category) => ({
        value: category.id,
        label: category.parentName ? `${category.parentName} › ${category.name}` : category.name,
      })),
    },
    {
      name: "brand",
      label: "Brand",
      options: brands.map((brand) => ({ value: brand.id, label: brand.name })),
    },
  ];

  return (
    <div className="grid gap-4">
      <AdminFilterBar
        searchLabel="Search products"
        searchPlaceholder="Name, brand or SKU…"
        selects={selects}
      />

      {selected.size > 0 ? (
        <div
          role="group"
          aria-label="Bulk actions"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3"
        >
          <p className="text-body-sm font-semibold text-brand-navy">
            {selected.size} selected on this page
          </p>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" loading={busy} onClick={() => void applyStatus("ACTIVE")}>
              <EyeIcon aria-hidden="true" className="size-4" />
              Make visible
            </Button>
            <Button size="sm" variant="outline" loading={busy} onClick={() => void applyStatus("ARCHIVED")}>
              <EyeOffIcon aria-hidden="true" className="size-4" />
              Archive
            </Button>
          </div>
        </div>
      ) : null}

      <DataTable
        caption="Products"
        columns={columns}
        rows={result.data}
        total={result.total}
        page={result.page}
        pages={result.pages}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={<BoxesIcon aria-hidden="true" />}
            title="No products match that"
            description="Try a different search, or clear the filters to see the whole catalogue."
            action={
              canManage ? (
                <Button asChild>
                  <Link href="/admin/products/new">
                    <PlusIcon aria-hidden="true" className="size-4" />
                    Add a product
                  </Link>
                </Button>
              ) : null
            }
          />
        }
      />

      <StockDialog
        productId={counting?.id ?? null}
        productName={counting?.name ?? ""}
        open={counting !== null}
        onClose={() => setCounting(null)}
      />
    </div>
  );
}
