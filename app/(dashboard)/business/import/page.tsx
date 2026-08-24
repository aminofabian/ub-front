"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Package,
  Tag,
  Tags,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DashboardAccessDenied,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardHintClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  enqueueCsvImportJob,
  fetchCsvImportJob,
  fetchCsvImportTemplate,
  postLegacyBuyingPriceJsonImport,
  postLegacyProductJsonImport,
  postLegacySellingPriceJsonImport,
  postLegacySupplierJsonImport,
  type CsvImportJobRecord,
  type JsonImportResponse,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type ImportKind = "products" | "suppliers" | "buying_prices" | "selling_prices";

type CsvTemplateKind = "items" | "suppliers" | "opening-stock";

const CSV_TEMPLATES: {
  kind: CsvTemplateKind;
  label: string;
  hint: string;
}[] = [
  { kind: "items", label: "Items", hint: "Catalog rows" },
  { kind: "suppliers", label: "Suppliers", hint: "Vendors" },
  { kind: "opening-stock", label: "Opening stock", hint: "Branch + SKU + qty" },
];

const CSV_COLUMNS: Record<CsvTemplateKind, string[]> = {
  items: [
    "sku",
    "name",
    "item_type_key",
    "barcode",
    "unit_type",
    "is_stocked",
    "is_sellable",
    "selling_price",
    "reorder_level",
  ],
  suppliers: ["name", "code", "supplier_type", "vat_pin", "status", "notes"],
  "opening-stock": ["branch_name", "sku", "quantity", "unit_cost", "notes"],
};

/** Async import jobs are drained by a background worker (4s poll interval). */
const CSV_JOB_POLL_MS = 1500;
/** Give up the live progress UI after ~3 minutes; the job keeps running server-side. */
const CSV_JOB_MAX_POLLS = 120;

function ImportResultCard({
  result,
  successMessage,
  failureMessage,
}: {
  result: JsonImportResponse;
  successMessage: string;
  failureMessage?: string | null;
}) {
  const failed = result.errors.length > 0 || Boolean(failureMessage);
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-1 rounded-xl border px-4 py-3.5 text-sm leading-relaxed shadow-sm",
        failed
          ? "border-destructive/25 bg-destructive/5"
          : "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-50",
      )}
    >
      <div className="flex items-start gap-3">
        {failed ? (
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        ) : (
          <CheckCircle2
            className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            {result.dryRun ? "Validation" : "Import"} · {result.rowsParsed} row(s) parsed
            {result.rowsCommitted != null ? ` · ${result.rowsCommitted} committed` : null}
          </p>
          {result.errors.length > 0 ? (
            <ul className="mt-3 max-h-64 list-inside list-disc space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {result.errors.map((err, i) => (
                <li key={`${err.line}-${i}`}>
                  <span className="font-mono text-foreground">Line {err.line}</span>: {err.message}
                </li>
              ))}
            </ul>
          ) : failureMessage ? (
            <p className="mt-2 text-xs leading-relaxed text-destructive">{failureMessage}</p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {successMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function kindIcon(kind: ImportKind): LucideIcon {
  switch (kind) {
    case "products":
      return FileJson;
    case "suppliers":
      return Truck;
    case "buying_prices":
      return CircleDollarSign;
    case "selling_prices":
      return Tag;
  }
}

export default function BusinessImportPage() {
  const { loading, canManageImports, branches, branchId, branchesLoading } = useDashboard();
  const [importKind, setImportKind] = useState<ImportKind>("products");
  const [file, setFile] = useState<File | null>(null);
  const [branchForStock, setBranchForStock] = useState("");
  const [busy, setBusy] = useState<"dry" | "commit" | null>(null);
  const [result, setResult] = useState<JsonImportResponse | null>(null);
  const [templateBusy, setTemplateBusy] = useState<CsvTemplateKind | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [csvKind, setCsvKind] = useState<CsvTemplateKind>("items");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvBusy, setCsvBusy] = useState<"dry" | "commit" | null>(null);
  const [csvResult, setCsvResult] = useState<JsonImportResponse | null>(null);
  const [csvProgress, setCsvProgress] = useState<{
    rowsTotal: number | null;
    rowsProcessed: number;
  } | null>(null);
  const [csvFailure, setCsvFailure] = useState<string | null>(null);
  const csvPollRef = useRef<{ cancelled: boolean } | null>(null);

  useEffect(
    () => () => {
      if (csvPollRef.current) {
        csvPollRef.current.cancelled = true;
      }
    },
    [],
  );

  /**
   * CSV imports run as background jobs: enqueue, then poll until the worker
   * reaches {@code completed} / {@code failed}. Keeps the request off the
   * main thread for large files and shows live row progress.
   */
  const runCsv = useCallback(
    async (dryRun: boolean) => {
      if (!csvFile) {
        return;
      }
      if (csvPollRef.current) {
        csvPollRef.current.cancelled = true;
      }
      const poll = { cancelled: false };
      csvPollRef.current = poll;
      setCsvBusy(dryRun ? "dry" : "commit");
      setCsvResult(null);
      setCsvFailure(null);
      setCsvProgress(null);
      try {
        const jobId = await enqueueCsvImportJob(csvKind, csvFile, dryRun);
        for (let attempt = 0; attempt < CSV_JOB_MAX_POLLS; attempt++) {
          if (poll.cancelled) return;
          await new Promise((r) => setTimeout(r, CSV_JOB_POLL_MS));
          if (poll.cancelled) return;
          let job: CsvImportJobRecord;
          try {
            job = await fetchCsvImportJob(jobId);
          } catch {
            if (poll.cancelled) return;
            continue; // transient poll failure — keep polling
          }
          if (poll.cancelled) return;
          if (job.status === "pending" || job.status === "processing") {
            setCsvProgress({
              rowsTotal: job.rowsTotal ?? null,
              rowsProcessed: job.rowsProcessed,
            });
            continue;
          }
          const mapped: JsonImportResponse = {
            dryRun: job.dryRun,
            rowsParsed: job.rowsTotal ?? job.rowsProcessed,
            errors: job.errors ?? [],
            rowsCommitted: job.rowsCommitted ?? null,
          };
          if (job.status === "completed") {
            setCsvResult(mapped);
            return;
          }
          if (job.status === "failed") {
            if ((job.errors ?? []).length === 0) {
              setCsvFailure(
                job.statusMessage?.trim() || "Import failed on the server.",
              );
            }
            setCsvResult(mapped);
            return;
          }
        }
        // Live progress gave up — the job keeps running server-side.
        setCsvResult({
          dryRun,
          rowsParsed: 0,
          errors: [],
          rowsCommitted: null,
        });
        setCsvFailure(
          "The import is still running on the server. The job continues in the background — reload this page later to see its result.",
        );
      } catch {
        setCsvResult(null);
        setCsvFailure(
          "Could not start the import. Check your connection and permission, then try again.",
        );
      } finally {
        if (!poll.cancelled) {
          setCsvBusy(null);
        }
      }
    },
    [csvFile, csvKind],
  );

  const effectiveBranch = branchForStock.trim() || branchId;

  const onDownloadTemplate = useCallback(async (kind: CsvTemplateKind) => {
    setTemplateBusy(kind);
    setTemplateError(null);
    try {
      const blob = await fetchCsvImportTemplate(kind);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind}-import-template.csv`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setTemplateError(
        "Could not download the template. Check your connection and permission, then try again.",
      );
    } finally {
      setTemplateBusy(null);
    }
  }, []);

  const run = useCallback(
    async (dryRun: boolean) => {
      if (!file) {
        return;
      }
      setBusy(dryRun ? "dry" : "commit");
      setResult(null);
      try {
        let res: JsonImportResponse;
        switch (importKind) {
          case "products":
            res = await postLegacyProductJsonImport(file, {
              dryRun,
              branchId: effectiveBranch || undefined,
            });
            break;
          case "suppliers":
            res = await postLegacySupplierJsonImport(file, { dryRun });
            break;
          case "buying_prices":
            res = await postLegacyBuyingPriceJsonImport(file, { dryRun });
            break;
          case "selling_prices":
            res = await postLegacySellingPriceJsonImport(file, { dryRun });
            break;
        }
        setResult(res);
      } catch {
        setResult(null);
      } finally {
        setBusy(null);
      }
    },
    [file, effectiveBranch, importKind],
  );

  if (loading) {
    return <DashboardLoading label="Loading session…" />;
  }

  if (!canManageImports) {
    return (
      <DashboardAccessDenied
        title="Data import"
        description={
          <>
            You need{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {Permission.IntegrationsImportsManage}
            </code>{" "}
            to upload legacy JSON. Ask an administrator to grant this permission on your role.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  const KindIcon = kindIcon(importKind);
  const jsonSuccessMessage =
    importKind === "products"
      ? "No blocking issues reported. Products should appear under Catalog; refresh the Products page if it was already open."
      : importKind === "suppliers"
        ? "No blocking issues reported. Suppliers should appear under Suppliers; refresh that page if it was already open."
        : importKind === "buying_prices"
          ? "No blocking issues reported. Buying costs are stored for the item + supplier; refresh pricing views as needed."
          : "No blocking issues reported. Selling prices are applied from the effective date; refresh catalog or POS as needed.";
  const csvSuccessMessage =
    csvKind === "items"
      ? "No blocking issues reported. Products should appear under Catalog; refresh the Products page if it was already open."
      : csvKind === "suppliers"
        ? "No blocking issues reported. Suppliers should appear under Suppliers; refresh that page if it was already open."
        : "No blocking issues reported. Opening stock is applied to the listed branch(es).";

  return (
    <div className={cn(DASHBOARD_MAX, "max-w-2xl")}>
      <DashboardPageHero
        icon={FileJson}
        eyebrow="Integrations"
        title="Import legacy data (JSON)"
        description="Upload catalog, supplier, or price exports. Products support an array or products / items; suppliers use suppliers / vendors; buying prices use buying_prices / costs; selling prices use selling_prices / sell_prices. Pre-mapped CSV templates for items, suppliers, and opening stock are available below."
      >
        <DashboardQuickLinks
          links={[
            {
              href: APP_ROUTES.business,
              label: "Business",
              desc: "Workspace settings",
              icon: Building2,
            },
            {
              href: APP_ROUTES.products,
              label: "Products",
              desc: "Catalog items",
              icon: Package,
            },
            {
              href: APP_ROUTES.suppliers,
              label: "Suppliers",
              desc: "Vendors",
              icon: Truck,
            },
            {
              href: APP_ROUTES.pricing,
              label: "Pricing",
              desc: "Rules & margins",
              icon: Tags,
            },
          ]}
        />
      </DashboardPageHero>

      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/60 text-foreground">
            <FileSpreadsheet className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              CSV templates
            </h2>
            <p className={cn(dashboardHintClass(), "mt-0.5 max-w-prose")}>
              Ready-to-fill templates mapped to the CSV import endpoints — download, complete, and upload.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {CSV_TEMPLATES.map((t) => (
            <Button
              key={t.kind}
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={templateBusy != null}
              onClick={() => void onDownloadTemplate(t.kind)}
            >
              {templateBusy === t.kind ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Download className="size-3.5" aria-hidden />
              )}
              {t.label}
            </Button>
          ))}
        </div>
        {templateError ? (
          <p className="mt-3 text-xs text-destructive">{templateError}</p>
        ) : null}
      </section>

      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/60 text-foreground">
            <FileSpreadsheet className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              CSV import
            </h2>
            <p className={cn(dashboardHintClass(), "mt-0.5 max-w-prose")}>
              Upload a CSV filled from the templates above — validate first, then import.
            </p>
          </div>
        </div>

        <div className={cn("mt-5 flex flex-wrap gap-2 rounded-xl border border-border/50 bg-muted/25 p-1.5")}>
          {CSV_TEMPLATES.map((t) => (
            <Button
              key={t.kind}
              type="button"
              variant={csvKind === t.kind ? "default" : "ghost"}
              size="sm"
              className={cn(
                "flex-1 sm:flex-initial",
                csvKind !== t.kind && "text-muted-foreground hover:text-foreground",
              )}
              disabled={csvBusy != null}
              onClick={() => {
                setCsvKind(t.kind);
                setCsvResult(null);
              }}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <div className="mt-6 space-y-5 border-t border-border/50 pt-6">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground">CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className={cn(
                "max-w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-[box-shadow,border-color] duration-150",
                "file:mr-3 file:rounded-md file:border file:border-input file:bg-muted file:px-3 file:py-2 file:text-xs file:font-medium file:text-foreground",
                "file:transition-colors file:hover:bg-muted/80 hover:border-foreground/15",
                "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                csvBusy != null && "opacity-60",
              )}
              disabled={csvBusy != null}
              onChange={(e) => {
                setCsvFile(e.target.files?.[0] ?? null);
                setCsvResult(null);
              }}
            />
          </label>

          <p className={dashboardHintClass()}>
            Columns:{" "}
            {CSV_COLUMNS[csvKind].map((col, i) => (
              <span key={col}>
                {i > 0 ? " · " : null}
                <code className="rounded bg-muted px-1">{col}</code>
              </span>
            ))}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="min-h-10 shadow-sm transition-shadow hover:shadow-md"
              disabled={!csvFile || csvBusy != null}
              onClick={() => void runCsv(true)}
            >
              {csvBusy === "dry" ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Validating…
                </>
              ) : (
                "Validate only"
              )}
            </Button>
            <Button
              type="button"
              className="min-h-10 shadow-sm transition-shadow hover:shadow-md"
              disabled={!csvFile || csvBusy != null}
              onClick={() => void runCsv(false)}
            >
              {csvBusy === "commit" ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Importing…
                </>
              ) : (
                "Import"
              )}
            </Button>
          </div>
        </div>

        {csvBusy != null && !csvResult ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {csvProgress?.rowsTotal != null && csvProgress.rowsTotal > 0
              ? `Processing ${Math.min(csvProgress.rowsProcessed, csvProgress.rowsTotal)} of ${csvProgress.rowsTotal} rows…`
              : "Queued — processing shortly…"}
          </div>
        ) : null}
        {csvResult ? (
          <ImportResultCard
            result={csvResult}
            successMessage={csvSuccessMessage}
            failureMessage={csvFailure}
          />
        ) : null}
      </section>

      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/60 text-foreground">
            <KindIcon className="size-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Import type</h2>
            <p className={cn(dashboardHintClass(), "mt-0.5 max-w-prose")}>
              Choose what this JSON file represents, then upload and validate or import.
            </p>
          </div>
        </div>

        <div className={cn("mt-5 flex flex-wrap gap-2 rounded-xl border border-border/50 bg-muted/25 p-1.5")}>
          {(
            [
              ["products", "Products"] as const,
              ["suppliers", "Suppliers"] as const,
              ["buying_prices", "Buying prices"] as const,
              ["selling_prices", "Selling prices"] as const,
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              variant={importKind === key ? "default" : "ghost"}
              size="sm"
              className={cn(
                "flex-1 sm:flex-initial",
                importKind !== key && "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setImportKind(key);
                setResult(null);
              }}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="mt-6 space-y-5 border-t border-border/50 pt-6">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground">JSON file</span>
            <input
              type="file"
              accept=".json,application/json"
              className={cn(
                "max-w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-[box-shadow,border-color] duration-150",
                "file:mr-3 file:rounded-md file:border file:border-input file:bg-muted file:px-3 file:py-2 file:text-xs file:font-medium file:text-foreground",
                "file:transition-colors file:hover:bg-muted/80 hover:border-foreground/15",
                "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                busy != null && "opacity-60",
              )}
              disabled={busy != null}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
              }}
            />
          </label>

          {importKind === "products" ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-foreground">Branch for opening stock</span>
              <select
                className={dashboardSelectClass(busy != null || branchesLoading)}
                disabled={busy != null || branchesLoading}
                value={branchForStock || branchId || ""}
                onChange={(e) => setBranchForStock(e.target.value)}
              >
                <option value="">Use workspace default branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <span className={dashboardHintClass()}>
                Required when any row has <code className="rounded bg-muted px-1">current_stock</code> &gt; 0. Unit cost
                for opening balance defaults to 1% of sell price (minimum 0.01).
              </span>
            </label>
          ) : importKind === "suppliers" ? (
            <p className={dashboardHintClass()}>
              Each row needs a display name: <code className="rounded bg-muted px-1">name</code>,{" "}
              <code className="rounded bg-muted px-1">company_name</code>, nested{" "}
              <code className="rounded bg-muted px-1">supplier.name</code>, or fallback <code className="rounded bg-muted px-1">code</code>. Optional{" "}
              <code className="rounded bg-muted px-1">id</code> from the export (UUID) is stored to map buying prices. Supported
              wrappers: top-level array or <code className="rounded bg-muted px-1">suppliers</code> /{" "}
              <code className="rounded bg-muted px-1">vendors</code> / <code className="rounded bg-muted px-1">data</code> /{" "}
              <code className="rounded bg-muted px-1">results</code> arrays. Duplicate <em>legacy ids</em> are dropped (first
              wins); duplicate <em>display names</em> get a short suffix so each row can be imported and mapped.
            </p>
          ) : importKind === "buying_prices" ? (
            <p className={dashboardHintClass()}>
              Each row matches the legacy export: <code className="rounded bg-muted px-1">item_id</code> or{" "}
              <code className="rounded bg-muted px-1">product_id</code> (UUID — same values as your product export’s id; Palmart matches by item id, stored legacy id, SKU{" "}
              <code className="rounded bg-muted px-1">IMP-{"<uuid>"}</code> when the product had no code, or optional{" "}
              <code className="rounded bg-muted px-1">product_code</code> / <code className="rounded bg-muted px-1">barcode</code>),{" "}
              <code className="rounded bg-muted px-1">supplier_id</code> (UUID or supplier code; if the UUID is not in Palmart,
              cost is attached to SYS-UNASSIGNED and the note records the original id), optional{" "}
              <code className="rounded bg-muted px-1">price</code> (number, stored as unit cost; alias{" "}
              <code className="rounded bg-muted px-1">unit_cost</code>),{" "}
              <code className="rounded bg-muted px-1">effective_from</code> (unix timestamp), optional{" "}
              <code className="rounded bg-muted px-1">notes</code>. Export-only fields are not applied:{" "}
              <code className="rounded bg-muted px-1">id</code>, <code className="rounded bg-muted px-1">set_by</code>,{" "}
              <code className="rounded bg-muted px-1">created_at</code> — the signed-in user is stored as setter and{" "}
              <code className="rounded bg-muted px-1">created_at</code> is the server import time. CamelCase keys are OK.
            </p>
          ) : (
            <p className={dashboardHintClass()}>
              Each row: <code className="rounded bg-muted px-1">item_id</code>,{" "}
              <code className="rounded bg-muted px-1">price</code>,{" "}
              <code className="rounded bg-muted px-1">effective_from</code> (unix). Optional{" "}
              <code className="rounded bg-muted px-1">branch_id</code> for branch-specific list prices; omit for business-wide
              sell price. Ignored export fields: <code className="rounded bg-muted px-1">id</code>,{" "}
              <code className="rounded bg-muted px-1">supplier_id</code>, <code className="rounded bg-muted px-1">set_by</code>
              , <code className="rounded bg-muted px-1">created_at</code>.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="min-h-10 shadow-sm transition-shadow hover:shadow-md"
              disabled={!file || busy != null}
              onClick={() => void run(true)}
            >
              {busy === "dry" ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Validating…
                </>
              ) : (
                "Validate only"
              )}
            </Button>
            <Button
              type="button"
              className="min-h-10 shadow-sm transition-shadow hover:shadow-md"
              disabled={!file || busy != null}
              onClick={() => void run(false)}
            >
              {busy === "commit" ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Importing…
                </>
              ) : (
                "Import"
              )}
            </Button>
          </div>
        </div>
      </section>

      {result ? (
        <ImportResultCard result={result} successMessage={jsonSuccessMessage} />
      ) : null}
    </div>
  );
}
