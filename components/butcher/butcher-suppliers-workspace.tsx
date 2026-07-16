"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  Clock3,
  FileText,
  Loader2,
  Mail,
  PackagePlus,
  Phone,
  Plus,
  Search,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { ButcherAddStockDialog } from "@/components/butcher/butcher-add-stock-dialog";
import { useButcherTheme } from "@/components/butcher/butcher-theme-provider";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createSupplier,
  createSupplierContact,
  fetchApAging,
  fetchItemById,
  fetchPathBSessions,
  fetchSupplierById,
  fetchSupplierContacts,
  fetchSupplierItemLinks,
  fetchSupplierPurchaseHistory,
  fetchSuppliersPage,
  type SupplierContactRecord,
  type SupplierItemLinkRecord,
  type SupplierPurchaseHistoryRecord,
  type SupplierRecord,
  type ItemTypeRecord,
} from "@/lib/api";
import { posBrandThemeStyle } from "@/lib/brand-theme";
import {
  butcherChargeButtonClass,
  butcherInputClass,
  butcherPillClass,
} from "@/lib/butcher-pos-chrome";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { canWriteSuppliers } from "@/lib/supplier-access";
import { cn } from "@/lib/utils";

function supplierInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "—";
}

function formatSupplierType(raw: string | null | undefined): string {
  const t = raw?.trim();
  if (!t) return "Supplier";
  return t
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function categoryTagsFromSupplierLinks(
  links: SupplierItemLinkRecord[],
  itemTypes: ItemTypeRecord[],
): Promise<string[]> {
  if (links.length === 0 || itemTypes.length === 0) return [];
  const typeById = new Map(itemTypes.map((t) => [t.id, t.label]));
  const itemIds = [...new Set(links.map((l) => l.itemId))].slice(0, 30);
  const tags = new Set<string>();
  await Promise.all(
    itemIds.map(async (itemId) => {
      try {
        const item = await fetchItemById(itemId);
        const label = item.itemTypeId ? typeById.get(item.itemTypeId) : null;
        if (label) tags.add(label);
      } catch {
        /* skip missing items */
      }
    }),
  );
  return [...tags].slice(0, 6);
}

function relativeLastOrder(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 14) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

function formatMoney(n: number, currency: string): string {
  const v = n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${currency} ${v}`;
}

type SupplierEnrichment = {
  productCount: number;
  categories: string[];
  openBalance: number;
  lastOrderLabel: string;
  contacts: SupplierContactRecord[];
  history: SupplierPurchaseHistoryRecord | null;
};

export function ButcherSuppliersWorkspace() {
  const { me, business, itemTypes, canViewSuppliers, canPathBWrite, canPathBRead, canPathAWrite } =
    useDashboard();
  const { dialogSurfaceClass } = useButcherTheme();
  const canRead = hasPermission(me?.permissions, Permission.SuppliersRead);
  const canWrite = canWriteSuppliers(me, business);
  const currency = business?.currency?.trim() || "KES";
  const brandTheme = useMemo(
    () => posBrandThemeStyle(business?.branding ?? null),
    [business?.branding],
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<SupplierRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupplierRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [enrichment, setEnrichment] = useState<SupplierEnrichment | null>(null);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  const [stockOpen, setStockOpen] = useState(false);
  const [stockSessionId, setStockSessionId] = useState<string | null>(null);
  const [openDraftCount, setOpenDraftCount] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addName, setAddName] = useState("");
  const [addContact, setAddContact] = useState("");
  const [addPhone, setAddPhone] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 220);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadList = useCallback(async () => {
    if (!canRead) return;
    setListLoading(true);
    try {
      const page = await fetchSuppliersPage({
        search: debouncedSearch || undefined,
        page: 0,
        size: 80,
      });
      setRows(page.content ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load suppliers.");
    } finally {
      setListLoading(false);
    }
  }, [canRead, debouncedSearch]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rows.some((r) => r.id === selectedId)) {
      setSelectedId(rows[0]!.id);
    }
  }, [rows, selectedId]);

  const loadDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      setEnrichment(null);
      try {
        const [sup, contacts, links, history, aging] = await Promise.all([
          fetchSupplierById(id),
          fetchSupplierContacts(id),
          fetchSupplierItemLinks(id).catch(() => [] as SupplierItemLinkRecord[]),
          fetchSupplierPurchaseHistory(id, { limit: 5 }).catch(() => null),
          fetchApAging(undefined, id).catch(() => null),
        ]);
        setDetail(sup);
        const categories = await categoryTagsFromSupplierLinks(links, itemTypes);
        const openBalance =
          history?.summary.openBalance ??
          aging?.totalOpen ??
          0;
        const lastOrderLabel = relativeLastOrder(
          history?.summary.lastInvoiceDate,
        );
        setProductCounts((prev) => ({
          ...prev,
          [id]: links.length,
        }));
        setEnrichment({
          productCount: links.length,
          categories,
          openBalance: Number(openBalance) || 0,
          lastOrderLabel,
          contacts,
          history,
        });
        if (canPathBRead) {
          void fetchPathBSessions({ supplierId: id, status: "draft" })
            .then((drafts) => setOpenDraftCount(drafts.length))
            .catch(() => setOpenDraftCount(0));
        } else {
          setOpenDraftCount(0);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load supplier.");
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [canPathBRead, itemTypes],
  );

  useEffect(() => {
    if (!selectedId || !canRead) {
      setDetail(null);
      setEnrichment(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, canRead, loadDetail]);

  const primaryContact = useMemo(() => {
    const contacts = enrichment?.contacts ?? [];
    return contacts.find((c) => c.primaryContact) ?? contacts[0] ?? null;
  }, [enrichment?.contacts]);

  const onAddSupplier = async (e: FormEvent) => {
    e.preventDefault();
    const name = addName.trim();
    if (!name) {
      toast.error("Supplier name is required.");
      return;
    }
    setAddBusy(true);
    try {
      const created = await createSupplier({
        name,
        supplierType: "meat",
        status: "active",
      });
      if (addContact.trim() || addPhone.trim()) {
        await createSupplierContact(created.id, {
          name: addContact.trim() || undefined,
          phone: addPhone.trim() || undefined,
          primaryContact: true,
        });
      }
      toast.success("Supplier added.");
      setAddOpen(false);
      setAddName("");
      setAddContact("");
      setAddPhone("");
      await loadList();
      setSelectedId(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add supplier.");
    } finally {
      setAddBusy(false);
    }
  };

  if (!canRead || !canViewSuppliers) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <p className="max-w-sm text-sm text-[rgb(var(--bp-fg-muted))]">
          You do not have permission to view suppliers. Ask an administrator for{" "}
          <code className="text-[rgb(var(--bp-fg-faint))]">suppliers.read</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:gap-4">
      {/* List column */}
      <section className="flex min-h-0 w-full shrink-0 flex-col gap-3 lg:w-[min(100%,22rem)] xl:w-80">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[rgb(var(--bp-fg-muted))]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers"
              className={cn(butcherInputClass, "pl-10")}
            />
          </div>
          {canWrite ? (
            <Button
              type="button"
              className={cn(
                "h-11 shrink-0 gap-1.5 rounded-xl px-4 font-semibold",
                butcherChargeButtonClass,
              )}
              style={{
                backgroundColor: "var(--pos-primary)",
                color: "var(--pos-primary-ink)",
              }}
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add supplier</span>
            </Button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel)/0.4)]">
          {listLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-[var(--pos-primary)]" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-[rgb(var(--bp-fg-muted))]">
              No suppliers found.
            </p>
          ) : (
            <ul className="max-h-[min(70dvh,40rem)] overflow-y-auto p-1.5">
              {rows.map((row) => {
                const active = row.id === selectedId;
                const count = productCounts[row.id];
                const subtitle = [
                  formatSupplierType(row.supplierType),
                  count != null ? `${count} products` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={cn(
                        "w-full rounded-xl px-3 py-3 text-left transition",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary)_14%,#0a0a0a)] ring-1 ring-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)]"
                          : "hover:bg-[rgb(var(--bp-hover))]/60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-sm font-semibold",
                            active
                              ? "text-[var(--pos-primary)]"
                              : "text-[rgb(var(--bp-fg))]",
                          )}
                        >
                          {row.name}
                        </p>
                        {row.status !== "active" ? (
                          <span className="shrink-0 rounded-md bg-[rgb(var(--bp-hover))] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[rgb(var(--bp-fg-muted))]">
                            {row.status}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[rgb(var(--bp-fg-muted))]">
                        {subtitle}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Detail column */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-[min(70dvh,40rem)] flex-1 flex-col overflow-hidden rounded-2xl border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel)/0.35)] p-4 sm:p-5">
          {detailLoading && !detail ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="size-7 animate-spin text-[var(--pos-primary)]" />
            </div>
          ) : !detail ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <Truck className="size-10 text-[rgb(var(--bp-fg-faint))]" strokeWidth={1.25} />
              <p className="text-sm text-[rgb(var(--bp-fg-muted))]">
                Select a supplier to view details.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4 border-b border-[rgb(var(--bp-border))] pb-5">
                <div
                  className="flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--pos-primary) 22%, #171717)",
                    color: "var(--pos-primary)",
                  }}
                >
                  {supplierInitials(detail.name)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight text-[rgb(var(--bp-fg))]">
                    {detail.name}
                  </h2>
                  <p className="text-sm text-[rgb(var(--bp-fg-muted))]">
                    {primaryContact?.name?.trim() || "No contact on file"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 py-5 text-sm">
                {primaryContact?.phone?.trim() ? (
                  <div className="flex items-center gap-3 text-[rgb(var(--bp-fg-soft))]">
                    <Phone className="size-4 shrink-0 text-[rgb(var(--bp-fg-muted))]" />
                    <span>{primaryContact.phone}</span>
                  </div>
                ) : null}
                {primaryContact?.email?.trim() ? (
                  <div className="flex items-center gap-3">
                    <Mail className="size-4 shrink-0 text-[rgb(var(--bp-fg-muted))]" />
                    <a
                      href={`mailto:${primaryContact.email}`}
                      className="text-[var(--pos-primary)] hover:underline"
                    >
                      {primaryContact.email}
                    </a>
                  </div>
                ) : null}
                <div className="flex items-center gap-3 text-[rgb(var(--bp-fg-faint))]">
                  <Clock3 className="size-4 shrink-0 text-[rgb(var(--bp-fg-muted))]" />
                  <span>
                    Last order:{" "}
                    <span className="text-[rgb(var(--bp-fg-soft))]">
                      {enrichment?.lastOrderLabel ?? "—"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel-strong)/0.5)] p-4">
                  <p className="text-xs text-[rgb(var(--bp-fg-muted))]">Products supplied</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-[rgb(var(--bp-fg))]">
                    {enrichment?.productCount ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel-strong)/0.5)] p-4">
                  <p className="text-xs text-[rgb(var(--bp-fg-muted))]">Outstanding balance</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-amber-400">
                    {enrichment != null
                      ? formatMoney(enrichment.openBalance, currency)
                      : "—"}
                  </p>
                </div>
              </div>

              {enrichment && enrichment.categories.length > 0 ? (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium text-[rgb(var(--bp-fg-muted))]">
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {enrichment.categories.map((tag) => (
                      <span
                        key={tag}
                        className={butcherPillClass(false)}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                {canPathBWrite || canPathAWrite ? (
                  <>
                    <Button
                      type="button"
                      className="gap-2 rounded-xl border-0 shadow-md hover:brightness-110"
                      style={{
                        backgroundColor: "var(--pos-primary)",
                        color: "var(--pos-primary-ink)",
                      }}
                      onClick={() => {
                        setStockSessionId(null);
                        setStockOpen(true);
                      }}
                    >
                      <PackagePlus className="size-4" />
                      Add stock
                    </Button>
                    {openDraftCount > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-[rgb(var(--bp-border))] bg-transparent text-[rgb(var(--bp-fg-soft))] hover:bg-[rgb(var(--bp-hover))]"
                        onClick={() => {
                          setStockSessionId(null);
                          setStockOpen(true);
                        }}
                      >
                        {openDraftCount} draft
                        {openDraftCount === 1 ? "" : "s"}
                      </Button>
                    ) : null}
                  </>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-[rgb(var(--bp-border))] bg-transparent text-[rgb(var(--bp-fg-soft))] hover:bg-[rgb(var(--bp-hover))] hover:text-[rgb(var(--bp-fg))]"
                  asChild
                >
                  <Link
                    href={`${APP_ROUTES.suppliers}?supplier=${encodeURIComponent(detail.id)}`}
                  >
                    View products
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 rounded-xl border-[rgb(var(--bp-border))] bg-transparent text-[rgb(var(--bp-fg-soft))] hover:bg-[rgb(var(--bp-hover))] hover:text-[rgb(var(--bp-fg))]"
                  asChild
                >
                  <Link
                    href={`${APP_ROUTES.suppliers}?supplier=${encodeURIComponent(detail.id)}&tab=history`}
                  >
                    <FileText className="size-4" />
                    Order history
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      <ButcherAddStockDialog
        open={stockOpen}
        onOpenChange={(open) => {
          setStockOpen(open);
          if (!open) setStockSessionId(null);
        }}
        suppliers={rows}
        initialSupplierId={selectedId}
        initialSessionId={stockSessionId}
        currency={currency}
        onCompleted={() => {
          void loadList();
          if (selectedId) void loadDetail(selectedId);
        }}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className={cn(dialogSurfaceClass, "sm:max-w-md")}
          style={brandTheme as CSSProperties}
        >
          <form onSubmit={(e) => void onAddSupplier(e)}>
            <DialogHeader>
              <DialogTitle>Add supplier</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[rgb(var(--bp-fg-faint))]">
                  Company name
                </span>
                <input
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className={butcherInputClass}
                  placeholder="Farmgate Meats Ltd"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[rgb(var(--bp-fg-faint))]">
                  Contact person
                </span>
                <input
                  value={addContact}
                  onChange={(e) => setAddContact(e.target.value)}
                  className={butcherInputClass}
                  placeholder="Peter Mwangi"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[rgb(var(--bp-fg-faint))]">Phone</span>
                <input
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  className={butcherInputClass}
                  placeholder="+254…"
                />
              </label>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                className="text-[rgb(var(--bp-fg-faint))]"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addBusy}
                className={butcherChargeButtonClass}
                style={{
                  backgroundColor: "var(--pos-primary)",
                  color: "var(--pos-primary-ink)",
                }}
              >
                {addBusy ? "Saving…" : "Add supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
