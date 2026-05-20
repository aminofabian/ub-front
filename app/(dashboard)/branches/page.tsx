"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Globe,
  Loader2,
  MapPin,
  Palette,
  Plus,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { Collapsible } from "radix-ui";

import { useDashboard } from "@/components/dashboard-provider";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import {
  DASHBOARD_MAX,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardHintClass,
  dashboardInputClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { branchReceiptDraft, branchReceiptPayload } from "@/lib/branch-receipt";
import { createBranch, fetchBranches, patchBranch, type BranchRecord } from "@/lib/api";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";

type BranchDraft = {
  name: string;
  address: string;
};

type BranchEditRow = BranchDraft & {
  active: boolean;
  receipt: ReturnType<typeof branchReceiptDraft>;
};

const EMPTY_DRAFT: BranchDraft = { name: "", address: "" };

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function BranchesPage() {
  const { refreshSession, canManageBusinessSettings } = useDashboard();
  const [rows, setRows] = useState<BranchRecord[]>([]);
  const [draft, setDraft] = useState<BranchDraft>(EMPTY_DRAFT);
  const [edits, setEdits] = useState<Record<string, BranchEditRow>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadPass, setLoadPass] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdBranchName, setCreatedBranchName] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [receiptOpen, setReceiptOpen] = useState<Record<string, boolean>>({});

  const canManage = canManageBusinessSettings;

  useEffect(() => {
    if (!createdBranchName) {
      return;
    }
    const timer = window.setTimeout(() => setCreatedBranchName(null), 8000);
    return () => window.clearTimeout(timer);
  }, [createdBranchName]);

  const load = useCallback(() => {
    return fetchBranches()
      .then((list) => {
        setRows(list);
        const nextEdits: Record<string, BranchEditRow> = {};
        for (const b of list) {
          nextEdits[b.id] = {
            name: b.name,
            address: b.address ?? "",
            active: b.active,
            receipt: branchReceiptDraft(b.receipt),
          };
        }
        setEdits(nextEdits);
        setLoadFailed(false);
        setFeedback(null);
      })
      .catch((error) => {
        setLoadFailed(true);
        setFeedback({
          kind: "error",
          text: error instanceof Error ? error.message : "Could not load branches.",
        });
      })
      .finally(() => {
        setLoadPass((n) => n + 1);
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((b) => {
      if (filterActive === "active" && !b.active) return false;
      if (filterActive === "inactive" && b.active) return false;
      if (!q) return true;
      const name = b.name.toLowerCase();
      const addr = (b.address ?? "").toLowerCase();
      return name.includes(q) || addr.includes(q) || b.id.toLowerCase().includes(q);
    });
  }, [rows, search, filterActive]);

  const stats = useMemo(() => {
    const active = rows.filter((b) => b.active).length;
    return { total: rows.length, active, inactive: rows.length - active };
  }, [rows]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) + (filterActive !== "all" ? 1 : 0);

  const onCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setFeedback(null);
    const branchName = draft.name.trim();
    try {
      await createBranch({
        name: branchName,
        address: draft.address.trim() || undefined,
      });
      setDraft(EMPTY_DRAFT);
      setCreatedBranchName(branchName);
      setCreateOpen(false);
      await load();
      await refreshSession();
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Create failed.",
      });
    } finally {
      setCreating(false);
    }
  };

  const onSaveRow = async (branchId: string) => {
    const row = edits[branchId];
    if (!row?.name.trim()) {
      setFeedback({ kind: "error", text: "Branch name is required." });
      return;
    }
    setSavingId(branchId);
    setFeedback(null);
    try {
      await patchBranch(branchId, {
        name: row.name.trim(),
        address: row.address.trim() || undefined,
        active: row.active,
        receipt: branchReceiptPayload(row.receipt),
      });
      await load();
      setFeedback({ kind: "success", text: "Branch updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Update failed.",
      });
    } finally {
      setSavingId(null);
    }
  };

  const isInitialLoading = loadPass === 0;
  const showLoading = isInitialLoading && !loadFailed;

  if (showLoading) {
    return <DashboardLoading label="Loading branches…" />;
  }

  if (loadFailed && loadPass > 0 && rows.length === 0) {
    return (
      <DashboardLoadError
        title="Could not load branches"
        message={feedback?.text ?? "Unknown error."}
        onRetry={() => {
          setLoadFailed(false);
          setFeedback(null);
          void load();
        }}
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <header className="space-y-6 border-b border-border/50 pb-8">
        <DashboardPageHero
          icon={MapPin}
          eyebrow="Locations"
          title="Branches"
          description={
            <>
              Stores, warehouses, and counters for this business. Receipt phone, site, and footer print on cashier
              receipts. Editing requires{" "}
              <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">business.manage_settings</code>
              .
            </>
          }
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <DashboardQuickLinks
            links={[
              { href: APP_ROUTES.business, label: "Business", desc: "Core settings", icon: Building2 },
              { href: APP_ROUTES.businessBranding, label: "Branding", desc: "Logo & colors", icon: Palette },
              { href: APP_ROUTES.businessDomains, label: "Domains", desc: "Hostnames", icon: Globe },
            ]}
          />
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="size-3.5" aria-hidden />
              Filters
              {activeFilterCount > 0 ? (
                <span className="ml-0.5 inline-flex min-w-5 justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void load()}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Refresh
            </Button>
            {canManage ? (
              <Button
                type="button"
                size="sm"
                className="gap-1.5 shadow-sm"
                data-onboarding-target={ONBOARDING_TARGETS.addBranch}
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-3.5" aria-hidden />
                Add branch
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {feedback ? <DashboardFeedback kind={feedback.kind} text={feedback.text} /> : null}

      {createdBranchName ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3.5 text-sm shadow-sm",
            "text-emerald-950 dark:text-emerald-50",
          )}
        >
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold leading-snug">&ldquo;{createdBranchName}&rdquo; was added</p>
            <p className={cn(dashboardHintClass(), "text-emerald-900/85 dark:text-emerald-100/85")}>
              Tune address, status, and receipt details in the table — expand &ldquo;Receipt details&rdquo; per row.
            </p>
          </div>
        </div>
      ) : null}

      {!canManage ? (
        <DashboardFeedback
          kind="warning"
          text='You can view branches but not edit them. Ask an admin for business.manage_settings to create or update locations.'
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/70 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total locations</CardTitle>
            <Store className="size-4 text-muted-foreground/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight">{stats.total}</p>
            <p className={cn(dashboardHintClass(), "mt-1")}>Branches on this workspace</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600/80 dark:text-emerald-400/90" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight">{stats.active}</p>
            <p className={cn(dashboardHintClass(), "mt-1")}>Available for assignment &amp; POS</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
            <AlertCircle className="size-4 text-muted-foreground/70" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight">{stats.inactive}</p>
            <p className={cn(dashboardHintClass(), "mt-1")}>Hidden from active pickers</p>
          </CardContent>
        </Card>
      </div>

      <FormDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add branch"
        description="Create a location, then refine address, activation, and receipt copy in the table."
        icon={<Plus className="size-5" aria-hidden />}
        width="default"
      >
        <form className="space-y-6" onSubmit={onCreate}>
          <FormDrawerFields legend="Location" hint="Name appears in branch pickers and on printed receipts when configured.">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="branch-new-name">
                Branch name
              </label>
              <input
                id="branch-new-name"
                className={dashboardInputClass()}
                placeholder="e.g. Westlands store"
                value={draft.name}
                onChange={(event) => {
                  setCreatedBranchName(null);
                  setDraft((previous) => ({ ...previous, name: event.target.value }));
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="branch-new-address">
                Address <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="branch-new-address"
                className={dashboardInputClass()}
                placeholder="Street, city"
                value={draft.address}
                onChange={(event) => {
                  setCreatedBranchName(null);
                  setDraft((previous) => ({ ...previous, address: event.target.value }));
                }}
              />
            </div>
          </FormDrawerFields>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={creating} className="gap-2">
              {creating ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="size-4" aria-hidden />
                  Create branch
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </FormDrawer>

      <FormDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filter branches"
        description="Narrow the list by text or activation state. Filters apply in the browser only."
        icon={<SlidersHorizontal className="size-5" aria-hidden />}
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="branch-filter-q">
              Search
            </label>
            <input
              id="branch-filter-q"
              className={dashboardInputClass()}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, address, or ID"
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Status</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["active", "Active"],
                  ["inactive", "Inactive"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={filterActive === value ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setFilterActive(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </fieldset>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setSearch("");
              setFilterActive("all");
            }}
          >
            Reset filters
          </Button>
        </div>
      </FormDrawer>

      <section className={DASHBOARD_TABLE_SURFACE}>
        <div className={cn(DASHBOARD_TABLE_HEAD, "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between")}>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">All branches</h2>
            <p className={cn(dashboardHintClass(), "mt-0.5")}>
              Showing{" "}
              <span className="font-medium text-foreground tabular-nums">{filteredRows.length}</span> of{" "}
              <span className="font-medium text-foreground tabular-nums">{rows.length}</span>
              {canManage ? " · Save persists name, address, status, and receipt block together." : null}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/25 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5 font-medium sm:px-6">Name</th>
                <th className="px-5 py-3.5 font-medium sm:px-6">Address</th>
                <th className="px-5 py-3.5 font-medium sm:px-6">Status</th>
                {canManage ? (
                  <th className="w-36 px-5 py-3.5 text-right font-medium sm:px-6">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 4 : 3}
                    className="px-5 py-14 text-center text-sm text-muted-foreground sm:px-6"
                  >
                    {rows.length === 0
                      ? "No branches yet."
                      : "No branches match your filters."}
                    {rows.length === 0 && canManage ? " Use Add branch to create one." : ""}
                  </td>
                </tr>
              ) : (
                filteredRows.map((branch) => {
                  const row = edits[branch.id];
                  const colSpan = canManage ? 4 : 3;
                  const receiptExpanded = receiptOpen[branch.id] ?? false;
                  return (
                    <Fragment key={branch.id}>
                      <tr className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-3.5 align-top sm:px-6">
                          {canManage && row ? (
                            <input
                              className={cn(dashboardInputClass(), "text-sm")}
                              value={row.name}
                              onChange={(event) =>
                                setEdits((previous) => ({
                                  ...previous,
                                  [branch.id]: {
                                    ...row,
                                    name: event.target.value,
                                  },
                                }))
                              }
                              aria-label={`Edit name for ${branch.name}`}
                            />
                          ) : (
                            <span className="font-medium text-foreground">{branch.name}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 align-top sm:px-6">
                          {canManage && row ? (
                            <input
                              className={cn(dashboardInputClass(), "text-sm")}
                              value={row.address}
                              onChange={(event) =>
                                setEdits((previous) => ({
                                  ...previous,
                                  [branch.id]: {
                                    ...row,
                                    address: event.target.value,
                                  },
                                }))
                              }
                              aria-label={`Edit address for ${branch.name}`}
                            />
                          ) : (
                            <span className="text-muted-foreground">{branch.address ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 align-top sm:px-6">
                          {canManage && row ? (
                            <label className="relative inline-flex cursor-pointer items-center gap-3">
                              <Badge variant={row.active ? "default" : "secondary"}>
                                {row.active ? "Active" : "Inactive"}
                              </Badge>
                              <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
                                <input
                                  type="checkbox"
                                  className="peer sr-only"
                                  checked={row.active}
                                  onChange={(event) =>
                                    setEdits((previous) => ({
                                      ...previous,
                                      [branch.id]: {
                                        ...row,
                                        active: event.target.checked,
                                      },
                                    }))
                                  }
                                />
                                <span
                                  className={cn(
                                    "absolute inset-0 rounded-full bg-muted-foreground/25 transition-colors",
                                    "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                                    "peer-checked:bg-primary",
                                  )}
                                  aria-hidden
                                />
                                <span
                                  className={cn(
                                    "absolute left-0.5 top-0.5 z-10 size-6 rounded-full bg-background shadow-sm transition-transform",
                                    "peer-checked:translate-x-5",
                                  )}
                                  aria-hidden
                                />
                              </span>
                            </label>
                          ) : (
                            <Badge variant={branch.active ? "success" : "secondary"}>
                              {branch.active ? "Active" : "Inactive"}
                            </Badge>
                          )}
                        </td>
                        {canManage ? (
                          <td className="px-5 py-3.5 text-right align-top sm:px-6">
                            <Button
                              size="sm"
                              type="button"
                              className="gap-1.5 font-semibold shadow-sm"
                              disabled={savingId === branch.id}
                              onClick={() => void onSaveRow(branch.id)}
                            >
                              {savingId === branch.id ? (
                                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              ) : (
                                <Save className="size-3.5" aria-hidden />
                              )}
                              Save
                            </Button>
                          </td>
                        ) : null}
                      </tr>
                      {canManage && row ? (
                        <tr className="bg-muted/[0.18] last:border-0">
                          <td colSpan={colSpan} className="px-5 py-2 sm:px-6">
                            <Collapsible.Root
                              open={receiptExpanded}
                              onOpenChange={(open) =>
                                setReceiptOpen((prev) => ({ ...prev, [branch.id]: open }))
                              }
                            >
                              <Collapsible.Trigger
                                type="button"
                                className={cn(
                                  "flex w-full items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/80 px-3 py-2.5 text-left text-sm font-medium",
                                  "transition-[background-color,box-shadow] hover:bg-muted/40 hover:shadow-sm",
                                  "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                                )}
                              >
                                <span className="flex items-center gap-2 text-foreground">
                                  Receipt details
                                  <span className="text-xs font-normal text-muted-foreground">
                                    (checkout footer &amp; contact)
                                  </span>
                                </span>
                                <ChevronDown
                                  className={cn(
                                    "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                    receiptExpanded && "rotate-180",
                                  )}
                                  aria-hidden
                                />
                              </Collapsible.Trigger>
                              <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
                                <div className="mt-2 space-y-3 rounded-xl border border-border/40 bg-background/60 p-4 shadow-inner sm:p-5">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <input
                                      className={cn(dashboardInputClass(), "text-sm")}
                                      placeholder="Phone (e.g. 254712345678)"
                                      value={row.receipt.phone}
                                      onChange={(e) =>
                                        setEdits((prev) => ({
                                          ...prev,
                                          [branch.id]: {
                                            ...row,
                                            receipt: { ...row.receipt, phone: e.target.value },
                                          },
                                        }))
                                      }
                                      aria-label={`Receipt phone for ${branch.name}`}
                                    />
                                    <input
                                      className={cn(dashboardInputClass(), "text-sm")}
                                      placeholder="Email"
                                      type="email"
                                      value={row.receipt.email}
                                      onChange={(e) =>
                                        setEdits((prev) => ({
                                          ...prev,
                                          [branch.id]: {
                                            ...row,
                                            receipt: { ...row.receipt, email: e.target.value },
                                          },
                                        }))
                                      }
                                      aria-label={`Receipt email for ${branch.name}`}
                                    />
                                    <input
                                      className={cn(dashboardInputClass(), "text-sm sm:col-span-2")}
                                      placeholder="Website (https://yourshop.com)"
                                      value={row.receipt.website}
                                      onChange={(e) =>
                                        setEdits((prev) => ({
                                          ...prev,
                                          [branch.id]: {
                                            ...row,
                                            receipt: { ...row.receipt, website: e.target.value },
                                          },
                                        }))
                                      }
                                      aria-label={`Receipt website for ${branch.name}`}
                                    />
                                    <textarea
                                      className={cn(dashboardTextareaClass(), "text-sm sm:col-span-2")}
                                      placeholder="Footer message on receipt (optional)"
                                      value={row.receipt.footerNote}
                                      onChange={(e) =>
                                        setEdits((prev) => ({
                                          ...prev,
                                          [branch.id]: {
                                            ...row,
                                            receipt: {
                                              ...row.receipt,
                                              footerNote: e.target.value,
                                            },
                                          },
                                        }))
                                      }
                                      aria-label={`Receipt footer for ${branch.name}`}
                                    />
                                  </div>
                                  <p className={dashboardHintClass()}>
                                    Leave blank to omit. If website is empty, your business primary domain is used
                                    when available. Use <strong className="font-medium text-foreground">Save</strong>{" "}
                                    in the row above to persist everything together.
                                  </p>
                                </div>
                              </Collapsible.Content>
                            </Collapsible.Root>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className={cn(dashboardHintClass(), "flex flex-wrap items-center gap-x-1 border-t border-border/40 pt-2")}>
        <span className="font-mono text-[11px]">GET/PATCH …/branches</span>
        <span className="text-muted-foreground/50">·</span>
        <span>Session refreshes after creates so storefront picks up new locations.</span>
      </p>
    </div>
  );
}
