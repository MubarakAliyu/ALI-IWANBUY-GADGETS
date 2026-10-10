import type { Metadata } from "next";
import type { AuditQuery } from "@aib/shared";
import { AuditTable } from "@/components/admin/audit-table";
import { auditFilterOptions, exportHref, listAudit } from "@/lib/admin";

export const metadata: Metadata = { title: "Audit trail" };

/**
 * The audit trail (A-13). Append-only in the model and read-only here — there is no route that writes to it,
 * which is what makes it worth reading.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = readQuery(params);

  const [result, filters] = await Promise.all([listAudit(query), auditFilterOptions()]);

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-h1 text-brand-navy">Audit trail</h1>
        <p className="text-body-sm text-text-muted">
          Every change anyone made, and every security event. Nothing here can be edited or deleted — not by
          an admin, not by the owner, not through this dashboard at all.
        </p>
      </div>

      <AuditTable
        result={result}
        actions={filters.actions}
        entityTypes={filters.entityTypes}
        exportHref={exportHref("audit", query)}
      />
    </div>
  );
}

function readQuery(params: Record<string, string | string[] | undefined>): AuditQuery {
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const page = Number(one("page"));

  return {
    ...(one("q") ? { q: one("q") } : {}),
    ...(one("action") ? { action: one("action") } : {}),
    ...(one("entityType") ? { entityType: one("entityType") } : {}),
    ...(one("actorType") ? { actorType: one("actorType") as AuditQuery["actorType"] } : {}),
    ...(one("actor") ? { actor: one("actor") } : {}),
    ...(one("from") ? { from: one("from") } : {}),
    ...(one("to") ? { to: one("to") } : {}),
    ...(Number.isFinite(page) && page > 1 ? { page } : {}),
  };
}
