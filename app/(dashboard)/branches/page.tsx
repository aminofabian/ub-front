"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe,
  Loader2,
  MapPin,
  Palette,
  Plus,
  RefreshCw,
  Save,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  branchReceiptDraft,
  branchReceiptPayload,
} from "@/lib/branch-receipt";
import {
  createBranch,
  fetchBranches,
  patchBranch,
  type BranchRecord,
} from "@/lib/api";
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

function inputClass() {
  return cn(
    "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
  );
}

function RelatedLinks() {
  const links = [
    { href: APP_ROUTES.business, label: "Business", desc: "Core settings", icon: Building2 },
    { href: APP_ROUTES.businessBranding, label: "Branding", desc: "Logo & colors", icon: Palette },
    { href: APP_ROUTES.businessDomains, label: "Domains", desc: "Hostnames", icon: Globe },
  ] as const;
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {links.map(({ href, label, desc, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all",
            "hover:border-primary/25 hover:bg-accent/40 hover:shadow-md",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-semibold">
              {label}
              <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

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
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 py-24">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Loading branches…</p>
      </div>
    );
  }

  if (loadFailed && loadPass > 0 && rows.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto size-10 text-destructive" aria-hidden />
          <h1 className="mt-4 text-lg font-semibold tracking-tight">Could not load branches</h1>
          <p className="mt-2 text-sm text-muted-foreground">{feedback?.text}</p>
          <Button
            className="mt-6 gap-2"
            variant="outline"
            onClick={() => {
              setLoadFailed(false);
              setFeedback(null);
              void load();
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <header className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="size-4" aria-hidden />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary/90">Locations</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Branches</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Stores, warehouses, and counters for this business. Set receipt contact details per branch (phone, website,
            footer message) — they print on cashier receipts. Editing requires{" "}
            <span className="font-mono text-xs text-muted-foreground/90">business.manage_settings</span>.
          </p>
        </div>
        <RelatedLinks />
      </header>

      {feedback ? (
        <div
          role="status"
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm",
            feedback.kind === "success" &&
              "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-950 dark:text-emerald-100",
            feedback.kind === "error" && "border-destructive/30 bg-destructive/5 text-destructive",
          )}
        >
          {feedback.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <span>{feedback.text}</span>
        </div>
      ) : null}

      {canManage ? (
        <section
          data-onboarding-target={ONBOARDING_TARGETS.addBranch}
          className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold tracking-tight">Add branch</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a location, then tune address and active status in the table.
          </p>
          {createdBranchName ? (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm",
                "text-emerald-950 dark:text-emerald-50",
              )}
            >
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold">
                  &ldquo;{createdBranchName}&rdquo; was added successfully
                </p>
                <p className="text-emerald-900/80 dark:text-emerald-100/80">
                  You can tune its address and active status in the table below.
                </p>
              </div>
            </div>
          ) : null}
          <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12" onSubmit={onCreate}>
            <input
              className={cn(inputClass(), "md:col-span-5")}
              placeholder="Branch name"
              value={draft.name}
              onChange={(event) => {
                setCreatedBranchName(null);
                setDraft((previous) => ({ ...previous, name: event.target.value }));
              }}
              required
              aria-label="New branch name"
            />
            <input
              className={cn(inputClass(), "md:col-span-5")}
              placeholder="Address (optional)"
              value={draft.address}
              onChange={(event) => {
                setCreatedBranchName(null);
                setDraft((previous) => ({ ...previous, address: event.target.value }));
              }}
              aria-label="New branch address"
            />
            <Button className="md:col-span-2" type="submit" disabled={creating} size="lg">
              {creating ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="size-4" aria-hidden />
                  Create
                </>
              )}
            </Button>
          </form>
        </section>
      ) : (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          You can view branches but not edit them. Ask an admin for{" "}
          <span className="font-mono text-xs">business.manage_settings</span> to create or update locations.
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-foreground">All branches</h2>
          <p className="text-xs text-muted-foreground">Save each row after edits.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/20">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">Address</th>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">Active</th>
                {canManage ? (
                  <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5 w-36">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((branch) => {
                const row = edits[branch.id];
                const colSpan = canManage ? 4 : 3;
                return (
                  <Fragment key={branch.id}>
                  <tr className="border-b border-border/40">
                    <td className="px-4 py-3 align-top sm:px-5">
                      {canManage && row ? (
                        <input
                          className={cn(inputClass(), "text-sm")}
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
                    <td className="px-4 py-3 align-top sm:px-5">
                      {canManage && row ? (
                        <input
                          className={cn(inputClass(), "text-sm")}
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
                    <td className="px-4 py-3 align-top sm:px-5">
                      {canManage && row ? (
                        <label className="relative inline-flex cursor-pointer items-center gap-3">
                          <span className="text-xs text-muted-foreground">{row.active ? "Active" : "Inactive"}</span>
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
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            branch.active
                              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {branch.active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3 align-top sm:px-5">
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
                    <tr key={`${branch.id}-receipt`} className="border-b border-border/40 bg-muted/15 last:border-0">
                      <td colSpan={colSpan} className="px-4 py-3 sm:px-5">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Receipt details (printed at checkout)
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            className={cn(inputClass(), "text-sm")}
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
                            className={cn(inputClass(), "text-sm")}
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
                            className={cn(inputClass(), "text-sm sm:col-span-2")}
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
                            className={cn(inputClass(), "min-h-[4rem] text-sm sm:col-span-2")}
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
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          Leave blank to omit. If website is empty, your business primary domain is used when
                          available.
                        </p>
                        <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-muted-foreground">
                            Saves branch name, address, status, and receipt details together.
                          </p>
                          <Button
                            type="button"
                            size="lg"
                            className="w-full shrink-0 gap-2 font-semibold shadow-md sm:w-auto sm:min-w-[11rem]"
                            disabled={savingId === branch.id}
                            onClick={() => void onSaveRow(branch.id)}
                          >
                            {savingId === branch.id ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden />
                            ) : (
                              <Save className="size-4" aria-hidden />
                            )}
                            Save receipt details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? (
          <p className="border-t border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">
            No branches yet. {canManage ? "Create one above." : ""}
          </p>
        ) : null}
      </section>

      <p className="text-xs text-muted-foreground">
        <span className="font-mono">GET/PATCH …/branches</span> · session refreshes after creates so storefront picks up new locations
      </p>
    </div>
  );
}
