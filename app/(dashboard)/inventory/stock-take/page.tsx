"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSessionItemType, useSyncBranchFilter } from "@/hooks/use-session-scope";
import { useScopeChangeGuard } from "@/hooks/use-scope-change-guard";
import Link from "next/link";
import {
  ArrowRightLeft,
  BarChart3,
  ClipboardList,
  Layers,
  MapPin,
  Package,
  PackageX,
  ScanLine,
  Search,
  Warehouse,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Trash2,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  createItemVariant,
  deleteStockTakeSession,
  fetchActiveStockTakeSession,
  fetchBranches,
  fetchCategories,
  fetchItemTypes,
  fetchItemsPage,
  fetchStockTakeSessions,
  patchStockTakeSingleLine,
  postStockTakeAddLine,
  postStockTakeCreateItemAndAddLine,
  postStockTakeStart,
  recordItemScan,
  type BranchRecord,
  type CategoryRecord,
  type ItemSummaryRecord,
  type StockTakeSessionRecord,
  type StockTakeLineRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { filterInventoryQuickLinksForUser, canStockManagerSeeSystemStockDuringCount } from "@/lib/inventory-access";
import { cn } from "@/lib/utils";
import { StockTakeSearchResults } from "./_components/StockTakeSearchResults";

// ── Helpers ───────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getLineByItemId(
  lines: StockTakeLineRecord[],
  itemId: string,
): StockTakeLineRecord | undefined {
  return lines.find((l) => l.itemId === itemId);
}

type LineStatus = "none" | "submitted" | "confirmed";

function getLineStatus(
  lines: StockTakeLineRecord[],
  itemId: string,
): LineStatus {
  const line = getLineByItemId(lines, itemId);
  if (!line) return "none";
  if (line.status === "confirmed") return "confirmed";
  if (line.status === "submitted") return "submitted";
  return "none";
}

function formatCountedQty(line: StockTakeLineRecord | undefined): string {
  if (!line || line.countedQty == null) return "";
  return String(line.countedQty);
}

/** Return a human-readable label for a stock-take line.
 *  Falls back to SKU or a generic label when the backend sends a raw UUID as itemName. */
function getLineDisplayName(line: StockTakeLineRecord): string {
  const name = line.itemName?.trim();
  if (name && !/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/i.test(name)) {
    return name;
  }
  const sku = line.itemSku?.trim();
  if (sku) return sku;
  return "Unnamed item";
}

// ── Page ──────────────────────────────────────────────────────────────

export default function StockTakePage() {
  const { me, business, setBranchId: setHeaderBranchId } = useDashboard();
  const { itemTypeId: headerItemTypeId } = useSessionItemType();
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const canSeeSystemStock = canStockManagerSeeSystemStockDuringCount(me, business);
  const dailyAuditSampleSize =
    typeof business?.inventory?.stocktake?.dailyAuditSampleSize === "number"
      ? business.inventory.stocktake.dailyAuditSampleSize
      : 25;
  const canManageSettings = hasPermission(
    me?.permissions,
    Permission.BusinessManageSettings,
  );
  const canRun = hasPermission(me?.permissions, Permission.StocktakeRun);
  const canRead = hasPermission(me?.permissions, Permission.StocktakeRead);
  const canApprove = hasPermission(
    me?.permissions,
    Permission.StocktakeApprove,
  );
  const canDelete =
    hasPermission(me?.permissions, Permission.StocktakeDelete) ||
    roleKey === "owner" ||
    roleKey === "admin";
  const allowed = canRead || canRun || canApprove;

  // ── Session state
  const [session, setSession] = useState<StockTakeSessionRecord | null>(null);
  const [hasStaleSession, setHasStaleSession] = useState(false);
  const [staleSessionDate, setStaleSessionDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ── Start session form
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [selBranchId, setSelBranchId] = useState("");
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const { branchLocked } = useSyncBranchFilter({
    value: selBranchId,
    setValue: setSelBranchId,
    availableIds: branches.length > 0 ? branchIds : undefined,
  });
  const onChangeBranch = useCallback(
    (id: string) => {
      setSelBranchId(id);
      if (!branchLocked && id.trim()) setHeaderBranchId(id.trim());
    },
    [branchLocked, setHeaderBranchId],
  );

  useScopeChangeGuard(
    "stock-take-session",
    Boolean(session),
    "An active stock take session is in progress for this branch.",
  );

  const [selSessionType, setSelSessionType] = useState<"morning" | "evening">(
    "morning",
  );
  const [startNotes, setStartNotes] = useState("");

  // ── Search
  const [search, setSearch] = useState("");
  const [searchHits, setSearchHits] = useState<ItemSummaryRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scanner
  const [showScanner, setShowScanner] = useState(false);
  const lastScannedBarcode = useRef<string | null>(null);

  // ── Count modal
  const [countItem, setCountItem] = useState<ItemSummaryRecord | null>(null);
  const [countQty, setCountQty] = useState("");
  const [countAisle, setCountAisle] = useState("");

  // ── Create product modal
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createBarcode, setCreateBarcode] = useState("");
  const [createUnitType, setCreateUnitType] = useState("piece");
  const [createAisle, setCreateAisle] = useState("");
  const [createCount, setCreateCount] = useState("");
  // Variant / standalone
  const [createParentId, setCreateParentId] = useState("");
  const [createParentLabel, setCreateParentLabel] = useState("");
  const [createParentSearch, setCreateParentSearch] = useState("");
  const [createParentHits, setCreateParentHits] = useState<ItemSummaryRecord[]>(
    [],
  );
  const [createParentSearching, setCreateParentSearching] = useState(false);
  // Extended product fields
  const [createCategoryId, setCreateCategoryId] = useState("");
  const [createBrand, setCreateBrand] = useState("");
  const [createSize, setCreateSize] = useState("");
  const [createMode, setCreateMode] = useState<"standalone" | "variant">(
    "standalone",
  );
  const [itemTypes, setItemTypes] = useState<{ id: string; label: string }[]>(
    [],
  );
  const [categories, setCategories] = useState<CategoryRecord[]>([]);

  // ── Admin: pending sessions to review
  const [pendingSessions, setPendingSessions] = useState<
    StockTakeSessionRecord[]
  >([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // ── Init — load active session and branches
  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;

    fetchBranches()
      .then((list) => {
        if (!cancelled) {
          const active = list.filter((b) => b.active);
          setBranches(active);
        }
      })
      .catch(() => {});

    fetchItemTypes()
      .then((types) => {
        if (!cancelled) setItemTypes(types);
      })
      .catch(() => {});

    fetchCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [allowed, me?.role?.key]);

  // Reload active session when the selected branch changes.
  useEffect(() => {
    if (!allowed) return;
    const bid = selBranchId.trim();
    if (!bid) {
      setSession(null);
      setHasStaleSession(false);
      setStaleSessionDate(null);
      return;
    }
    let cancelled = false;
    fetchActiveStockTakeSession(bid)
      .then((res) => {
        if (cancelled) return;
        setSession(res.session ?? null);
        setHasStaleSession(res.hasStaleSession ?? false);
        setStaleSessionDate(res.staleSessionDate ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [allowed, selBranchId]);

  // ── Admin: load pending sessions
  useEffect(() => {
    if (!canApprove || !canRead) return;
    if (session) return; // don't fetch while in a session
    let cancelled = false;
    setSessionsLoading(true);
    fetchStockTakeSessions({ status: "in_progress" })
      .then((list) => {
        if (!cancelled) setPendingSessions(list);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canApprove, canRead, session]);

  // ── Open count modal
  const openCountModal = useCallback(
    (item: ItemSummaryRecord) => {
      const line = session
        ? getLineByItemId(session.lines, item.id)
        : undefined;
      setCountItem(
        canSeeSystemStock ? item : { ...item, stockQty: undefined },
      );
      setCountQty(formatCountedQty(line));
      setCountAisle(line?.aisle ?? "");

      const scanned = lastScannedBarcode.current?.trim();
      const itemBarcode = item.barcode?.trim();
      if (
        scanned &&
        itemBarcode &&
        scanned.toLowerCase() === itemBarcode.toLowerCase()
      ) {
        lastScannedBarcode.current = null;
        void recordItemScan(item.id, {
          source: "stock_take",
          barcode: scanned,
          branchId: session?.branchId,
          sessionId: session?.id,
        }).catch(() => {
          /* non-blocking timeline note */
        });
      }
    },
    [session, canSeeSystemStock],
  );

  // ── Search (debounced)
  const doSearch = useCallback(
    (q: string, barcode?: string) => {
      if (!q.trim() && !barcode?.trim()) {
        setSearchHits([]);
        return;
      }
      setSearching(true);
      const barcodeQuery = barcode?.trim() || undefined;
      fetchItemsPage(q.trim() || undefined, {
        barcode: barcodeQuery,
        branchId: session?.branchId,
        catalogScope: "SKUS_ONLY",
        page: 0,
        size: 20,
      })
        .then((page) => {
          setSearchHits(page.content);
          setSearching(false);
          // Exact barcode hit → open count immediately and record scan
          if (barcodeQuery && page.content.length === 1) {
            const hit = page.content[0];
            const hitBarcode = hit.barcode?.trim();
            if (
              hitBarcode &&
              hitBarcode.toLowerCase() === barcodeQuery.toLowerCase()
            ) {
              openCountModal(hit);
            }
          }
        })
        .catch(() => {
          setSearching(false);
        });
    },
    [session?.branchId, openCountModal],
  );

  const onSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => doSearch(value), 300);
    },
    [doSearch],
  );

  // ── Start session
  const onStartSession = useCallback(async () => {
    if (!selBranchId.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const s = await postStockTakeStart({
        branchId: selBranchId.trim(),
        sessionType: selSessionType,
        sessionDate: todayStr(),
        notes: startNotes.trim() || null,
      });
      setSession(s);
      setMessage("Session started.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to start session.");
    } finally {
      setLoading(false);
    }
  }, [selBranchId, selSessionType, startNotes]);

  // ── Delete session (admin only)
  const onDeleteSession = useCallback(async (s: StockTakeSessionRecord) => {
    if (
      !window.confirm(
        `Delete session "${s.name}"?\n\nThis will permanently remove the session and all its count data. This cannot be undone.`,
      )
    ) {
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      await deleteStockTakeSession(s.id);
      setPendingSessions((prev) => prev.filter((p) => p.id !== s.id));
      // If the deleted session is the active one, clear it too
      setSession((prev) => (prev?.id === s.id ? null : prev));
      setMessage("Session deleted.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to delete session.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Submit count
  const onSubmitCount = useCallback(async () => {
    if (!session || !countItem) return;
    const qty = countQty.trim();
    if (!qty) return;
    setLoading(true);
    setMessage("");
    try {
      let currentSession = session;
      const existing = getLineByItemId(currentSession.lines, countItem.id);

      // If item is not yet in the session, add it first
      if (!existing) {
        currentSession = await postStockTakeAddLine(
          currentSession.id,
          countItem.id,
          countAisle.trim() || null,
        );
      }

      // Now find the line (either existing or just-created)
      const line = getLineByItemId(currentSession.lines, countItem.id);
      if (!line) {
        setMessage("Failed to add item to session.");
        setLoading(false);
        return;
      }

      const s = await patchStockTakeSingleLine(
        currentSession.id,
        line.id,
        qty,
        countAisle.trim() || null,
      );
      setSession(s);
      setCountItem(null);
      setMessage(`${countItem.name} counted: ${qty}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save count.");
    } finally {
      setLoading(false);
    }
  }, [session, countItem, countQty, countAisle]);

  // ── Search for parent product (variant flow)
  const onParentSearch = useCallback((q: string) => {
    setCreateParentSearch(q);
    if (!q.trim()) {
      setCreateParentHits([]);
      return;
    }
    setCreateParentSearching(true);
    fetchItemsPage(q.trim(), { catalogScope: "SKUS_ONLY", page: 0, size: 10 })
      .then((page) => setCreateParentHits(page.content))
      .catch(() => setCreateParentHits([]))
      .finally(() => setCreateParentSearching(false));
  }, []);

  // ── Create product + count (standalone & variant)
  const onCreateProduct = useCallback(async () => {
    if (!session || !createName.trim() || !createCount.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const defaultItemTypeId =
        headerItemTypeId?.trim() ||
        (itemTypes.length > 0 ? itemTypes[0].id : "");
      let s: StockTakeSessionRecord;

      if (createParentId) {
        // Variant flow: keep the old multi-call path (variants are less common)
        const created = await createItemVariant(createParentId, {
          variantName: createName.trim(),
          barcode: createBarcode.trim() || undefined,
          unitType: createUnitType,
          categoryId: createCategoryId || undefined,
        });
        s = await postStockTakeAddLine(
          session.id,
          created.id,
          createAisle.trim() || null,
        );
        const line = s.lines.find((l) => l.itemId === created.id);
        if (line) {
          s = await patchStockTakeSingleLine(
            s.id,
            line.id,
            createCount.trim(),
            createAisle.trim() || null,
          );
        }
      } else {
        // Standalone flow: atomic create + count in one call
        s = await postStockTakeCreateItemAndAddLine(session.id, {
          name: createName.trim(),
          barcode: createBarcode.trim() || undefined,
          unitType: createUnitType,
          itemTypeId: defaultItemTypeId,
          isStocked: true,
          isSellable: true,
          categoryId: createCategoryId || undefined,
          brand: createBrand.trim() || undefined,
          size: createSize.trim() || undefined,
          countedQty: createCount.trim(),
          aisle: createAisle.trim() || null,
        });
      }

      setSession(s);
      setShowCreate(false);
      setCreateName("");
      setCreateBarcode("");
      setCreateCount("");
      setCreateAisle("");
      setCreateParentId("");
      setCreateParentLabel("");
      setCreateParentSearch("");
      setCreateParentHits([]);
      setCreateCategoryId("");
      setCreateBrand("");
      setCreateSize("");
      setMessage(`Created and counted: ${createName.trim()}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to create product.");
    } finally {
      setLoading(false);
    }
  }, [
    session,
    createName,
    createBarcode,
    createUnitType,
    createAisle,
    createCount,
    createParentId,
    createCategoryId,
    createBrand,
    createSize,
    itemTypes,
    headerItemTypeId,
  ]);

  // ── Scanner
  const onBarcodeScanned = useCallback(
    (barcode: string) => {
      lastScannedBarcode.current = barcode;
      setSearch(barcode);
      setShowScanner(false);
      doSearch(barcode, barcode);
    },
    [doSearch],
  );

  // ── Computed
  const checklistLines = useMemo(() => session?.lines ?? [], [session]);

  const totalChecklist = session?.summary?.totalCount ?? checklistLines.length;
  const countedCount = session?.summary?.submittedCount ?? checklistLines.filter(
    (l) => l.status === "submitted",
  ).length;
  const confirmedCount = session?.summary?.confirmedCount ?? checklistLines.filter(
    (l) => l.status === "confirmed",
  ).length;
  const remainingCount = session?.summary?.remainingCount ?? (totalChecklist - countedCount - confirmedCount);

  const uncountedLines = useMemo(
    () => checklistLines.filter((l) => l.status === "pending"),
    [checklistLines],
  );

  const stockTakeQuickLinks = useMemo(() => {
    const links = [
      {
        href: APP_ROUTES.inventoryStock,
        label: "Stock",
        desc: "On-hand",
        icon: Warehouse,
      },
      {
        href: APP_ROUTES.inventoryRestock,
        label: "Out of stock",
        desc: "Restock",
        icon: PackageX,
      },
      {
        href: APP_ROUTES.inventorySupplyBatches,
        label: "Supply batches",
        desc: "Cost layers",
        icon: Layers,
      },
      {
        href: APP_ROUTES.inventoryValuation,
        label: "Valuation",
        desc: "Value on hand",
        icon: BarChart3,
      },
      {
        href: APP_ROUTES.inventoryTransfers,
        label: "Transfers",
        desc: "Move stock",
        icon: ArrowRightLeft,
      },
      {
        href: APP_ROUTES.products,
        label: "Products",
        desc: "Catalog",
        icon: Package,
      },
      {
        href: APP_ROUTES.inventoryStockTakeDailyAudit,
        label: "Daily audit",
        desc: `Random ${dailyAuditSampleSize}`,
        icon: ClipboardCheck,
      },
      {
        href: APP_ROUTES.inventoryStockTakeMyStats,
        label: "My month",
        desc: "Your count stats",
        icon: Award,
      },
      ...(canApprove
        ? [
            {
              href: APP_ROUTES.inventoryStockTakeDailyAuditReview,
              label: "Audit review",
              desc: "Verify counts",
              icon: CheckCircle2,
            },
            {
              href: APP_ROUTES.inventoryStockTakeInvestigations,
              label: "Investigations",
              desc: "Escalated items",
              icon: ClipboardList,
            },
          ]
        : []),
      ...(canApprove
        ? [
            {
              href: `${APP_ROUTES.inventoryStockTake}?review=1`,
              label: "Reviews",
              desc: "Pending counts",
              icon: ClipboardList,
            },
          ]
        : []),
      ...(branchLocked
        ? []
        : [
            {
              href: APP_ROUTES.branches,
              label: "Branches",
              desc: "Locations",
              icon: MapPin,
            },
          ]),
    ];
    return filterInventoryQuickLinksForUser(me, links);
  }, [canApprove, branchLocked, me, dailyAuditSampleSize]);

  // ── Permissions guard
  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Stock take"
        description={
          <>
            You need <code className="text-xs">{Permission.StocktakeRead}</code>{" "}
            or <code className="text-xs">{Permission.StocktakeRun}</code>.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  // ── Render: No session → Start card
  if (!session) {
    return (
      <div className={DASHBOARD_MAX}>
        <div className="space-y-4">
          <header className="space-y-2 border-b border-border/50 pb-4">
            <DashboardPageHero
              compact
              showActiveScope
              icon={ClipboardList}
              eyebrow="Inventory"
              title="Stock take"
              description="Count physical stock against system records."
            />
            <DashboardQuickLinks compact links={stockTakeQuickLinks} />
          </header>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-3.5 py-3">
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Daily audit sample
              </p>
              <p className="text-sm text-foreground">
                <span className="text-2xl font-semibold tabular-nums tracking-tight">
                  {dailyAuditSampleSize}
                </span>{" "}
                <span className="text-muted-foreground">
                  products picked from yesterday&apos;s sales
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="secondary" size="sm" className="h-9">
                <Link href={APP_ROUTES.inventoryStockTakeDailyAudit}>
                  Open daily audit
                </Link>
              </Button>
              {canManageSettings ? (
                <Button asChild variant="outline" size="sm" className="h-9">
                  <Link
                    href={`${APP_ROUTES.businessConfiguration}#settings-stock-take`}
                  >
                    Change size
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          {hasStaleSession ? (
            <p className="text-xs text-destructive">
              Open stocktake from {staleSessionDate ?? "a previous date"} — contact
              an admin to close it before starting a new session.
            </p>
          ) : null}

          {branchLocked && !me?.branchId?.trim() ? (
            <p className="text-xs text-destructive">
              Your account is not assigned to a branch. Contact your administrator.
            </p>
          ) : null}

          {canRun ? (
            <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/15 p-3">
              <p className="text-xs font-semibold text-foreground">New session</p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-[9rem] flex-1 flex-col gap-0.5 text-xs sm:max-w-[10rem]">
                  <span className="text-muted-foreground">Type</span>
                  <select
                    className={cn(dashboardSelectClass(), "h-9 py-1.5 text-sm")}
                    value={selSessionType}
                    onChange={(e) =>
                      setSelSessionType(e.target.value as "morning" | "evening")
                    }
                  >
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                  </select>
                </label>
                <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5 text-xs sm:max-w-[11rem]">
                  <span className="text-muted-foreground">Branch</span>
                  <select
                    className={cn(
                      dashboardSelectClass(),
                      "h-9 py-1.5 text-sm disabled:opacity-60",
                    )}
                    value={selBranchId}
                    disabled={branchLocked}
                    onChange={(e) => onChangeBranch(e.target.value)}
                  >
                    {!branchLocked ? (
                      <option value="">Select branch…</option>
                    ) : null}
                    {branches
                      .filter(
                        (b) => !branchLocked || b.id === me?.branchId,
                      )
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="flex min-w-[10rem] flex-[2] flex-col gap-0.5 text-xs">
                  <span className="text-muted-foreground">Notes</span>
                  <input
                    className={cn(dashboardInputClass(), "h-9 py-1.5 text-sm")}
                    placeholder="Optional…"
                    value={startNotes}
                    onChange={(e) => setStartNotes(e.target.value)}
                  />
                </label>
                <Button
                  size="sm"
                  className="h-9 shrink-0"
                  disabled={
                    loading ||
                    !selBranchId.trim() ||
                    (branchLocked && !me?.branchId?.trim())
                  }
                  onClick={onStartSession}
                >
                  {loading ? "Starting…" : "Start session"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-destructive">
              You do not have permission to start a stocktake session.
            </p>
          )}

          {canApprove ? (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
                <h2 className="text-xs font-semibold sm:text-sm">
                  Pending reviews
                </h2>
                {!sessionsLoading ? (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {pendingSessions.length}
                  </span>
                ) : null}
              </div>
              {sessionsLoading ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Loading…
                </p>
              ) : pendingSessions.length > 0 ? (
                <div className="max-h-56 divide-y divide-border/60 overflow-auto">
                  {pendingSessions.map((s) => {
                    const pendingCount = s.lines.filter(
                      (l) => l.status === "submitted",
                    ).length;
                    const totalCount = s.lines.length;
                    const confirmedCount = s.lines.filter(
                      (l) => l.status === "confirmed",
                    ).length;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30"
                      >
                        <Link
                          href={`/inventory/stock-take/review/${s.id}`}
                          className="flex min-w-0 flex-1 items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {s.sessionNumber > 0 ? (
                                <span className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[10px] font-medium">
                                  #{s.sessionNumber}
                                </span>
                              ) : null}
                              <span className="truncate text-sm font-medium">
                                {s.name}
                              </span>
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {s.branchId}
                              {s.startedBy ? ` · ${s.startedBy}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5 text-[10px]">
                            <span className="text-muted-foreground">
                              {totalCount}
                            </span>
                            {pendingCount > 0 ? (
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                {pendingCount} pending
                              </span>
                            ) : null}
                            {confirmedCount > 0 ? (
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                {confirmedCount} ok
                              </span>
                            ) : null}
                          </div>
                        </Link>
                        {canDelete ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 shrink-0 px-2 text-destructive hover:bg-destructive/5"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDeleteSession(s);
                            }}
                            aria-label="Delete session"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No pending sessions.
                </p>
              )}
            </div>
          ) : null}

          {message ? (
            <p className="text-xs text-muted-foreground">{message}</p>
          ) : null}
        </div>
      </div>
    );
  }

  // ── Render: Counting mode
  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-4">
        <header className="space-y-2 border-b border-border/50 pb-3">
          <DashboardPageHero
            compact
            showActiveScope
            icon={ClipboardList}
            eyebrow="Inventory"
            title="Stock take"
            description={
              <>
                {session.name}
                {session.sessionNumber > 0 ? ` · #${session.sessionNumber}` : ""}
              </>
            }
          />
          <DashboardQuickLinks compact links={stockTakeQuickLinks} />
        </header>

        <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/15 p-3">
          <div className="flex flex-wrap gap-1.5">
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-2">
              <span className="text-[11px] text-muted-foreground">Checklist</span>
              <span className="text-base font-bold tabular-nums leading-none">
                {totalChecklist}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-2.5 py-2">
              <span className="text-[11px] text-muted-foreground">Remaining</span>
              <span className="text-base font-bold tabular-nums leading-none text-amber-700 dark:text-amber-400">
                {remainingCount}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-2">
              <span className="text-[11px] text-muted-foreground">Pending</span>
              <span className="text-base font-bold tabular-nums leading-none">
                {countedCount}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-2">
              <span className="text-[11px] text-muted-foreground">Confirmed</span>
              <span className="text-base font-bold tabular-nums leading-none text-emerald-700 dark:text-emerald-400">
                {confirmedCount}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background px-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Scan barcode"
              title="Scan barcode"
            >
              <ScanLine className="size-4" />
            </button>
            <div className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                className={cn(
                  dashboardInputClass(),
                  "h-9 w-full py-1.5 pl-8 text-sm",
                )}
                placeholder="Search name, SKU, barcode…"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Search products to count"
              />
            </div>
            {canApprove ? (
              <Link
                href={`/inventory/stock-take/review/${session.id}`}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-500/10 dark:text-amber-300"
              >
                <Clock className="size-3.5" />
                Review
              </Link>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1 px-2.5 text-xs text-destructive hover:bg-destructive/5"
                onClick={() => onDeleteSession(session)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>

        {canApprove && pendingSessions.length > 1 ? (
          <button
            type="button"
            className="text-xs text-muted-foreground underline hover:text-foreground"
            onClick={() => setSession(null)}
          >
            ← {pendingSessions.length - 1} other pending session
            {pendingSessions.length > 2 ? "s" : ""}
          </button>
        ) : null}

        {hasStaleSession ? (
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Open stocktake from {staleSessionDate ?? "a previous date"} — contact
            an admin to close it.
          </p>
        ) : null}

        {uncountedLines.length > 0 ? (
          <details open className="group rounded-xl border border-border/60">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
              Still to count ({uncountedLines.length})
            </summary>
            <div className="max-h-40 divide-y divide-border/60 overflow-auto border-t border-border/60">
              {uncountedLines.slice(0, 50).map((line) => (
                <button
                  key={line.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-muted/30"
                  onClick={() => {
                    openCountModal({
                      id: line.itemId,
                      name: getLineDisplayName(line),
                      sku: line.itemSku ?? "",
                      stockQty: canSeeSystemStock
                        ? line.systemQtySnapshot
                        : undefined,
                    });
                  }}
                >
                  <span className="truncate font-medium">
                    {getLineDisplayName(line)}
                  </span>
                  {line.aisle ? (
                    <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                      {line.aisle}
                    </span>
                  ) : null}
                </button>
              ))}
              {uncountedLines.length > 50 ? (
                <p className="px-3 py-1.5 text-[11px] text-muted-foreground">
                  …and {uncountedLines.length - 50} more
                </p>
              ) : null}
            </div>
          </details>
        ) : null}

        <StockTakeSearchResults
          search={search}
          searching={searching}
          items={searchHits}
          checklistLines={checklistLines}
          getLineStatus={getLineStatus}
          getLineByItemId={getLineByItemId}
          formatCountedQty={formatCountedQty}
          onSelect={openCountModal}
          onCreateProduct={() => {
            setCreateBarcode(search.trim());
            setCreateName(search.trim());
            setShowCreate(true);
          }}
        />

        {message ? (
          <p
            className={cn(
              "text-xs",
              /started|counted|saved|deleted/i.test(message)
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-destructive",
            )}
          >
            {message}
          </p>
        ) : null}

        {/* Barcode scanner overlay */}
        {showScanner ? (
          <BarcodeScanner
            onScan={onBarcodeScanned}
            onClose={() => setShowScanner(false)}
          />
        ) : null}

        {/* Count modal */}
        {countItem ? (
          <CountModal
            item={countItem}
            qty={countQty}
            aisle={countAisle}
            loading={loading}
            confirmed={
              getLineStatus(checklistLines, countItem.id) === "confirmed"
            }
            canSeeSystemStock={canSeeSystemStock}
            onQtyChange={setCountQty}
            onAisleChange={setCountAisle}
            onSubmit={onSubmitCount}
            onClose={() => setCountItem(null)}
          />
        ) : null}

        {/* Create product modal */}
        {showCreate ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-t-xl sm:rounded-xl bg-background shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b px-5 py-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold">
                    New Product
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setCreateName("");
                    setCreateBarcode("");
                    setCreateCount("");
                    setCreateAisle("");
                    setCreateParentId("");
                    setCreateParentLabel("");
                    setCreateParentSearch("");
                    setCreateParentHits([]);
                    setCreateCategoryId("");
                    setCreateBrand("");
                    setCreateSize("");
                    setCreateMode("standalone");
                  }}
                  className="ml-4 shrink-0 rounded-md p-1 hover:bg-muted"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4 px-5 py-4">
                {/* Toggle: Standalone / Variant */}
                <div className="flex rounded-lg border bg-muted/50 p-1 gap-1">
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      createMode === "standalone"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => {
                      setCreateMode("standalone");
                      setCreateParentId("");
                      setCreateParentLabel("");
                      setCreateParentSearch("");
                      setCreateParentHits([]);
                    }}
                  >
                    Standalone
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      createMode === "variant"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => {
                      setCreateMode("variant");
                    }}
                  >
                    Variant
                  </button>
                </div>

                {/* Variant: parent search or selected parent */}
                {createMode === "variant" ? (
                  createParentId ? (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                      <span className="flex-1 truncate text-sm">
                        {createParentLabel}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 rounded p-0.5 hover:bg-muted"
                        onClick={() => {
                          setCreateParentId("");
                          setCreateParentLabel("");
                          setCreateParentSearch("");
                          setCreateParentHits([]);
                        }}
                        aria-label="Clear parent"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="Search parent product…"
                        value={createParentSearch}
                        onChange={(e) => onParentSearch(e.target.value)}
                        autoFocus
                      />
                      {createParentSearching && (
                        <p className="text-xs text-muted-foreground">
                          Searching…
                        </p>
                      )}
                      {createParentHits.length > 0 && (
                        <div className="max-h-36 overflow-y-auto rounded-md border">
                          {createParentHits.map((hit) => (
                            <button
                              key={hit.id}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors border-b last:border-b-0"
                              onClick={() => {
                                setCreateParentId(hit.id);
                                setCreateParentLabel(
                                  `${hit.name}${hit.sku ? ` · ${hit.sku}` : ""}`,
                                );
                                setCreateParentSearch("");
                                setCreateParentHits([]);
                              }}
                            >
                              <span className="font-medium">{hit.name}</span>
                              {hit.sku && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  {hit.sku}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ) : null}

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {createMode === "variant" ? "Variant Name" : "Product Name"}{" "}
                    *
                  </span>
                  <input
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder={
                      createMode === "variant"
                        ? "e.g. 500ml"
                        : "e.g. New Cereal Brand"
                    }
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    autoFocus={createMode === "standalone"}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Barcode</span>
                  <input
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Scanned or manual"
                    value={createBarcode}
                    onChange={(e) => setCreateBarcode(e.target.value)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Unit *</span>
                    <select
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      value={createUnitType}
                      onChange={(e) => setCreateUnitType(e.target.value)}
                    >
                      <option value="piece">piece</option>
                      <option value="kg">kg</option>
                      <option value="litre">litre</option>
                      <option value="pack">pack</option>
                      <option value="box">box</option>
                      <option value="carton">carton</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Aisle</span>
                    <input
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="e.g. Aisle 3"
                      value={createAisle}
                      onChange={(e) => setCreateAisle(e.target.value)}
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Category</span>
                  <select
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    value={createCategoryId}
                    onChange={(e) => setCreateCategoryId(e.target.value)}
                  >
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                {createMode === "standalone" ? (
                  <>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium">Brand</span>
                      <input
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="e.g. Kellogg's"
                        value={createBrand}
                        onChange={(e) => setCreateBrand(e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium">Size</span>
                      <input
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="e.g. 500g"
                        value={createSize}
                        onChange={(e) => setCreateSize(e.target.value)}
                      />
                    </label>
                  </>
                ) : null}
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Count *</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="rounded-md border bg-background px-3 py-2 text-lg font-semibold tabular-nums"
                    placeholder="0"
                    value={createCount}
                    onChange={(e) => setCreateCount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onCreateProduct();
                    }}
                  />
                </label>
              </div>
              <div className="border-t px-5 py-4">
                <Button
                  className="w-full"
                  disabled={
                    loading || !createName.trim() || !createCount.trim()
                  }
                  onClick={onCreateProduct}
                >
                  Create &amp; Count
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Count Modal ───────────────────────────────────────────────────────

function CountModal({
  item,
  qty,
  aisle,
  loading,
  confirmed,
  canSeeSystemStock,
  onQtyChange,
  onAisleChange,
  onSubmit,
  onClose,
}: {
  item: ItemSummaryRecord;
  qty: string;
  aisle: string;
  loading: boolean;
  confirmed: boolean;
  canSeeSystemStock: boolean;
  onQtyChange: (v: string) => void;
  onAisleChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-t-xl sm:rounded-xl bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{item.name}</h3>
            <p className="text-xs text-muted-foreground">
              {item.sku}
              {item.barcode ? ` · ${item.barcode}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 rounded-md p-1 hover:bg-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {confirmed ? (
          <div className="px-5 py-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
            <p className="mt-2 font-medium text-emerald-700 dark:text-emerald-300">
              Confirmed by Admin
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              This item has been confirmed and can no longer be modified.
            </p>
            <Button variant="outline" className="mt-4 w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="space-y-4 px-5 py-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Aisle</span>
                <input
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Aisle 3"
                  value={aisle}
                  onChange={(e) => onAisleChange(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Count</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className="rounded-md border bg-background px-3 py-2 text-lg font-semibold tabular-nums"
                  placeholder="0"
                  value={qty}
                  onChange={(e) => onQtyChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSubmit();
                  }}
                  autoFocus
                />
              </label>
              {canSeeSystemStock && item.stockQty != null ? (
                <p className="text-xs text-muted-foreground">
                  System stock: {String(item.stockQty)} pcs
                </p>
              ) : null}
            </div>

            {/* Footer */}
            <div className="border-t px-5 py-4">
              <Button
                className="w-full"
                disabled={loading || !qty.trim()}
                onClick={onSubmit}
              >
                Submit Count
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
