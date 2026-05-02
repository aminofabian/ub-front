"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  createSupplier,
  createSupplierContact,
  fetchSupplierById,
  fetchSupplierContacts,
  fetchSuppliers,
  patchSupplier,
  type CreateSupplierContactPayload,
  type CreateSupplierPayload,
  type SupplierContactRecord,
  type SupplierRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type PatchDraft = {
  name: string;
  supplierType: string;
  status: string;
  notes: string;
};

const EMPTY_PATCH: PatchDraft = {
  name: "",
  supplierType: "distributor",
  status: "active",
  notes: "",
};

export default function SuppliersPage() {
  const { me } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.SuppliersRead);
  const canWrite = hasPermission(me?.permissions, Permission.SuppliersWrite);

  const selectionRef = useRef<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; kind: "error" | "success" } | null>(
    null,
  );
  const [rows, setRows] = useState<SupplierRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupplierRecord | null>(null);
  const [contacts, setContacts] = useState<SupplierContactRecord[]>([]);
  const [patchDraft, setPatchDraft] = useState<PatchDraft>(EMPTY_PATCH);
  const [createName, setCreateName] = useState("");
  const [contactDraft, setContactDraft] = useState<CreateSupplierContactPayload>({
    name: "",
    email: "",
    phone: "",
  });

  const refreshList = useCallback(async () => {
    setListLoading(true);
    setFeedback(null);
    try {
      setRows(await fetchSuppliers());
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Failed to load suppliers.",
        kind: "error",
      });
    } finally {
      setListLoading(false);
    }
  }, []);

  const onSelectSupplier = async (id: string) => {
    selectionRef.current = id;
    setSelectedId(id);
    setFeedback(null);
    try {
      const [d, c] = await Promise.all([
        fetchSupplierById(id),
        fetchSupplierContacts(id),
      ]);
      if (selectionRef.current !== id) {
        return;
      }
      setDetail(d);
      setContacts(c);
      setPatchDraft({
        name: d.name,
        supplierType: d.supplierType,
        status: d.status,
        notes: d.notes ?? "",
      });
    } catch (error) {
      if (selectionRef.current === id) {
        setDetail(null);
        setContacts([]);
        setFeedback({
          text: error instanceof Error ? error.message : "Failed to load supplier.",
          kind: "error",
        });
      }
    }
  };

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createName.trim()) {
      return;
    }
    setFeedback(null);
    try {
      const body: CreateSupplierPayload = { name: createName.trim() };
      const created = await createSupplier(body);
      setCreateName("");
      await refreshList();
      await onSelectSupplier(created.id);
      setFeedback({ text: "Supplier created.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Create failed.",
        kind: "error",
      });
    }
  };

  const onPatchSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !patchDraft.name.trim()) {
      return;
    }
    setFeedback(null);
    try {
      const next = await patchSupplier(selectedId, {
        name: patchDraft.name.trim(),
        supplierType: patchDraft.supplierType.trim() || undefined,
        status: patchDraft.status.trim() || undefined,
        notes: patchDraft.notes.trim() || undefined,
      });
      setDetail(next);
      await refreshList();
      setFeedback({ text: "Supplier updated.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Update failed.",
        kind: "error",
      });
    }
  };

  const onAddContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) {
      return;
    }
    setFeedback(null);
    try {
      await createSupplierContact(selectedId, {
        name: contactDraft.name?.trim() || undefined,
        email: contactDraft.email?.trim() || undefined,
        phone: contactDraft.phone?.trim() || undefined,
      });
      setContactDraft({ name: "", email: "", phone: "" });
      setContacts(await fetchSupplierContacts(selectedId));
      setFeedback({ text: "Contact added.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Add contact failed.",
        kind: "error",
      });
    }
  };

  if (!canRead) {
    return (
      <section className="max-w-xl space-y-2">
        <h2 className="text-xl font-semibold">Suppliers</h2>
        <p className="text-sm text-muted-foreground">
          You need{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.SuppliersRead}</code> to view
          suppliers.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Suppliers</h2>
        <p className="text-sm text-muted-foreground">
          List your suppliers, open one for editable fields and contacts. Click <strong>Refresh list</strong> to
          load. Uses <code className="text-xs">GET/PATCH /api/v1/suppliers</code>.
        </p>
      </header>

      {feedback ? (
        <p
          className={
            feedback.kind === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"
          }
        >
          {feedback.text}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={listLoading} onClick={() => void refreshList()}>
          {listLoading ? "Loading…" : "Refresh list"}
        </Button>
      </div>

      {canWrite ? (
        <form
          onSubmit={onCreate}
          className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/20 p-4"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">New supplier name</span>
            <input
              className="rounded border bg-background px-2 py-1.5"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              required
            />
          </label>
          <Button type="submit">Create</Button>
        </form>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                    No suppliers. Refresh or create one.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-0 py-0">
                      <button
                        type="button"
                        className={cn(
                          "w-full px-3 py-2 text-left hover:bg-accent/60",
                          selectedId === row.id && "bg-accent",
                        )}
                        onClick={() => void onSelectSupplier(row.id)}
                      >
                        {row.name}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.supplierType}</td>
                    <td className="px-3 py-2">{row.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          {!detail ? (
            <p className="text-sm text-muted-foreground">Select a supplier from the list.</p>
          ) : (
            <>
              <div className="rounded-md border p-4 text-sm">
                <h3 className="mb-2 font-medium">Details</h3>
                <dl className="grid gap-1 text-muted-foreground">
                  <div>
                    <dt className="inline">ID </dt>
                    <dd className="inline font-mono text-xs text-foreground">{detail.id}</dd>
                  </div>
                  <div>
                    <dt className="inline">Code </dt>
                    <dd className="inline text-foreground">{detail.code ?? "—"}</dd>
                  </div>
                </dl>
                {canWrite ? (
                  <form className="mt-4 space-y-2 border-t pt-4" onSubmit={onPatchSave}>
                    <label className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Name</span>
                      <input
                        className="rounded border bg-background px-2 py-1.5"
                        value={patchDraft.name}
                        onChange={(e) => setPatchDraft((p) => ({ ...p, name: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Type</span>
                      <input
                        className="rounded border bg-background px-2 py-1.5"
                        value={patchDraft.supplierType}
                        onChange={(e) => setPatchDraft((p) => ({ ...p, supplierType: e.target.value }))}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Status</span>
                      <select
                        className="rounded border bg-background px-2 py-1.5"
                        value={patchDraft.status}
                        onChange={(e) => setPatchDraft((p) => ({ ...p, status: e.target.value }))}
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                        <option value="blocked">blocked</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Notes</span>
                      <textarea
                        className="min-h-[4rem] rounded border bg-background px-2 py-1.5"
                        value={patchDraft.notes}
                        onChange={(e) => setPatchDraft((p) => ({ ...p, notes: e.target.value }))}
                      />
                    </label>
                    <Button type="submit">Save changes</Button>
                  </form>
                ) : null}
              </div>

              <div className="rounded-md border p-4 text-sm">
                <h3 className="mb-2 font-medium">Contacts</h3>
                <ul className="space-y-2">
                  {contacts.length === 0 ? (
                    <li className="text-muted-foreground">No contacts.</li>
                  ) : (
                    contacts.map((c) => (
                      <li key={c.id} className="rounded bg-muted/30 px-2 py-1">
                        {[c.name, c.email, c.phone].filter(Boolean).join(" · ") || c.id}
                        {c.primaryContact ? (
                          <span className="ml-2 text-xs text-muted-foreground">(primary)</span>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
                {canWrite ? (
                  <form className="mt-4 space-y-2 border-t pt-4" onSubmit={onAddContact}>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        placeholder="Name"
                        className="rounded border bg-background px-2 py-1.5"
                        value={contactDraft.name ?? ""}
                        onChange={(e) =>
                          setContactDraft((d) => ({ ...d, name: e.target.value }))
                        }
                      />
                      <input
                        placeholder="Email"
                        className="rounded border bg-background px-2 py-1.5"
                        value={contactDraft.email ?? ""}
                        onChange={(e) =>
                          setContactDraft((d) => ({ ...d, email: e.target.value }))
                        }
                      />
                      <input
                        placeholder="Phone"
                        className="rounded border bg-background px-2 py-1.5"
                        value={contactDraft.phone ?? ""}
                        onChange={(e) =>
                          setContactDraft((d) => ({ ...d, phone: e.target.value }))
                        }
                      />
                    </div>
                    <Button type="submit">Add contact</Button>
                  </form>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
