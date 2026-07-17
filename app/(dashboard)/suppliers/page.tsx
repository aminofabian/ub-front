"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  Link2,
  PackagePlus,
  PencilLine,
  Receipt,
  RefreshCw,
  Search,
  Truck,
  UserPlus,
} from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import {
  addItemSupplierLink,
  createSupplier,
  createSupplierContact,
  deleteItemSupplierLink,
  deleteSupplier,
  fetchSupplierById,
  fetchSupplierContacts,
  fetchSupplierItemLinks,
  fetchSuppliersPage,
  patchSupplier,
  postItemSupplierLinkSetPrimary,
  type CreateSupplierContactPayload,
  type CreateSupplierPayload,
  type SupplierContactRecord,
  type SupplierItemLinkRecord,
  type SupplierPurchaseHistoryOrderRecord,
  type SupplierRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  canLinkSupplierProducts,
  canWriteSuppliers,
} from "@/lib/supplier-access";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { SupplierCatalogColumn } from "./_components/SupplierCatalogColumn";
import { SupplierSupplyInvoicePanel } from "./_components/SupplierSupplyInvoicePanel";
import { SupplierEditColumn } from "./_components/SupplierEditColumn";
import {
  EMPTY_SUPPLIER_PROFILE,
  SupplierProfileFields,
  supplierRecordToProfileDraft,
  type SupplierProfileDraft,
} from "./_components/supplier-profile-shared";
import { NewSupplierForm } from "./_components/NewSupplierForm";
import { SupDrawerFooter, SupMobileSelectionBar } from "./_components/supplier-layout-primitives";
import { SupplierPageHeader } from "./_components/SupplierPageHeader";
import { NewSupplyDrawer } from "../supplies/_components/new-supply-drawer";
import {
  supFieldLabel,
  supInput,
  supPanelBodyFill,
  supPanelHeader,
  supPanelHeaderIcon,
  supWorkspaceShell,
} from "./_components/supplier-ui-tokens";
import { VirtualizedSupplierList } from "./_components/VirtualizedSupplierList";

export default function SuppliersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    me,
    business,
    loading,
    branchId: headerBranchId,
    canPathBWrite,
    canViewSuppliers,
    canViewCategories,
    canViewMarketplace,
  } = useDashboard();
  const stockBranchId = headerBranchId?.trim() || undefined;
  const canRead = hasPermission(me?.permissions, Permission.SuppliersRead);
  const canWrite = canWriteSuppliers(me, business);
  const canOpenNewSupply =
    canPathBWrite && canViewSuppliers && canViewCategories;
  const canReadCatalog = hasPermission(
    me?.permissions,
    Permission.CatalogItemsRead,
  );
  const canLinkProducts = canLinkSupplierProducts(me, business);

  const selectionRef = useRef<string | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    kind: "error" | "success";
  } | null>(null);
  const [rows, setRows] = useState<SupplierRecord[]>([]);
  const [listTotalElements, setListTotalElements] = useState(0);
  const [listLast, setListLast] = useState(true);
  const [listLoadingInitial, setListLoadingInitial] = useState(false);
  const [listLoadingMore, setListLoadingMore] = useState(false);
  const nextListPageRef = useRef(0);
  const [listSearch, setListSearch] = useState("");
  const [debouncedListSearch, setDebouncedListSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupplierRecord | null>(null);
  const [contacts, setContacts] = useState<SupplierContactRecord[]>([]);
  const [patchDraft, setPatchDraft] = useState<SupplierProfileDraft>(
    EMPTY_SUPPLIER_PROFILE,
  );
  const [createDraft, setCreateDraft] = useState<SupplierProfileDraft>(
    EMPTY_SUPPLIER_PROFILE,
  );
  const [contactDraft, setContactDraft] =
    useState<CreateSupplierContactPayload>({
      name: "",
      roleLabel: "",
      email: "",
      phone: "",
    });
  const [itemLinks, setItemLinks] = useState<SupplierItemLinkRecord[]>([]);
  const [linksBusy, setLinksBusy] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [newSupplyOpen, setNewSupplyOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] =
    useState<SupplierPurchaseHistoryOrderRecord | null>(null);
  const [invoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false);
  const [purchaseHistoryKey, setPurchaseHistoryKey] = useState(0);
  const [isXl, setIsXl] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [catalogDrawerOpen, setCatalogDrawerOpen] = useState(false);
  const [profileEditDrawerOpen, setProfileEditDrawerOpen] = useState(false);
  const [addContactDrawerOpen, setAddContactDrawerOpen] = useState(false);
  const [deletingSupplierId, setDeletingSupplierId] = useState<string | null>(
    null,
  );
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

  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedListSearch(listSearch.trim()),
      280,
    );
    return () => window.clearTimeout(id);
  }, [listSearch]);

  useEffect(() => {
    if (searchParams.get("onboarding") === "create-supplier" && canWrite) {
      setCreateDrawerOpen(true);
    }
  }, [searchParams, canWrite]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        const t = event.target;
        if (
          t instanceof HTMLInputElement ||
          t instanceof HTMLTextAreaElement ||
          t instanceof HTMLSelectElement
        ) {
          return;
        }
        event.preventDefault();
        document.getElementById("supplier-directory-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const refreshFullDirectory = useCallback(async () => {
    setListLoadingInitial(true);
    setFeedback(null);
    nextListPageRef.current = 0;
    try {
      const page = await fetchSuppliersPage({
        search: debouncedListSearch || undefined,
        status: statusFilter.trim() || undefined,
        page: 0,
        size: 80,
      });
      setRows(page.content);
      setListTotalElements(page.totalElements);
      setListLast(page.last);
      nextListPageRef.current = page.last ? 0 : 1;
    } catch (error) {
      setFeedback({
        text:
          error instanceof Error ? error.message : "Failed to load suppliers.",
        kind: "error",
      });
    } finally {
      setListLoadingInitial(false);
    }
  }, [debouncedListSearch, statusFilter]);

  const loadMoreDirectory = useCallback(async () => {
    if (
      listLast ||
      listLoadingMore ||
      listLoadingInitial ||
      nextListPageRef.current <= 0
    ) {
      return;
    }
    setListLoadingMore(true);
    try {
      const pagen = nextListPageRef.current;
      const page = await fetchSuppliersPage({
        search: debouncedListSearch || undefined,
        status: statusFilter.trim() || undefined,
        page: pagen,
        size: 80,
      });
      setRows((prev) => [...prev, ...page.content]);
      setListLast(page.last);
      nextListPageRef.current = page.last ? 0 : pagen + 1;
    } catch (error) {
      setFeedback({
        text:
          error instanceof Error
            ? error.message
            : "Failed to load more suppliers.",
        kind: "error",
      });
    } finally {
      setListLoadingMore(false);
    }
  }, [
    listLast,
    listLoadingMore,
    listLoadingInitial,
    debouncedListSearch,
    statusFilter,
  ]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => setIsXl(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!detail) {
      setEditDrawerOpen(false);
      setCatalogDrawerOpen(false);
      setProfileEditDrawerOpen(false);
      setAddContactDrawerOpen(false);
      setSelectedInvoice(null);
      setInvoiceDrawerOpen(false);
    }
  }, [detail]);

  const handleSelectInvoice = useCallback(
    (order: SupplierPurchaseHistoryOrderRecord) => {
      setSelectedInvoice(order);
      if (!isXl) {
        setInvoiceDrawerOpen(true);
      }
    },
    [isXl],
  );

  useEffect(() => {
    if (isXl) {
      setEditDrawerOpen(false);
      setCatalogDrawerOpen(false);
    }
  }, [isXl]);

  const refreshList = refreshFullDirectory;

  useEffect(() => {
    if (loading || !canRead) {
      return;
    }
    void refreshList();
  }, [loading, canRead, refreshList]);

  const onSelectSupplier = async (id: string) => {
    selectionRef.current = id;
    setSelectedId(id);
    setSelectedInvoice(null);
    setInvoiceDrawerOpen(false);
    setFeedback(null);
    try {
      const [d, c, links] = await Promise.all([
        fetchSupplierById(id),
        fetchSupplierContacts(id),
        canReadCatalog
          ? fetchSupplierItemLinks(id, { branchId: stockBranchId })
          : Promise.resolve([]),
      ]);
      if (selectionRef.current !== id) {
        return;
      }
      setDetail(d);
      setContacts(c);
      setItemLinks(links);
      setPatchDraft(supplierRecordToProfileDraft(d));
    } catch (error) {
      if (selectionRef.current === id) {
        setDetail(null);
        setContacts([]);
        setItemLinks([]);
        setFeedback({
          text:
            error instanceof Error ? error.message : "Failed to load supplier.",
          kind: "error",
        });
      }
    }
  };

  const onEditSupplierFromList = useCallback(
    async (id: string) => {
      if (!canWrite) return;
      await onSelectSupplier(id);
      setProfileEditDrawerOpen(true);
    },
    // onSelectSupplier closes over latest canReadCatalog / stockBranchId via render
    // eslint-disable-next-line react-hooks/exhaustive-deps -- select uses current scope
    [canWrite],
  );

  const onDeleteSupplierFromList = useCallback(
    async (row: SupplierRecord) => {
      if (!canWrite) return;
      if (row.code?.trim() === "SYS-UNASSIGNED") {
        toast.error("Cannot delete the system unassigned supplier.");
        return;
      }
      if (
        !window.confirm(
          `Delete supplier "${row.name}"? They will be removed from the directory. This cannot be undone from here.`,
        )
      ) {
        return;
      }
      setDeletingSupplierId(row.id);
      try {
        await deleteSupplier(row.id);
        toast.success(`Deleted ${row.name}.`);
        if (selectedId === row.id) {
          selectionRef.current = null;
          setSelectedId(null);
          setDetail(null);
          setContacts([]);
          setItemLinks([]);
          setSelectedInvoice(null);
          setProfileEditDrawerOpen(false);
          setEditDrawerOpen(false);
        }
        await refreshFullDirectory();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete supplier.");
      } finally {
        setDeletingSupplierId(null);
      }
    },
    [canWrite, refreshFullDirectory, selectedId],
  );

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createDraft.name.trim()) {
      return;
    }
    setFeedback(null);
    try {
      const codeTrim = createDraft.code.trim();
      const creditTermsRaw = createDraft.creditTermsDays.trim();
      let creditTermsDays: number | undefined;
      if (creditTermsRaw.length > 0) {
        const n = parseInt(creditTermsRaw, 10);
        if (!Number.isFinite(n) || n < 0) {
          setFeedback({
            text: "Credit terms must be a non-negative whole number.",
            kind: "error",
          });
          return;
        }
        creditTermsDays = n;
      }
      const creditLimitRaw = createDraft.creditLimit.trim();
      let creditLimit: number | undefined;
      if (creditLimitRaw.length > 0) {
        const n = Number(creditLimitRaw);
        if (!Number.isFinite(n) || n < 0) {
          setFeedback({
            text: "Credit limit must be a valid non-negative number.",
            kind: "error",
          });
          return;
        }
        creditLimit = n;
      }
      const vatTrim = createDraft.vatPin.trim();
      const payPrefTrim = createDraft.paymentMethodPreferred.trim();
      const body: CreateSupplierPayload = {
        name: createDraft.name.trim(),
        ...(codeTrim ? { code: codeTrim } : {}),
        supplierType: createDraft.supplierType.trim() || undefined,
        status: createDraft.status.trim() || undefined,
        notes: createDraft.notes.trim() || undefined,
        ...(vatTrim ? { vatPin: vatTrim } : {}),
        taxExempt: createDraft.taxExempt,
        ...(creditTermsDays != null ? { creditTermsDays } : {}),
        ...(creditLimit != null ? { creditLimit } : {}),
        ...(payPrefTrim ? { paymentMethodPreferred: payPrefTrim } : {}),
        ...(createDraft.paymentDetails.trim()
          ? { paymentDetails: createDraft.paymentDetails.trim() }
          : {}),
        ...(createDraft.payoutType.trim()
          ? { payoutType: createDraft.payoutType.trim() }
          : {}),
        ...(createDraft.payoutPhone.trim()
          ? { payoutPhone: createDraft.payoutPhone.trim() }
          : {}),
      };
      const created = await createSupplier(body);
      const contactPhone = createDraft.contactPhone.trim();
      const contactEmail = createDraft.contactEmail.trim();
      const contactName = createDraft.contactName.trim();
      if (contactPhone || contactEmail || contactName) {
        await createSupplierContact(created.id, {
          name: contactName || createDraft.name.trim(),
          phone: contactPhone || undefined,
          email: contactEmail || undefined,
          primaryContact: true,
        });
      }
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
      const creditTermsRaw = patchDraft.creditTermsDays.trim();
      let creditTermsDays: number | undefined;
      if (creditTermsRaw.length > 0) {
        const n = parseInt(creditTermsRaw, 10);
        if (!Number.isFinite(n) || n < 0) {
          setFeedback({
            text: "Credit terms must be a non-negative whole number.",
            kind: "error",
          });
          return;
        }
        creditTermsDays = n;
      }
      const creditLimitRaw = patchDraft.creditLimit.trim();
      let creditLimit: number | undefined;
      if (creditLimitRaw.length > 0) {
        const n = Number(creditLimitRaw);
        if (!Number.isFinite(n) || n < 0) {
          setFeedback({
            text: "Credit limit must be a valid non-negative number.",
            kind: "error",
          });
          return;
        }
        creditLimit = n;
      }
      const next = await patchSupplier(selectedId, {
        name: patchDraft.name.trim(),
        code: codeTrim.length > 0 ? codeTrim : "",
        supplierType: patchDraft.supplierType.trim() || undefined,
        status: patchDraft.status.trim() || undefined,
        notes: patchDraft.notes.trim(),
        vatPin: patchDraft.vatPin.trim(),
        taxExempt: patchDraft.taxExempt,
        ...(creditTermsDays != null ? { creditTermsDays } : {}),
        ...(creditLimit != null ? { creditLimit } : {}),
        paymentMethodPreferred: patchDraft.paymentMethodPreferred.trim(),
        paymentDetails: patchDraft.paymentDetails.trim(),
        payoutType: patchDraft.payoutType.trim() || undefined,
        payoutPhone:
          patchDraft.payoutType === "mobile_wallet"
            ? patchDraft.payoutPhone.trim() || null
            : null,
      });
      setDetail(next);
      setPatchDraft(supplierRecordToProfileDraft(next));
      await refreshList();
      setProfileEditDrawerOpen(false);
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
      setItemLinks(
        await fetchSupplierItemLinks(selectedId, { branchId: stockBranchId }),
      );
    } catch {
      /* keep existing list */
    }
  }, [selectedId, canReadCatalog, stockBranchId]);

  const prevStockBranchRef = useRef(stockBranchId);
  useEffect(() => {
    const prev = prevStockBranchRef.current;
    prevStockBranchRef.current = stockBranchId;
    if (prev === stockBranchId || !selectedId || !canReadCatalog) {
      return;
    }
    void refreshItemLinks();
  }, [stockBranchId, selectedId, canReadCatalog, refreshItemLinks]);

  const onLinkCatalogItems = async (
    itemIds: string[],
    opts: {
      supplierSku?: string;
      defaultCostPrice?: number;
      setPrimaryForFirst?: boolean;
    },
  ) => {
    if (!selectedId || itemIds.length === 0) {
      throw new Error("Nothing to link.");
    }
    if (!canLinkProducts) {
      throw new Error("Not allowed.");
    }
    setLinksBusy(true);
    setFeedback(null);
    try {
      let primaryLeft = opts.setPrimaryForFirst === true;
      for (const itemId of itemIds) {
        await addItemSupplierLink(itemId, {
          supplierId: selectedId,
          supplierSku: opts.supplierSku,
          defaultCostPrice: opts.defaultCostPrice,
          setPrimary: primaryLeft ? true : undefined,
        });
        primaryLeft = false;
      }
      await refreshItemLinks();
      setFeedback({
        text:
          itemIds.length === 1
            ? "Product linked to this supplier."
            : `Linked ${itemIds.length} products.`,
        kind: "success",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Link failed.";
      setFeedback({ text: msg, kind: "error" });
      throw error instanceof Error ? error : new Error(msg);
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
      setFeedback({
        text: "Primary supplier updated for that product.",
        kind: "success",
      });
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
      setAddContactDrawerOpen(false);
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
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {Permission.SuppliersRead}
            </code>{" "}
            to view suppliers.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  const statusOptions = [
    { value: "", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "blocked", label: "Blocked" },
  ] as const;

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-2.5 pb-20",
        isXl && "h-full min-h-0 max-w-none gap-2 overflow-hidden pb-0",
      )}
    >
      <SupplierPageHeader
        canWrite={canWrite}
        canOpenNewSupply={canOpenNewSupply}
        listLoadingInitial={listLoadingInitial}
        totalCount={listTotalElements}
        onNewSupplier={() => {
          skipCreateDrawerResetAfterCreate.current = false;
          setCreateDrawerOpen(true);
        }}
        onNewSupply={() => setNewSupplyOpen(true)}
      />

      {feedback ? (
        <DashboardFeedback
          kind={feedback.kind === "error" ? "error" : "success"}
          text={feedback.text}
        />
      ) : null}

      <div
        className={cn(
          supWorkspaceShell,
          isXl ? "min-h-0 flex-1" : undefined,
        )}
      >
        <div
          className={cn(
            "grid min-h-0",
            isXl
              ? "min-h-0 flex-1 grid-cols-[minmax(15rem,18rem)_minmax(17rem,20rem)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] items-stretch overflow-hidden divide-x divide-border/50"
              : "gap-0",
          )}
        >
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-col",
              isXl ? "overflow-hidden" : "max-h-[calc(100dvh-11rem)]",
            )}
          >
            <div
              className={cn(
                "flex shrink-0 flex-col gap-1.5 border-b border-border bg-[#eef2f7] px-2 py-1.5 dark:bg-muted/25",
                isXl && "gap-1 px-2 py-1.5",
              )}
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70"
                  aria-hidden
                />
                <input
                  id="supplier-directory-search"
                  className={cn(
                    dashboardInputClass(listLoadingInitial),
                    "h-8 rounded-none border-border bg-background pl-8 text-sm focus-visible:ring-1 focus-visible:ring-primary/30",
                  )}
                  placeholder="Search name or code…"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  aria-label="Search suppliers"
                />
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="flex min-w-0 flex-1 flex-wrap"
                  role="group"
                  aria-label="Filter by status"
                >
                  {statusOptions.map((opt, i) => {
                    const active = statusFilter === opt.value;
                    return (
                      <button
                        key={opt.value || "all"}
                        type="button"
                        disabled={listLoadingInitial}
                        onClick={() => setStatusFilter(opt.value)}
                        className={cn(
                          "border border-border px-2 py-0.5 text-[11px] font-semibold transition-colors",
                          i > 0 && "-ml-px",
                          active
                            ? "relative z-[1] border-primary/40 bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "shrink-0 rounded-none border border-border bg-background px-1.5 text-muted-foreground hover:text-foreground",
                    isXl ? "size-7" : "h-7 gap-1 px-2 text-xs",
                  )}
                  disabled={listLoadingInitial}
                  onClick={() => void refreshFullDirectory()}
                  aria-label={
                    listLoadingInitial
                      ? "Loading suppliers"
                      : "Refresh supplier list"
                  }
                >
                  <RefreshCw
                    className={cn(
                      "size-3.5",
                      listLoadingInitial && "animate-spin",
                    )}
                    aria-hidden
                  />
                  {!isXl ? (
                    <span>{listLoadingInitial ? "…" : "Refresh"}</span>
                  ) : null}
                </Button>
              </div>
            </div>

            <VirtualizedSupplierList
              compact={isXl}
              rows={rows}
              selectedId={selectedId}
              totalLoaded={rows.length}
              totalElements={listTotalElements}
              onRowClick={(id) => void onSelectSupplier(id)}
              canWrite={canWrite}
              deletingId={deletingSupplierId}
              onEdit={(id) => void onEditSupplierFromList(id)}
              onDelete={(row) => void onDeleteSupplierFromList(row)}
              loadingInitial={listLoadingInitial}
              loadingMore={listLoadingMore}
              hasMore={!listLast}
              onLoadMore={loadMoreDirectory}
            />

            {!isXl && detail ? (
              <div className="border-t border-border/50 p-3">
                <SupMobileSelectionBar name={detail.name}>
                  <Button
                    type="button"
                    size="sm"
                    className="h-10 min-h-10 flex-1 gap-1.5 rounded-lg shadow-sm"
                    onClick={() => setEditDrawerOpen(true)}
                  >
                    <Building2 className="size-3.5" aria-hidden />
                    Profile
                  </Button>
                  {canReadCatalog ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 min-h-10 flex-1 gap-1.5 rounded-lg"
                      onClick={() => setCatalogDrawerOpen(true)}
                    >
                      <Link2 className="size-3.5" aria-hidden />
                      Catalog
                    </Button>
                  ) : null}
                  {canOpenNewSupply ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 min-h-10 flex-1 gap-1.5 rounded-lg"
                      onClick={() => setNewSupplyOpen(true)}
                    >
                      <PackagePlus className="size-3.5" aria-hidden />
                      Supply
                    </Button>
                  ) : null}
                </SupMobileSelectionBar>
              </div>
            ) : null}
          </div>

          {isXl ? (
            <>
              <aside
                className={cn(
                  "flex min-h-0 flex-col overflow-hidden bg-card",
                )}
              >
                <div className={cn(supPanelHeader)}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={supPanelHeaderIcon()}>
                      <Building2 className="size-3" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Profile
                      </p>
                      <p className="truncate text-xs font-semibold leading-tight text-foreground">
                        {detail?.name ?? "Select a supplier"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                  <SupplierEditColumn
                    variant="sidebar"
                    detail={detail}
                    contacts={contacts}
                    canWrite={canWrite}
                    selectedInvoiceId={
                      selectedInvoice?.supplierInvoiceId ?? null
                    }
                    onSelectInvoice={handleSelectInvoice}
                    purchaseHistoryRefreshKey={purchaseHistoryKey}
                    onEditProfile={
                      canWrite
                        ? () => {
                            setProfileEditDrawerOpen(true);
                          }
                        : undefined
                    }
                    onAddContact={
                      canWrite
                        ? () => {
                            setAddContactDrawerOpen(true);
                          }
                        : undefined
                    }
                  />
                </div>
              </aside>
              <aside className="flex min-h-0 flex-col overflow-hidden bg-card">
                <div className={cn(supPanelHeader)}>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {selectedInvoice ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 gap-1 rounded-md px-2 text-xs"
                          onClick={() => setSelectedInvoice(null)}
                        >
                          <ChevronLeft className="size-3.5" aria-hidden />
                          Back
                        </Button>
                        <span className={supPanelHeaderIcon()}>
                          <Receipt className="size-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Invoice
                          </p>
                          <p className="truncate text-sm font-semibold leading-tight text-foreground">
                            {selectedInvoice.invoiceNumber}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className={supPanelHeaderIcon()}>
                          <Link2 className="size-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Catalog
                          </p>
                          <p className="truncate text-sm font-semibold leading-tight text-foreground">
                            {detail?.name
                              ? `Linked products`
                              : "Select a supplier"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className={cn(supPanelBodyFill, "p-0")}>
                  {selectedInvoice ? (
                    <SupplierSupplyInvoicePanel
                      invoiceId={selectedInvoice.supplierInvoiceId}
                      onUpdated={() =>
                        setPurchaseHistoryKey((k) => k + 1)
                      }
                    />
                  ) : (
                    <SupplierCatalogColumn
                      detail={detail}
                      canReadCatalog={canReadCatalog}
                      canLinkProducts={canLinkProducts}
                      itemLinks={itemLinks}
                      linksBusy={linksBusy}
                      onRemoveLink={onRemoveLink}
                      onSetPrimaryLink={onSetPrimaryLink}
                      onLinkCatalogItems={onLinkCatalogItems}
                      onRefreshLinks={refreshItemLinks}
                    />
                  )}
                </div>
              </aside>
            </>
          ) : null}
        </div>
      </div>

      {!isXl ? (
        <>
          <FormDrawer
            open={editDrawerOpen}
            onOpenChange={setEditDrawerOpen}
            title="Supplier details"
            description="Overview, commercial data, and contacts. Use the buttons below to edit the profile or add a contact."
            contextLabel="Supplier record"
            icon={<PencilLine className="size-5 text-primary" aria-hidden />}
            width="wide"
            footer={
              <SupDrawerFooter
                onCancel={() => setEditDrawerOpen(false)}
                cancelLabel="Close"
              />
            }
          >
            <SupplierEditColumn
              detail={detail}
              contacts={contacts}
              canWrite={canWrite}
              selectedInvoiceId={selectedInvoice?.supplierInvoiceId ?? null}
              onSelectInvoice={handleSelectInvoice}
              purchaseHistoryRefreshKey={purchaseHistoryKey}
              onEditProfile={
                canWrite
                  ? () => {
                      setEditDrawerOpen(false);
                      setProfileEditDrawerOpen(true);
                    }
                  : undefined
              }
              onAddContact={
                canWrite
                  ? () => {
                      setEditDrawerOpen(false);
                      setAddContactDrawerOpen(true);
                    }
                  : undefined
              }
            />
          </FormDrawer>

          <FormDrawer
            open={catalogDrawerOpen}
            onOpenChange={setCatalogDrawerOpen}
            title="Catalog & links"
            description="Browse the full catalog with filters and multi-select to attach items."
            contextLabel="Catalog"
            icon={
              <Link2
                className="size-5 text-primary"
                aria-hidden
              />
            }
            width="wide"
            footer={
              <SupDrawerFooter
                onCancel={() => setCatalogDrawerOpen(false)}
                cancelLabel="Close"
              />
            }
          >
            <SupplierCatalogColumn
              detail={detail}
              canReadCatalog={canReadCatalog}
              canLinkProducts={canLinkProducts}
              itemLinks={itemLinks}
              linksBusy={linksBusy}
              onRemoveLink={onRemoveLink}
              onSetPrimaryLink={onSetPrimaryLink}
              onLinkCatalogItems={onLinkCatalogItems}
              onRefreshLinks={refreshItemLinks}
            />
          </FormDrawer>

          <FormDrawer
            open={invoiceDrawerOpen}
            onOpenChange={(open) => {
              setInvoiceDrawerOpen(open);
              if (!open) {
                setSelectedInvoice(null);
              }
            }}
            title={selectedInvoice?.invoiceNumber ?? "Supply bill"}
            contextLabel="Purchase"
            icon={<Receipt className="size-5 text-primary" aria-hidden />}
            width="wide"
            footer={
              <SupDrawerFooter
                onCancel={() => {
                  setInvoiceDrawerOpen(false);
                  setSelectedInvoice(null);
                }}
                cancelLabel="Close"
              />
            }
          >
            <SupplierSupplyInvoicePanel
              invoiceId={selectedInvoice?.supplierInvoiceId ?? null}
              onUpdated={() => setPurchaseHistoryKey((k) => k + 1)}
            />
          </FormDrawer>
        </>
      ) : null}

      {canWrite && detail ? (
        <>
          <FormDrawer
            open={profileEditDrawerOpen}
            onOpenChange={setProfileEditDrawerOpen}
            title="Edit profile"
            description="Identity, notes, commercial data, and payment instructions."
            contextLabel="Workspace"
            icon={<PencilLine className="size-5 text-primary" aria-hidden />}
            width="wide"
            footer={
              <SupDrawerFooter
                onCancel={() => setProfileEditDrawerOpen(false)}
                submitLabel="Save changes"
                submitForm="supplier-patch-form"
              />
            }
          >
            <form
              id="supplier-patch-form"
              className="space-y-8"
              onSubmit={onPatchSave}
            >
              <FormDrawerFields
                legend="Supplier profile"
                hint="All changes save to this supplier record and sync to the directory list."
              >
                <SupplierProfileFields
                  draft={patchDraft}
                  onDraftChange={(partial) =>
                    setPatchDraft((p) => ({ ...p, ...partial }))
                  }
                />
              </FormDrawerFields>
            </form>
          </FormDrawer>

          <FormDrawer
            open={addContactDrawerOpen}
            onOpenChange={setAddContactDrawerOpen}
            title="Add contact"
            description="Optional fields — include at least one way to reach this person."
            contextLabel="Workspace"
            icon={<UserPlus className="size-5 text-primary" aria-hidden />}
            width="wide"
            footer={
              <SupDrawerFooter
                onCancel={() => setAddContactDrawerOpen(false)}
                submitLabel="Add contact"
                submitForm="supplier-add-contact-form"
              />
            }
          >
            <form
              id="supplier-add-contact-form"
              className="space-y-5"
              onSubmit={onAddContact}
            >
              <FormDrawerFields
                legend="Contact details"
                hint="Stored against this supplier only."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className={supFieldLabel}>Full name</span>
                    <input
                      className={supInput}
                      placeholder="e.g. Jane Smith"
                      value={contactDraft.name ?? ""}
                      onChange={(e) =>
                        setContactDraft((d) => ({ ...d, name: e.target.value }))
                      }
                      aria-label="Contact name"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={supFieldLabel}>Role / title</span>
                    <input
                      className={supInput}
                      placeholder="Optional"
                      value={contactDraft.roleLabel ?? ""}
                      onChange={(e) =>
                        setContactDraft((d) => ({
                          ...d,
                          roleLabel: e.target.value,
                        }))
                      }
                      aria-label="Role or title"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={supFieldLabel}>Email</span>
                    <input
                      className={supInput}
                      placeholder="name@company.com"
                      type="email"
                      value={contactDraft.email ?? ""}
                      onChange={(e) =>
                        setContactDraft((d) => ({
                          ...d,
                          email: e.target.value,
                        }))
                      }
                      aria-label="Email"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className={supFieldLabel}>Phone</span>
                    <input
                      className={supInput}
                      placeholder="Optional"
                      value={contactDraft.phone ?? ""}
                      onChange={(e) =>
                        setContactDraft((d) => ({
                          ...d,
                          phone: e.target.value,
                        }))
                      }
                      aria-label="Phone"
                    />
                  </label>
                </div>
              </FormDrawerFields>
            </form>
          </FormDrawer>
        </>
      ) : null}

      {canWrite ? (
        <FormDrawer
          open={createDrawerOpen}
          onboardingTarget={ONBOARDING_TARGETS.supplierDrawer}
          onOpenChange={onCreateDrawerOpenChange}
          title="New supplier"
          description="Connect a marketplace vendor for catalogue import and portal POs, or create a private supplier record below."
          contextLabel="Purchasing"
          icon={<Truck className="size-5 text-primary" aria-hidden />}
          width="wide"
          footer={
            <SupDrawerFooter
              onCancel={() => onCreateDrawerOpenChange(false)}
              submitLabel={canViewMarketplace ? "Create private supplier" : "Create supplier"}
              submitForm="new-supplier-form"
            />
          }
        >
          <form
            id="new-supplier-form"
            className="space-y-8"
            onSubmit={onCreate}
          >
            <NewSupplierForm
              draft={createDraft}
              onDraftChange={(partial) =>
                setCreateDraft((d) => ({ ...d, ...partial }))
              }
              canViewMarketplace={canViewMarketplace}
              onBrowseMarketplace={() => {
                setCreateDrawerOpen(false);
                router.push(APP_ROUTES.marketplace);
              }}
            />
          </form>
        </FormDrawer>
      ) : null}

      {canOpenNewSupply ? (
        <NewSupplyDrawer
          open={newSupplyOpen}
          onOpenChange={setNewSupplyOpen}
          onPosted={() => {
            if (selectedId) {
              void refreshItemLinks();
            }
          }}
          initialSupplier={detail}
        />
      ) : null}
    </div>
  );
}
