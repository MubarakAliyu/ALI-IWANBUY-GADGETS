"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createBrand,
  createCategory,
  deleteBrand,
  deleteCategory,
  reorderCategories,
  updateBrand,
  updateCategory,
  type BrandRow,
  type CategoryRow,
} from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";

/**
 * Categories and brands on one page (A-6).
 *
 * Both lists say how many products are in each row, because the only question that matters before changing
 * one is "what does this affect". Deleting is offered but the server refuses while anything is using it, and
 * the dialog says so rather than hiding the button — a disabled button with no explanation is worse than a
 * refusal with a reason.
 */
export function CatalogueManager({
  categories,
  brands,
  canManage,
}: {
  categories: CategoryRow[];
  brands: BrandRow[];
  canManage: boolean;
}) {
  return (
    <Tabs defaultValue="categories">
      <TabsList>
        <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
        <TabsTrigger value="brands">Brands ({brands.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="categories">
        <CategoriesPanel rows={categories} canManage={canManage} />
      </TabsContent>

      <TabsContent value="brands">
        <BrandsPanel rows={brands} canManage={canManage} />
      </TabsContent>
    </Tabs>
  );
}

function CategoriesPanel({ rows, canManage }: { rows: CategoryRow[]; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryRow | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const parents = rows.filter((row) => row.parent === null);

  async function move(index: number, by: -1 | 1) {
    const target = index + by;
    if (target < 0 || target >= rows.length) {
      return;
    }
    const ids = rows.map((row) => row.id);
    const moved = ids[index] as string;
    ids[index] = ids[target] as string;
    ids[target] = moved;

    setBusy(true);
    try {
      await reorderCategories(ids);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: CategoryRow) {
    setBusy(true);
    try {
      await deleteCategory(row.id);
      toast.success(`${row.name} deleted`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      {canManage ? (
        <Button className="w-fit" onClick={() => setEditing("new")}>
          <PlusIcon aria-hidden="true" className="size-4" />
          Add a category
        </Button>
      ) : null}

      <ul className="divide-y divide-grey-200 rounded-lg border border-grey-200 bg-white">
        {rows.map((row, index) => (
          <li key={row.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1 grid gap-0.5">
              <span className="flex items-center gap-2">
                {row.parentName ? (
                  <span className="text-caption text-text-muted">{row.parentName} ›</span>
                ) : null}
                <span className="font-semibold text-brand-navy">{row.name}</span>
                {row.isActive ? null : <Badge variant="cancelled">Hidden</Badge>}
              </span>
              <span className="text-caption text-text-muted">
                /{row.slug} · {row.productCount} product{row.productCount === 1 ? "" : "s"}
              </span>
            </div>

            {canManage ? (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${row.name} up`}
                  disabled={index === 0 || busy}
                  onClick={() => void move(index, -1)}
                >
                  <ArrowUpIcon aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${row.name} down`}
                  disabled={index === rows.length - 1 || busy}
                  onClick={() => void move(index, 1)}
                >
                  <ArrowDownIcon aria-hidden="true" className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Edit ${row.name}`} onClick={() => setEditing(row)}>
                  <PencilIcon aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${row.name}`}
                  disabled={busy}
                  onClick={() => void remove(row)}
                >
                  <Trash2Icon aria-hidden="true" className="size-4 text-danger-text" />
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <CategoryDialog
        row={editing}
        parents={parents}
        onClose={() => setEditing(null)}
        onDone={router.refresh}
      />
    </div>
  );
}

function CategoryDialog({
  row,
  parents,
  onClose,
  onDone,
}: {
  row: CategoryRow | "new" | null;
  parents: CategoryRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const existing = row === "new" ? null : row;
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keyed on the row, so opening the dialog for a different category starts from that category's values.
  const key = existing?.id ?? "new";

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        parent: parent || null,
        sortOrder: existing?.sortOrder ?? 0,
        isActive,
      };
      if (existing) {
        await updateCategory(existing.id, payload);
      } else {
        await createCategory(payload);
      }
      toast.success(existing ? `${payload.name} saved` : `${payload.name} added`);
      onClose();
      onDone();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={row !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          return;
        }
        setName(existing?.name ?? "");
        setParent(existing?.parent ?? "");
        setIsActive(existing?.isActive ?? true);
        setError(null);
      }}
    >
      <DialogContent key={key}>
        <DialogHeader>
          <DialogTitle>{existing ? `Edit ${existing.name}` : "Add a category"}</DialogTitle>
          <DialogDescription>
            Categories go two levels deep — a top-level one, optionally with categories inside it.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="rounded-md bg-danger-tint p-3 text-body-sm text-danger-text">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4">
          <Field label="Name">
            {(control) => (
              <Input
                {...control}
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
              />
            )}
          </Field>

          <Field label="Inside" hint="Leave as “Nothing” for a top-level category.">
            {(control) => (
              <select
                {...control}
                value={parent}
                onChange={(event) => setParent(event.target.value)}
                className="h-11 rounded-md border border-grey-200 bg-white px-3 text-body-sm text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
              >
                <option value="">Nothing — it is top level</option>
                {parents
                  .filter((option) => option.id !== existing?.id)
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
              </select>
            )}
          </Field>

          <label className="flex items-center gap-2 text-body-sm text-brand-navy">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="size-4 rounded-sm border-grey-300 accent-[#156FBF]"
            />
            Show it in the shop
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={name.trim().length < 2} loading={busy} onClick={() => void submit()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BrandsPanel({ rows, canManage }: { rows: BrandRow[]; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<BrandRow | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(row: BrandRow) {
    setBusy(true);
    try {
      await deleteBrand(row.id);
      toast.success(`${row.name} deleted`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      {canManage ? (
        <Button className="w-fit" onClick={() => setEditing("new")}>
          <PlusIcon aria-hidden="true" className="size-4" />
          Add a brand
        </Button>
      ) : null}

      <ul className="divide-y divide-grey-200 rounded-lg border border-grey-200 bg-white">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-grey-100 font-mono text-caption font-semibold text-brand-navy">
              {row.code}
            </span>

            <div className="min-w-0 flex-1 grid gap-0.5">
              <span className="flex items-center gap-2">
                <span className="font-semibold text-brand-navy">{row.name}</span>
                {row.isActive ? null : <Badge variant="cancelled">Hidden</Badge>}
              </span>
              <span className="text-caption text-text-muted">
                {row.productCount} product{row.productCount === 1 ? "" : "s"} · SKUs start {row.code}-
              </span>
            </div>

            {canManage ? (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label={`Edit ${row.name}`} onClick={() => setEditing(row)}>
                  <PencilIcon aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${row.name}`}
                  disabled={busy}
                  onClick={() => void remove(row)}
                >
                  <Trash2Icon aria-hidden="true" className="size-4 text-danger-text" />
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <BrandDialog row={editing} onClose={() => setEditing(null)} onDone={router.refresh} />
    </div>
  );
}

function BrandDialog({
  row,
  onClose,
  onDone,
}: {
  row: BrandRow | "new" | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const existing = row === "new" ? null : row;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const payload = { name: name.trim(), code: code.trim().toUpperCase(), isActive };
      if (existing) {
        await updateBrand(existing.id, payload);
      } else {
        await createBrand(payload);
      }
      toast.success(existing ? `${payload.name} saved` : `${payload.name} added`);
      onClose();
      onDone();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={row !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          return;
        }
        setName(existing?.name ?? "");
        setCode(existing?.code ?? "");
        setIsActive(existing?.isActive ?? true);
        setError(null);
      }}
    >
      <DialogContent key={existing?.id ?? "new"}>
        <DialogHeader>
          <DialogTitle>{existing ? `Edit ${existing.name}` : "Add a brand"}</DialogTitle>
          <DialogDescription>
            The code starts every SKU this brand&rsquo;s variants are given, so changing it does not rewrite
            the SKUs that already exist.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="rounded-md bg-danger-tint p-3 text-body-sm text-danger-text">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4">
          <Field label="Name">
            {(control) => (
              <Input
                {...control}
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
              />
            )}
          </Field>

          <Field label="Code" hint="Three capitals or digits — Apple is APL.">
            {(control) => (
              <Input
                {...control}
                value={code}
                maxLength={3}
                className="w-24 font-mono uppercase"
                onChange={(event) => setCode(event.target.value.toUpperCase())}
              />
            )}
          </Field>

          <label className="flex items-center gap-2 text-body-sm text-brand-navy">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="size-4 rounded-sm border-grey-300 accent-[#156FBF]"
            />
            Show it in the shop
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={name.trim().length < 1 || code.trim().length !== 3}
            loading={busy}
            onClick={() => void submit()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
