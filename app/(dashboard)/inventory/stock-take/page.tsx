"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  BarChart3,
  ClipboardList,
  MapPin,
  Plus,
  ScanLine,
  Search,
  CheckCircle2,
  Clock,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  createItem,
  createItemVariant,
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
  type BranchRecord,
  type CategoryRecord,
  type ItemSummaryRecord,
  type StockTakeSessionRecord,
  type StockTakeLineRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

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

// ── Page ──────────────────────────────────────────────────────────────

export default function StockTakePage() {
  const { me } = useDashboard();
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const isBranchLockedRole = roleKey === "stock_manager" || roleKey === "cashier";
  const canRun = hasPermission(me?.permissions, Permission.StocktakeRun);
  const canRead = hasPermission(me?.permissions, Permission.StocktakeRead);
  const canApprove = hasPermission(
    me?.permissions,
    Permission.StocktakeApprove,
  );
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
          setSelBranchId((prev) => {
            if (prev) return prev;
            if (active.length === 0) return "";
            if (isBranchLockedRole) {
              const ub = me?.branchId?.trim();
              return ub && active.some((b) => b.id === ub) ? ub : "";
            }
            const userBranch = active.find((b) => b.id === me?.branchId);
            return userBranch?.id ?? active[0].id;
          });
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

    // Check for active session (uses JWT branch; branch-locked users must have branch_id set)
    const branchId = me?.branchId?.trim() ?? "";
    if (branchId) {
      fetchActiveStockTakeSession(branchId)
        .then((res) => {
          if (cancelled) return;
          if (res.session) {
            setSession(res.session);
          }
          if (res.hasStaleSession) {
            setHasStaleSession(true);
            setStaleSessionDate(res.staleSessionDate);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [allowed, isBranchLockedRole, me?.branchId, me?.role?.key]);

  useEffect(() => {
    if (!allowed || !isBranchLockedRole) return;
    const assigned = me?.branchId?.trim();
    if (assigned) {
      setSelBranchId(assigned);
    }
  }, [allowed, isBranchLockedRole, me?.branchId]);

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

  // ── Search (debounced)
  const doSearch = useCallback(
    (q: string, barcode?: string) => {
      if (!q.trim() && !barcode?.trim()) {
        setSearchHits([]);
        return;
      }
      setSearching(true);
      fetchItemsPage(q.trim() || undefined, {
        barcode: barcode?.trim() || undefined,
        branchId: session?.branchId,
        catalogScope: "SKUS_ONLY",
        page: 0,
        size: 20,
      })
        .then((page) => {
          setSearchHits(page.content);
          setSearching(false);
        })
        .catch(() => {
          setSearching(false);
        });
    },
    [session?.branchId],
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

  // ── Open count modal
  const openCountModal = useCallback(
    (item: ItemSummaryRecord) => {
      const line = session
        ? getLineByItemId(session.lines, item.id)
        : undefined;
      setCountItem(item);
      setCountQty(formatCountedQty(line));
      setCountAisle(line?.aisle ?? "");
    },
    [session],
  );

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
      const defaultItemTypeId = itemTypes.length > 0 ? itemTypes[0].id : "";
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
  ]);

  // ── Scanner
  const onBarcodeScanned = useCallback(
    (barcode: string) => {
      setSearch(barcode);
      setShowScanner(false);
      doSearch(barcode, barcode);
    },
    [doSearch],
  );

  // ── Computed
  const checklistLines = useMemo(() => session?.lines ?? [], [session]);

  const totalChecklist = checklistLines.length;
  const countedCount = checklistLines.filter(
    (l) => l.status === "submitted",
  ).length;
  const confirmedCount = checklistLines.filter(
    (l) => l.status === "confirmed",
  ).length;
  const remainingCount = totalChecklist - countedCount - confirmedCount;

  const uncountedLines = useMemo(
    () => checklistLines.filter((l) => l.status === "pending"),
    [checklistLines],
  );

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
        <div className="space-y-8">
          <header className="space-y-4">
            <DashboardPageHero
              icon={ClipboardList}
              eyebrow="Inventory"
              title="Stock take"
              description="Count physical inventory against system records."
            />
            <DashboardQuickLinks
              links={[
                ...(canApprove
                  ? [
                      {
                        href: `${APP_ROUTES.inventoryStockTake}?review=1`,
                        label: "Pending Reviews",
                        desc: "Approve submitted counts",
                        icon: ClipboardList,
                      },
                    ]
                  : []),
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
                ...(isBranchLockedRole
                  ? []
                  : [
                      {
                        href: APP_ROUTES.branches,
                        label: "Branches",
                        desc: "Locations",
                        icon: MapPin,
                      },
                    ]),
              ]}
            />
          </header>

          {hasStaleSession ? (
            <DashboardFeedback
              kind="error"
              text={`⚠️ You have an open stocktake from ${staleSessionDate ?? "a previous date"}. Contact an admin to close it before starting a new one.`}
            />
          ) : null}

          {isBranchLockedRole && !me?.branchId?.trim() ? (
            <DashboardFeedback
              kind="error"
              text="Your account is not assigned to a branch. Contact your administrator before starting a stock take."
            />
          ) : null}

          {canRun ? (
            <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Open New Session</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-muted-foreground">
                    Session Type
                  </span>
                  <select
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    value={selSessionType}
                    onChange={(e) =>
                      setSelSessionType(e.target.value as "morning" | "evening")
                    }
                  >
                    <option value="morning">🌅 Morning</option>
                    <option value="evening">🌙 Evening</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-muted-foreground">
                    Branch
                  </span>
                  <select
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    value={selBranchId}
                    disabled={isBranchLockedRole}
                    onChange={(e) => setSelBranchId(e.target.value)}
                  >
                    {!isBranchLockedRole ? (
                      <option value="">Select branch…</option>
                    ) : null}
                    {branches
                      .filter((b) => !isBranchLockedRole || b.id === me?.branchId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-muted-foreground">
                  Notes (optional)
                </span>
                <input
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Counting aisles 1-4"
                  value={startNotes}
                  onChange={(e) => setStartNotes(e.target.value)}
                />
              </label>
              <Button
                disabled={
                  loading ||
                  !selBranchId.trim() ||
                  (isBranchLockedRole && !me?.branchId?.trim())
                }
                onClick={onStartSession}
                className="w-full sm:w-auto"
              >
                Start Session
              </Button>
            </div>
          ) : (
            <DashboardFeedback
              kind="error"
              text="You do not have permission to start a stocktake session."
            />
          )}

          {/* Admin: pending sessions to review */}
          {canApprove ? (
            <div className="space-y-3 rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Pending Reviews</h3>
              <p className="text-sm text-muted-foreground">
                Sessions waiting for your approval.
              </p>
              {sessionsLoading ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Loading…
                </p>
              ) : pendingSessions.length > 0 ? (
                <div className="max-h-64 overflow-auto rounded-md border">
                  {pendingSessions.map((s) => {
                    const pendingCount = s.lines.filter(
                      (l) => l.status === "submitted",
                    ).length;
                    const totalCount = s.lines.length;
                    const confirmedCount = s.lines.filter(
                      (l) => l.status === "confirmed",
                    ).length;
                    return (
                      <Link
                        key={s.id}
                        href={`/inventory/stock-take/review/${s.id}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 border-b last:border-0 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {s.sessionNumber > 0 ? (
                              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-medium">
                                #{s.sessionNumber}
                              </span>
                            ) : null}
                            <span className="truncate font-medium">
                              {s.name}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {s.branchId}
                            {s.startedBy ? ` · Started by ${s.startedBy}` : ""}
                          </div>
                        </div>
                        <div className="ml-4 flex shrink-0 items-center gap-3 text-xs">
                          <span className="text-muted-foreground">
                            {totalCount} items
                          </span>
                          {pendingCount > 0 ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                              {pendingCount} pending
                            </span>
                          ) : null}
                          {confirmedCount > 0 ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                              {confirmedCount} confirmed
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No pending sessions.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ── Render: Counting mode
  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-6">
        {/* Session header */}
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              {session.sessionNumber > 0 ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-medium">
                  #{session.sessionNumber}
                </span>
              ) : null}
              <h2 className="text-lg font-semibold">{session.name}</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Status:{" "}
              <span className="font-medium text-foreground">
                {session.status === "in_progress"
                  ? "In Progress"
                  : session.status}
              </span>
              {" · "}
              {totalChecklist} items on checklist
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-amber-400" />
              <span>{remainingCount} remaining</span>
            </div>
            {canApprove && session ? (
              <Link
                href={`/inventory/stock-take/review/${session.id}`}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 -mx-2 hover:bg-amber-100 dark:hover:bg-amber-950 transition-colors"
              >
                <Clock className="size-4 text-amber-600" />
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  {countedCount} pending
                </span>
                <span className="text-[10px] text-amber-500 ml-0.5">
                  &rarr;
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5">
                <Clock className="size-4 text-muted-foreground" />
                <span>{countedCount} pending</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>{confirmedCount} confirmed</span>
            </div>
          </div>
        </div>

        {/* Admin quick link to other pending sessions */}
        {canApprove && pendingSessions.length > 1 ? (
          <button
            type="button"
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
            onClick={() => setSession(null)}
          >
            ← Back to pending reviews ({pendingSessions.length - 1} other
            session{pendingSessions.length > 2 ? "s" : ""})
          </button>
        ) : null}

        {/* Search bar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="shrink-0 rounded-md p-2 text-muted-foreground/70 hover:bg-muted hover:text-foreground transition-colors border border-border/50"
            aria-label="Scan barcode with phone camera"
            title="Scan barcode with camera"
          >
            <ScanLine className="size-4" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
              placeholder="Search name, SKU or scan barcode…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Stale session warning */}
        {hasStaleSession ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            ⚠️ You have an open stocktake from{" "}
            {staleSessionDate ?? "a previous date"}. Contact an admin to close
            it.
          </div>
        ) : null}

        {/* Still to count */}
        {uncountedLines.length > 0 ? (
          <details open className="group">
            <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Still to count ({uncountedLines.length} remaining)
            </summary>
            <div className="mt-2 max-h-48 overflow-auto rounded-md border">
              {uncountedLines.slice(0, 50).map((line) => (
                <button
                  key={line.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50 border-b last:border-0 transition-colors"
                  onClick={() => {
                    openCountModal({
                      id: line.itemId,
                      name: line.itemName,
                      sku: line.itemSku ?? "",
                      stockQty: line.systemQtySnapshot,
                    });
                  }}
                >
                  <span className="truncate font-medium">{line.itemName}</span>
                  {line.aisle ? (
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {line.aisle}
                    </span>
                  ) : null}
                </button>
              ))}
              {uncountedLines.length > 50 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  …and {uncountedLines.length - 50} more
                </p>
              ) : null}
            </div>
          </details>
        ) : null}

        {/* Search results */}
        {search.trim() || searchHits.length > 0 ? (
          <div className="space-y-1">
            {searching ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Searching…
              </p>
            ) : searchHits.length > 0 ? (
              <div className="max-h-64 overflow-auto rounded-md border">
                {searchHits.map((item) => {
                  const status = getLineStatus(checklistLines, item.id);
                  const existingLine = getLineByItemId(checklistLines, item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={status === "confirmed"}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50 border-b last:border-0 transition-colors",
                        status === "confirmed" &&
                          "opacity-60 cursor-not-allowed",
                      )}
                      onClick={() => openCountModal(item)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.sku}
                          {item.categoryName ? ` · ${item.categoryName}` : ""}
                        </div>
                      </div>
                      {status === "confirmed" ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          <CheckCircle2 className="mr-1 inline size-3" />
                          Confirmed
                        </span>
                      ) : status === "submitted" ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          <Clock className="mr-1 inline size-3" />
                          {formatCountedQty(existingLine)} pcs
                        </span>
                      ) : null}
                      {!getLineByItemId(checklistLines, item.id) ? (
                        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          <Plus className="mr-0.5 inline size-3" />
                          Add
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No products found
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCreateBarcode(search.trim());
                    setCreateName(search.trim());
                    setShowCreate(true);
                  }}
                >
                  <Plus className="mr-1 size-3.5" />
                  Create &quot;{search.trim()}&quot;
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {/* Summary bar */}
        <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Checklist: {totalChecklist} · Counted: {countedCount + confirmedCount}{" "}
          · Remaining: {remainingCount}
          {session.lines.filter((l) => l.countedQty != null).length >
          totalChecklist
            ? ` · Extra items counted: ${session.lines.filter((l) => l.countedQty != null).length - totalChecklist}`
            : ""}
        </div>

        {/* Message feedback */}
        {message ? (
          <DashboardFeedback
            kind={/started|counted|saved/i.test(message) ? "success" : "error"}
            text={message}
          />
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
            canApprove={canApprove}
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
  canApprove,
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
  canApprove: boolean;
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
              {item.stockQty != null ? (
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
