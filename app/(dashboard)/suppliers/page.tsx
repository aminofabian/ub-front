"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import Image from "next/image";
import { CircleDollarSign, LayoutGrid, Package, Plus, Truck } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  addItemSupplierLink,
  createSupplier,
  createSupplierContact,
  deleteItemSupplierLink,
  fetchItems,
  fetchSupplierById,
  fetchSupplierContacts,
  fetchSupplierItemLinks,
  fetchSuppliers,
  itemListThumbnailUrl,
  patchSupplier,
  postItemSupplierLinkSetPrimary,
  type CreateSupplierContactPayload,
  type CreateSupplierPayload,
  type ItemSummaryRecord,
  type SupplierContactRecord,
  type SupplierItemLinkRecord,
  type SupplierRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const SUPPLIER_STATUS_OPTIONS = ["active", "inactive", "blocked"] as const;

type SupplierProfileDraft = {
  name: string;
  code: string;
  supplierType: string;
  status: string;
  notes: string;
};

const EMPTY_SUPPLIER_PROFILE: SupplierProfileDraft = {
  name: "",
  code: "",
  supplierType: "distributor",
  status: "active",
  notes: "",
};

function formatShortDate(iso: string | null | undefined): string {
  if (!iso?.trim()) {
    return "—";
  }
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function SupplierCommercialSection({ s }: { s: SupplierRecord }) {
  const rows: { label: string; value: ReactNode }[] = [
    { label: "VAT PIN", value: s.vatPin?.trim() || "—" },
    { label: "Tax exempt", value: s.taxExempt ? "Yes" : "No" },
    {
      label: "Credit terms",
      value: s.creditTermsDays != null ? `${s.creditTermsDays} days` : "—",
    },
    {
      label: "Credit limit",
      value: s.creditLimit != null && Number.isFinite(s.creditLimit) ? String(s.creditLimit) : "—",
    },
    { label: "Rating", value: s.rating != null ? String(s.rating) : "—" },
    { label: "Preferred payment", value: s.paymentMethodPreferred?.trim() || "—" },
    {
      label: "Payment details",
      value: s.paymentDetails?.trim() ? (
        <span className="whitespace-pre-wrap text-sm">{s.paymentDetails}</span>
      ) : (
        "—"
      ),
    },
    { label: "Record version", value: String(s.version) },
    { label: "Created", value: formatShortDate(s.createdAt) },
    { label: "Last updated", value: formatShortDate(s.updatedAt) },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-muted/10 p-4 text-sm">
      <h3 className="mb-1 font-medium text-foreground">Commercial &amp; payments</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        From your ERP / provisioning profile. These fields are not editable on this screen yet.
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SupplierProfileFields({
  draft,
  onDraftChange,
}: {
  draft: SupplierProfileDraft;
  onDraftChange: (partial: Partial<SupplierProfileDraft>) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-muted-foreground">Name</span>
        <input
          className="rounded border bg-background px-2 py-1.5"
          value={draft.name}
          onChange={(e) => onDraftChange({ name: e.target.value })}
          required
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Code (optional)</span>
        <input
          className="rounded border bg-background px-2 py-1.5"
          value={draft.code}
          onChange={(e) => onDraftChange({ code: e.target.value })}
          maxLength={64}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Type</span>
        <input
          className="rounded border bg-background px-2 py-1.5"
          value={draft.supplierType}
          onChange={(e) => onDraftChange({ supplierType: e.target.value })}
          placeholder="e.g. distributor"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Status</span>
        <select
          className="rounded border bg-background px-2 py-1.5"
          value={draft.status}
          onChange={(e) => onDraftChange({ status: e.target.value })}
        >
          {(SUPPLIER_STATUS_OPTIONS as readonly string[]).includes(draft.status) ? null : (
            <option value={draft.status}>{draft.status}</option>
          )}
          {SUPPLIER_STATUS_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-muted-foreground">Notes</span>
        <textarea
          className="min-h-[4rem] rounded border bg-background px-2 py-1.5"
          value={draft.notes}
          onChange={(e) => onDraftChange({ notes: e.target.value })}
        />
      </label>
    </div>
  );
}

export default function SuppliersPage() {
  const { me, loading } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.SuppliersRead);
  const canWrite = hasPermission(me?.permissions, Permission.SuppliersWrite);
  const canReadCatalog = hasPermission(me?.permissions, Permission.CatalogItemsRead);
  const canLinkProducts = hasPermission(me?.permissions, Permission.CatalogItemsLinkSuppliers);

  const selectionRef = useRef<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; kind: "error" | "success" } | null>(
    null,
  );
  const [rows, setRows] = useState<SupplierRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupplierRecord | null>(null);
  const [contacts, setContacts] = useState<SupplierContactRecord[]>([]);
  const [patchDraft, setPatchDraft] = useState<SupplierProfileDraft>(EMPTY_SUPPLIER_PROFILE);
  const [createDraft, setCreateDraft] = useState<SupplierProfileDraft>(EMPTY_SUPPLIER_PROFILE);
  const [contactDraft, setContactDraft] = useState<CreateSupplierContactPayload>({
    name: "",
    roleLabel: "",
    email: "",
    phone: "",
  });
  const [itemLinks, setItemLinks] = useState<SupplierItemLinkRecord[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productHits, setProductHits] = useState<ItemSummaryRecord[]>([]);
  const [pickedItemId, setPickedItemId] = useState("");
  const [linkSku, setLinkSku] = useState("");
  const [linkCostStr, setLinkCostStr] = useState("");
  const [linkPrimary, setLinkPrimary] = useState(false);
  const [linksBusy, setLinksBusy] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const skipCreateDrawerResetAfterCreate = useRef(false);

  const resetCreateDraft = useCallback(() => {
    setCreateDraft({ ...EMPTY_SUPPLIER_PROFILE });
  }, []);

  const onCreateDrawerOpenChange = (open: boolean) => {
    if (!open) {
      if (skipCreateDrawerResetAfterCreate.current) {
        skipCreateDrawerResetAfterCreate.current = false;
      } else {
        resetCreateDraft();
      }
    }
    setCreateDrawerOpen(open);
  };

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

  useEffect(() => {
    if (loading || !canRead) {
      return;
    }
    void refreshList();
  }, [loading, canRead, refreshList]);

  const onSelectSupplier = async (id: string) => {
    selectionRef.current = id;
    setSelectedId(id);
    setFeedback(null);
    setProductSearch("");
    setProductHits([]);
    setPickedItemId("");
    setLinkSku("");
    setLinkCostStr("");
    setLinkPrimary(false);
    try {
      const [d, c, links] = await Promise.all([
        fetchSupplierById(id),
        fetchSupplierContacts(id),
        canReadCatalog ? fetchSupplierItemLinks(id) : Promise.resolve([]),
      ]);
      if (selectionRef.current !== id) {
        return;
      }
      setDetail(d);
      setContacts(c);
      setItemLinks(links);
      setPatchDraft({
        name: d.name,
        code: d.code ?? "",
        supplierType: d.supplierType,
        status: d.status,
        notes: d.notes ?? "",
      });
    } catch (error) {
      if (selectionRef.current === id) {
        setDetail(null);
        setContacts([]);
        setItemLinks([]);
        setFeedback({
          text: error instanceof Error ? error.message : "Failed to load supplier.",
          kind: "error",
        });
      }
    }
  };

  useEffect(() => {
    if (!selectedId || !canReadCatalog) {
      return;
    }
    const q = productSearch.trim();
    if (!q) {
      setProductHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      fetchItems(q)
        .then(setProductHits)
        .catch(() => setProductHits([]));
    }, 320);
    return () => window.clearTimeout(t);
  }, [selectedId, productSearch, canReadCatalog]);

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createDraft.name.trim()) {
      return;
    }
    setFeedback(null);
    try {
      const codeTrim = createDraft.code.trim();
      const body: CreateSupplierPayload = {
        name: createDraft.name.trim(),
        ...(codeTrim ? { code: codeTrim } : {}),
        supplierType: createDraft.supplierType.trim() || undefined,
        status: createDraft.status.trim() || undefined,
        notes: createDraft.notes.trim() || undefined,
      };
      const created = await createSupplier(body);
      setCreateDraft({ ...EMPTY_SUPPLIER_PROFILE });
      await refreshList();
      await onSelectSupplier(created.id);
      skipCreateDrawerResetAfterCreate.current = true;
      setCreateDrawerOpen(false);
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
      const codeTrim = patchDraft.code.trim();
      const next = await patchSupplier(selectedId, {
        name: patchDraft.name.trim(),
        code: codeTrim.length > 0 ? codeTrim : "",
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

  const refreshItemLinks = useCallback(async () => {
    if (!selectedId || !canReadCatalog) {
      return;
    }
    try {
      setItemLinks(await fetchSupplierItemLinks(selectedId));
    } catch {
      /* keep existing list */
    }
  }, [selectedId, canReadCatalog]);

  const onLinkProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !pickedItemId.trim()) {
      return;
    }
    if (!canLinkProducts) {
      return;
    }
    setLinksBusy(true);
    setFeedback(null);
    try {
      const costRaw = linkCostStr.trim();
      let defaultCostPrice: number | undefined;
      if (costRaw.length > 0) {
        const n = Number(costRaw);
        if (!Number.isFinite(n) || n < 0) {
          setFeedback({ text: "Default cost must be a valid non-negative number.", kind: "error" });
          setLinksBusy(false);
          return;
        }
        defaultCostPrice = n;
      }
      await addItemSupplierLink(pickedItemId.trim(), {
        supplierId: selectedId,
        supplierSku: linkSku.trim() || undefined,
        defaultCostPrice,
        setPrimary: linkPrimary || undefined,
      });
      setPickedItemId("");
      setLinkSku("");
      setLinkCostStr("");
      setLinkPrimary(false);
      setProductSearch("");
      setProductHits([]);
      await refreshItemLinks();
      setFeedback({ text: "Product linked to this supplier.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Link failed.",
        kind: "error",
      });
    } finally {
      setLinksBusy(false);
    }
  };

  const onRemoveLink = async (row: SupplierItemLinkRecord) => {
    if (!canLinkProducts) {
      return;
    }
    setLinksBusy(true);
    setFeedback(null);
    try {
      await deleteItemSupplierLink(row.itemId, row.id);
      await refreshItemLinks();
      setFeedback({ text: "Link removed.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Remove link failed.",
        kind: "error",
      });
    } finally {
      setLinksBusy(false);
    }
  };

  const onSetPrimaryLink = async (row: SupplierItemLinkRecord) => {
    if (!canLinkProducts || !row.active) {
      return;
    }
    setLinksBusy(true);
    setFeedback(null);
    try {
      await postItemSupplierLinkSetPrimary(row.itemId, row.id);
      await refreshItemLinks();
      setFeedback({ text: "Primary supplier updated for that product.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Could not set primary.",
        kind: "error",
      });
    } finally {
      setLinksBusy(false);
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
        roleLabel: contactDraft.roleLabel?.trim() || undefined,
        email: contactDraft.email?.trim() || undefined,
        phone: contactDraft.phone?.trim() || undefined,
      });
      setContactDraft({ name: "", roleLabel: "", email: "", phone: "" });
      setContacts(await fetchSupplierContacts(selectedId));
      setFeedback({ text: "Contact added.", kind: "success" });
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Add contact failed.",
        kind: "error",
      });
    }
  };

  if (loading) {
    return <DashboardLoading label="Loading session…" />;
  }

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Suppliers"
        description={
          <>
            You need{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.SuppliersRead}</code> to view
            suppliers.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <DashboardPageHero
            icon={Truck}
            eyebrow="Purchasing"
            title="Suppliers"
            description={
              <>
                Use <span className="font-medium text-foreground">New supplier</span> to open the drawer with profile
                fields, or pick one from the list to edit details, contacts, and (with catalog access) linked products.
                Linking uses{" "}
                <code className="text-xs">POST /api/v1/items/&#123;itemId&#125;/supplier-links</code>.
              </>
            }
          />
          {canWrite ? (
            <Button
              type="button"
              size="lg"
              className="gap-2 self-start shadow-md lg:shrink-0"
              disabled={listLoading}
              onClick={() => {
                skipCreateDrawerResetAfterCreate.current = false;
                setCreateDrawerOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              New supplier
            </Button>
          ) : null}
        </div>
        <DashboardQuickLinks
          links={[
            { href: APP_ROUTES.products, label: "Products", desc: "Link items", icon: Package },
            { href: APP_ROUTES.categories, label: "Categories", desc: "Aisles", icon: LayoutGrid },
            { href: APP_ROUTES.purchasingIntelligence, label: "Intelligence", desc: "Spend", icon: CircleDollarSign },
          ]}
        />
      </header>

      {feedback ? <DashboardFeedback kind={feedback.kind === "error" ? "error" : "success"} text={feedback.text} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={listLoading} onClick={() => void refreshList()}>
          {listLoading ? "Loading…" : "Refresh list"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    No suppliers. Refresh{canWrite ? " or use New supplier in the header" : ""}.
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
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.code?.trim() || "—"}</td>
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
            <p className="text-sm text-muted-foreground">
              Select a supplier from the list
              {canWrite ? ", or use New supplier in the header." : "."}
            </p>
          ) : (
            <>
              <div className="rounded-md border p-4 text-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier</p>
                <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{detail.name}</h3>
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="font-mono text-foreground">{detail.code?.trim() || "—"}</span>
                      <span aria-hidden>·</span>
                      <span>{detail.supplierType}</span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                      detail.status === "active"
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {detail.status}
                  </span>
                </div>
                {(() => {
                  const p = contacts.find((c) => c.primaryContact);
                  if (!p) {
                    return null;
                  }
                  const hasAny = Boolean(p.name?.trim() || p.roleLabel?.trim() || p.email?.trim() || p.phone?.trim());
                  if (!hasAny) {
                    return null;
                  }
                  return (
                    <p className="mt-3 border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">Primary contact</span>
                      {p.name?.trim() ? (
                        <>
                          {" · "}
                          <span className="text-foreground">{p.name.trim()}</span>
                        </>
                      ) : null}
                      {p.roleLabel?.trim() ? <span> · {p.roleLabel.trim()}</span> : null}
                      {p.email?.trim() ? (
                        <>
                          {" · "}
                          <a
                            href={`mailto:${p.email.trim()}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {p.email.trim()}
                          </a>
                        </>
                      ) : null}
                      {p.phone?.trim() ? (
                        <>
                          {" · "}
                          <a
                            href={`tel:${p.phone.trim().replace(/\s+/g, "")}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {p.phone.trim()}
                          </a>
                        </>
                      ) : null}
                    </p>
                  );
                })()}
                <dl className="mt-3 grid gap-1 border-t border-border/40 pt-3 text-muted-foreground">
                  <div>
                    <dt className="inline text-xs font-medium">ID </dt>
                    <dd className="inline font-mono text-[11px] text-foreground">{detail.id}</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <SupplierCommercialSection s={detail} />
                </div>
                {!canWrite ? (
                  <dl className="mt-4 grid gap-2 border-t pt-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Notes</dt>
                      <dd className="whitespace-pre-wrap text-sm text-foreground">
                        {detail.notes?.trim() ? detail.notes : "—"}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <form className="mt-4 space-y-3 border-t pt-4" onSubmit={onPatchSave}>
                    <p className="text-xs font-medium text-muted-foreground">Editable profile</p>
                    <SupplierProfileFields
                      draft={patchDraft}
                      onDraftChange={(partial) => setPatchDraft((p) => ({ ...p, ...partial }))}
                    />
                    <Button type="submit">Save changes</Button>
                  </form>
                )}
              </div>

              <div className="rounded-md border p-4 text-sm">
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-foreground">Contacts</h3>
                    <p className="text-xs text-muted-foreground">People and ordering touchpoints for this vendor.</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground tabular-nums">
                    {contacts.length} total
                  </span>
                </div>
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contacts yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {contacts.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{c.name?.trim() || "Unnamed contact"}</p>
                            {c.roleLabel?.trim() ? (
                              <p className="text-xs text-muted-foreground">{c.roleLabel.trim()}</p>
                            ) : null}
                          </div>
                          {c.primaryContact ? (
                            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              Primary
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-col gap-1 text-xs">
                          {c.email?.trim() ? (
                            <a
                              href={`mailto:${c.email.trim()}`}
                              className="w-fit max-w-full truncate text-primary underline-offset-2 hover:underline"
                            >
                              {c.email.trim()}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">No email on file</span>
                          )}
                          {c.phone?.trim() ? (
                            <a
                              href={`tel:${c.phone.trim().replace(/\s+/g, "")}`}
                              className="w-fit text-primary underline-offset-2 hover:underline"
                            >
                              {c.phone.trim()}
                            </a>
                          ) : null}
                        </div>
                        <p className="mt-2 font-mono text-[10px] text-muted-foreground/80">{c.id}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {canWrite ? (
                  <form className="mt-4 space-y-3 border-t pt-4" onSubmit={onAddContact}>
                    <p className="text-xs font-medium text-muted-foreground">Add contact</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        placeholder="Name"
                        className="rounded border bg-background px-2 py-1.5"
                        value={contactDraft.name ?? ""}
                        onChange={(e) =>
                          setContactDraft((d) => ({ ...d, name: e.target.value }))
                        }
                      />
                      <input
                        placeholder="Role / title (optional)"
                        className="rounded border bg-background px-2 py-1.5"
                        value={contactDraft.roleLabel ?? ""}
                        onChange={(e) =>
                          setContactDraft((d) => ({ ...d, roleLabel: e.target.value }))
                        }
                      />
                      <input
                        placeholder="Email"
                        type="email"
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

              {canReadCatalog ? (
                <div className="rounded-md border p-4 text-sm">
                  <h3 className="mb-2 font-medium">Linked products</h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Items that reference this supplier. Primary flag is per product (one primary supplier per item).
                  </p>
                  {itemLinks.length === 0 ? (
                    <p className="text-muted-foreground">No linked products yet.</p>
                  ) : (
                    <div className="overflow-x-auto rounded border">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b bg-muted/40">
                          <tr>
                            <th className="px-2 py-1.5 font-medium">Product</th>
                            <th className="px-2 py-1.5 font-medium">SKU</th>
                            <th className="px-2 py-1.5 font-medium">Primary</th>
                            <th className="px-2 py-1.5 font-medium">Supplier SKU</th>
                            <th className="px-2 py-1.5 font-medium">Default cost</th>
                            {canLinkProducts ? (
                              <th className="px-2 py-1.5 font-medium">Actions</th>
                            ) : null}
                          </tr>
                        </thead>
                        <tbody>
                          {itemLinks.map((row) => (
                            <tr key={row.id} className="border-b border-muted/50 last:border-0">
                              <td className="px-2 py-1.5">
                                <span className="font-medium">{row.itemName || row.itemId}</span>
                              </td>
                              <td className="px-2 py-1.5 font-mono text-[11px]">{row.sku || "—"}</td>
                              <td className="px-2 py-1.5">{row.primary ? "Yes" : "—"}</td>
                              <td className="px-2 py-1.5">{row.supplierSku ?? "—"}</td>
                              <td className="px-2 py-1.5 tabular-nums">
                                {row.defaultCostPrice != null && row.defaultCostPrice !== ""
                                  ? String(row.defaultCostPrice)
                                  : "—"}
                              </td>
                              {canLinkProducts ? (
                                <td className="px-2 py-1.5">
                                  <div className="flex flex-wrap gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-[11px]"
                                      disabled={linksBusy || row.primary || !row.active}
                                      onClick={() => void onSetPrimaryLink(row)}
                                    >
                                      Set primary
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-[11px] text-destructive"
                                      disabled={linksBusy}
                                      onClick={() => void onRemoveLink(row)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </td>
                              ) : null}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {canLinkProducts ? (
                    <form className="mt-4 space-y-2 border-t pt-4" onSubmit={(e) => void onLinkProduct(e)}>
                      <p className="text-xs font-medium text-muted-foreground">Link another product</p>
                      <input
                        className="w-full max-w-md rounded border bg-background px-2 py-1.5"
                        placeholder="Search catalog by name or SKU…"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                      />
                      {productHits.length > 0 ? (
                        <ul className="max-h-40 max-w-md overflow-auto rounded border bg-background text-xs">
                          {productHits.map((h) => {
                            const thumb = itemListThumbnailUrl(h);
                            return (
                              <li key={h.id}>
                                <button
                                  type="button"
                                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-accent ${pickedItemId === h.id ? "bg-accent" : ""}`}
                                  onClick={() => setPickedItemId(h.id)}
                                >
                                  {thumb ? (
                                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded border bg-muted">
                                      <Image
                                        src={thumb}
                                        alt=""
                                        width={32}
                                        height={32}
                                        className="object-cover"
                                      />
                                    </span>
                                  ) : (
                                    <span className="h-8 w-8 shrink-0 rounded border border-dashed border-muted-foreground/25 bg-muted/30" />
                                  )}
                                  <span className="min-w-0">
                                    {h.name}{" "}
                                    <span className="text-muted-foreground">{h.sku}</span>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">Supplier SKU (optional)</span>
                          <input
                            className="rounded border bg-background px-2 py-1.5"
                            value={linkSku}
                            onChange={(e) => setLinkSku(e.target.value)}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">Default cost (optional)</span>
                          <input
                            className="w-28 rounded border bg-background px-2 py-1.5 tabular-nums"
                            inputMode="decimal"
                            value={linkCostStr}
                            onChange={(e) => setLinkCostStr(e.target.value)}
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={linkPrimary}
                            onChange={(e) => setLinkPrimary(e.target.checked)}
                          />
                          Set as primary for this item
                        </label>
                      </div>
                      <Button type="submit" disabled={linksBusy || !pickedItemId.trim()}>
                        {linksBusy ? "Saving…" : "Link selected product"}
                      </Button>
                    </form>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      You need{" "}
                      <code className="rounded bg-muted px-1">{Permission.CatalogItemsLinkSuppliers}</code> to
                      add or remove links from here.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  <code className="text-xs">{Permission.CatalogItemsRead}</code> is required to view or manage
                  product links on this screen.
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>

      {canWrite ? (
        <FormDrawer
          open={createDrawerOpen}
          onOpenChange={onCreateDrawerOpenChange}
          title="New supplier"
          description="Only name is required; code, type, status, and notes are optional at create time—same fields as Details."
          contextLabel="Purchasing"
          icon={<Truck className="size-5 text-primary" aria-hidden />}
          width="wide"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onCreateDrawerOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" form="new-supplier-form">
                <Plus className="size-4" aria-hidden />
                Create supplier
              </Button>
            </div>
          }
        >
          <form id="new-supplier-form" className="space-y-6" onSubmit={onCreate}>
            <FormDrawerFields legend="Profile" hint="Matches the fields you can edit after selecting a supplier.">
              <SupplierProfileFields
                draft={createDraft}
                onDraftChange={(partial) => setCreateDraft((d) => ({ ...d, ...partial }))}
              />
            </FormDrawerFields>
          </form>
        </FormDrawer>
      ) : null}
    </div>
  );
}
