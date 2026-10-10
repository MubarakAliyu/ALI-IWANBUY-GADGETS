"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAdminNote } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";
import { formatDateTime } from "@/lib/date";

/**
 * Internal notes on an order (A-4) — for the shop, never shown to the customer.
 *
 * Notes are only added, never edited: "I told him Tuesday" written yesterday is a record of what happened,
 * and a record that can be quietly rewritten is not worth keeping.
 */
export function OrderNotes({
  orderNumber,
  notes,
}: {
  orderNumber: string;
  notes: { body: string; by: string; at: string }[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (body.trim().length === 0) {
      return;
    }
    setBusy(true);
    try {
      await addAdminNote(orderNumber, { body: body.trim() });
      setBody("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "We could not save that note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid content-start gap-3 rounded-lg border border-grey-200 bg-white p-4">
      <div className="grid gap-0.5">
        <h2 className="text-body-sm font-semibold text-brand-navy">Internal notes</h2>
        <p className="text-caption text-text-muted">Only the shop sees these. The customer never does.</p>
      </div>

      {notes.length > 0 ? (
        <ul className="grid gap-3">
          {notes.map((note) => (
            <li key={`${note.at}-${note.body}`} className="rounded-md bg-grey-50 p-3">
              <p className="text-body-sm text-brand-navy">{note.body}</p>
              <p className="mt-1 text-caption text-text-muted">
                {note.by} · {formatDateTime(note.at)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="order-note" className="sr-only">
            Add a note
          </Label>
          <Input
            id="order-note"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Customer will collect on Saturday"
            maxLength={1000}
          />
        </div>
        <Button type="submit" variant="outline" disabled={body.trim().length === 0} loading={busy}>
          Add
        </Button>
      </form>
    </section>
  );
}
