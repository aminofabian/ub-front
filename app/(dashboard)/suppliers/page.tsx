"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Link2,
  PencilLine,
  RefreshCw,
  Search,
  Truck,
  UserPlus,
} from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  dashboardFilterFieldLabelClass,
  dashboardInputClass,
  dashboardSelectClass,
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
  type SupplierRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { SupplierCatalogColumn } from "./_components/SupplierCatalogColumn";
import { SupplierEditColumn } from "./_components/SupplierEditColumn";
import {
  EMPTY_SUPPLIER_PROFILE,
  SupplierProfileFields,
  type SupplierProfileDraft,
} from "./_components/supplier-profile-shared";
import { SupDrawerFooter, SupMobileSelectionBar, SupWorkflowRail } from "./_components/supplier-layout-primitives";
import { SupplierPageHeader } from "./_components/SupplierPageHeader";
import {
  supFieldLabel,
  supFilterRail,
  supInput,
  supKickerPrimary,
  supKickerViolet,
  supPanelBody,
  supPanelBodyFill,
  supPanelHeader,
  supPanelHeaderIcon,
  supPanelShell,
  supPageRoot,
  supWorkspaceInner,
  supWorkspaceShell,
} from "./_components/supplier-ui-tokens";
import { VirtualizedSupplierList } from "./_components/VirtualizedSupplierList";

export default function SuppliersPage() {
  const searchParams = useSearchParams();
  const { me, loading } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.SuppliersRead);
  const canWrite = hasPermission(me?.permissions, Permission.SuppliersWrite);
  const canReadCatalog = hasPermission(
    me?.permissions,
    Permission.CatalogItemsRead,
  );
  const canLinkProducts = hasPermission(
    me?.permissions,
    Permission.CatalogItemsLinkSuppliers,
  );

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
  const [isXl, setIsXl] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [catalogDrawerOpen, setCatalogDrawerOpen] = useState(false);
  const [profileEditDrawerOpen, setProfileEditDrawerOpen] = useState(false);
  const [addContactDrawerOpen, setAddContactDrawerOpen] = useState(false);
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
    }
  }, [detail]);

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
    setFeedback(null);
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
        vatPin: d.vatPin ?? "",
        taxExempt: Boolean(d.taxExempt),
        creditTermsDays:
          d.creditTermsDays != null ? String(d.creditTermsDays) : "",
        creditLimit:
          d.creditLimit != null && Number.isFinite(Number(d.creditLimit))
            ? String(d.creditLimit)
            : "",
        paymentMethodPreferred: d.paymentMethodPreferred ?? "",
        paymentDetails: d.paymentDetails ?? "",
        payoutType: d.payoutType ?? "manual",
        payoutPhone: d.payoutPhone ?? "",
      });
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
      setPatchDraft({
        name: next.name,
        code: next.code ?? "",
        supplierType: next.supplierType,
        status: next.status,
        notes: next.notes ?? "",
        vatPin: next.vatPin ?? "",
        taxExempt: Boolean(next.taxExempt),
        creditTermsDays:
          next.creditTermsDays != null ? String(next.creditTermsDays) : "",
        creditLimit:
          next.creditLimit != null && Number.isFinite(Number(next.creditLimit))
            ? String(next.creditLimit)
            : "",
        paymentMethodPreferred: next.paymentMethodPreferred ?? "",
        paymentDetails: next.paymentDetails ?? "",
        payoutType: next.payoutType ?? "manual",
        payoutPhone: next.payoutPhone ?? "",
      });
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
      setItemLinks(await fetchSupplierItemLinks(selectedId));
    } catch {
      /* keep existing list */
    }
  }, [selectedId, canReadCatalog]);

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

  return (
    <div
      className={cn(
        supPageRoot,
        "-mx-4 w-[calc(100%+2rem)] gap-4 px-3 pb-6 sm:px-4 md:-mx-6 md:w-[calc(100%+3rem)] md:px-4 lg:gap-5",
      )}
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:gap-5">
        <SupplierPageHeader
          canWrite={canWrite}
          listLoadingInitial={listLoadingInitial}
          onNewSupplier={() => {
            skipCreateDrawerResetAfterCreate.current = false;
            setCreateDrawerOpen(true);
          }}
        />

        {feedback ? (
          <DashboardFeedback
            kind={feedback.kind === "error" ? "error" : "success"}
            text={feedback.text}
          />
        ) : null}

        <div className={cn(supWorkspaceShell, isXl && "min-h-0 flex-1")}>
          <div className={cn(supWorkspaceInner, isXl && "min-h-0 flex-1 overflow-hidden")}>
            {isXl ? (
              <SupWorkflowRail
                steps={[
                  { n: 1, label: "Directory" },
                  { n: 2, label: "Profile" },
                  { n: 3, label: "Catalog" },
                ]}
                activeLabel={detail?.name ?? null}
              />
            ) : null}

            <div
              className={cn(
                "grid min-h-0 gap-4 lg:gap-5",
                isXl &&
                  "min-h-0 flex-1 xl:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden",
              )}
            >
              <div
                className={cn(
                  "flex min-h-0 min-w-0 flex-col gap-3",
                  isXl && "overflow-hidden",
                )}
              >
                <div className={supFilterRail}>
                  <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5">
                    <span className={dashboardFilterFieldLabelClass()}>Search</span>
                    <span className="relative">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80"
                        aria-hidden
                      />
                      <input
                        id="supplier-directory-search"
                        className={cn(
                          dashboardInputClass(listLoadingInitial),
                          "h-10 rounded-lg pl-10 transition-shadow focus-visible:shadow-sm",
                        )}
                        placeholder="Name or vendor code…"
                        value={listSearch}
                        onChange={(e) => setListSearch(e.target.value)}
                        aria-label="Search suppliers"
                      />
                    </span>
                  </label>
                  <label className="flex min-w-[8.5rem] flex-col gap-1.5">
                    <span className={dashboardFilterFieldLabelClass()}>Status</span>
                    <select
                      className={cn(
                        dashboardSelectClass(listLoadingInitial),
                        "h-10 rounded-lg",
                      )}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      aria-label="Filter by status"
                    >
                      <option value="">All statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0 gap-1.5 rounded-lg px-3.5 font-medium"
                    disabled={listLoadingInitial}
                    onClick={() => void refreshFullDirectory()}
                  >
                    <RefreshCw
                      className={cn("size-3.5", listLoadingInitial && "animate-spin")}
                      aria-hidden
                    />
                    {listLoadingInitial ? "Loading…" : "Refresh"}
                  </Button>
                </div>
                <VirtualizedSupplierList
              rows={rows}
              selectedId={selectedId}
              totalLoaded={rows.length}
              totalElements={listTotalElements}
              onRowClick={(id) => void onSelectSupplier(id)}
              loadingInitial={listLoadingInitial}
              loadingMore={listLoadingMore}
              hasMore={!listLast}
              onLoadMore={loadMoreDirectory}
            />
                {!isXl && detail ? (
                  <SupMobileSelectionBar name={detail.name}>
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 min-h-9 flex-1 gap-1.5 rounded-lg shadow-sm"
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
                        className="h-9 min-h-9 flex-1 gap-1.5 rounded-lg"
                        onClick={() => setCatalogDrawerOpen(true)}
                      >
                        <Link2 className="size-3.5" aria-hidden />
                        Catalog
                      </Button>
                    ) : null}
                  </SupMobileSelectionBar>
                ) : null}
              </div>

              {isXl ? (
                <>
                  <aside className={supPanelShell}>
                    <div className={supPanelHeader}>
                      <div className="flex items-center gap-3">
                        <span className={supPanelHeaderIcon("primary")}>
                          <Building2 className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className={supKickerPrimary}>Profile &amp; contacts</p>
                          <p className="truncate font-heading text-sm font-semibold tracking-tight text-foreground">
                            {detail?.name ?? "Select a supplier"}
                          </p>
                        </div>
                      </div>
                    </div>
                <div className={supPanelBody}>
                  <SupplierEditColumn
                    detail={detail}
                    contacts={contacts}
                    canWrite={canWrite}
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
                  <aside className={supPanelShell}>
                    <div className={supPanelHeader}>
                      <div className="flex items-center gap-3">
                        <span className={supPanelHeaderIcon("violet")}>
                          <Link2 className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className={supKickerViolet}>Catalog &amp; links</p>
                          <p className="truncate font-heading text-sm font-semibold tracking-tight text-foreground">
                            {detail?.name
                              ? `${detail.name} · SKUs`
                              : "Select a supplier"}
                          </p>
                        </div>
                      </div>
                    </div>
                <div className={supPanelBodyFill}>
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
                </div>
              </aside>
                </>
              ) : null}
            </div>
          </div>
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
                className="size-5 text-violet-600 dark:text-violet-400"
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
          description="Only name is required. You can set commercial and payment fields at create time or later under Edit profile."
          contextLabel="Purchasing"
          icon={<Truck className="size-5 text-primary" aria-hidden />}
          width="wide"
          footer={
            <SupDrawerFooter
              onCancel={() => onCreateDrawerOpenChange(false)}
              submitLabel="Create supplier"
              submitForm="new-supplier-form"
            />
          }
        >
          <form
            id="new-supplier-form"
            className="space-y-8"
            onSubmit={onCreate}
          >
            <FormDrawerFields
              legend="New supplier"
              hint="Name is required; everything else can be completed after create."
            >
              <SupplierProfileFields
                draft={createDraft}
                onDraftChange={(partial) =>
                  setCreateDraft((d) => ({ ...d, ...partial }))
                }
              />
            </FormDrawerFields>
          </form>
        </FormDrawer>
      ) : null}
    </div>
  );
}
