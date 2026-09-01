"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileJson,
  FileSpreadsheet,
  FileUp,
  Info,
  ListChecks,
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
  fetchCsvExport,
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
  { kind: "items", label: "Items", hint: "Catalog + prices + on-hand" },
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
    "category_name",
    "aisle_code",
    "brand",
    "size",
    "buying_price",
    "selling_price",
    "on_hand",
    "min_stock_level",
    "reorder_level",
    "supplier_name",
    "supplier_code",
    "image_url",
  ],
  suppliers: ["name", "code", "supplier_type", "vat_pin", "status", "notes"],
  "opening-stock": ["branch_name", "sku", "quantity", "unit_cost", "notes"],
};

/** Async import jobs are drained by a background worker (4s poll interval). */
const CSV_JOB_POLL_MS = 1500;
/** Give up the live progress UI after ~3 minutes; the job keeps running server-side. */
const CSV_JOB_MAX_POLLS = 120;

/** Icons for the CSV kind tabs and template rows. */
const CSV_KIND_ICONS: Record<CsvTemplateKind, LucideIcon> = {
  items: Package,
  suppliers: Truck,
  "opening-stock": Boxes,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const warnings = result.warnings ?? [];
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
        ) : warnings.length > 0 ? (
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
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
                <li key={`err-${err.line}-${i}`}>
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
          {warnings.length > 0 ? (
            <div className="mt-3 rounded-lg border border-amber-600/25 bg-amber-500/[0.06] px-3 py-2">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                {warnings.length} non-blocking note(s)
              </p>
              <ul className="mt-1 max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {warnings.map((w, i) => (
                  <li key={`warn-${w.line}-${i}`}>
                    {w.line > 0 ? (
                      <span className="font-mono text-foreground">Line {w.line}</span>
                    ) : null}
                    {w.line > 0 ? ": " : null}
                    {w.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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

/** Section header used by the main-column panels. */
function SectionHead({
  icon: Icon,
  title,
  desc,
  accent = false,
}: {
  icon: LucideIcon;
  title: string;
  desc: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border",
          accent
            ? "border-primary/20 bg-primary/10 text-primary"
            : "border-border/50 bg-muted/60 text-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className={cn(dashboardHintClass(), "mt-0.5 max-w-prose")}>{desc}</p>
      </div>
    </div>
  );
}

/** Styled file picker — a drop zone that becomes a ready chip once a file is chosen. */
function FileDropzone({
  file,
  accept,
  hint,
  disabled,
  onSelect,
  icon: Icon,
}: {
  file: File | null;
  accept: string;
  hint: string;
  disabled?: boolean;
  onSelect: (file: File | null) => void;
  icon: LucideIcon;
}) {
  return (
    <label
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-7 text-center transition-colors duration-150",
        "border-border/80 bg-muted/20 hover:border-primary/40 hover:bg-muted/30",
        "focus-within:border-primary/50 focus-within:bg-muted/30 focus-within:ring-2 focus-within:ring-ring/40 focus-within:ring-offset-2 focus-within:ring-offset-background",
        "has-disabled:cursor-not-allowed has-disabled:opacity-60",
      )}
    >
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <>
          <span className="flex size-10 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" aria-hidden />
          </span>
          <span className="max-w-full truncate text-sm font-semibold text-foreground">
            {file.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatBytes(file.size)} · tap to replace
          </span>
        </>
      ) : (
        <>
          <span className="flex size-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary transition-transform duration-150 group-hover:scale-105">
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-foreground">
            Drop your file here or browse
          </span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </>
      )}
    </label>
  );
}

/**
 * Live import feedback: a three-stage pipeline (upload → process → done) and a
 * percentage progress bar driven by the background job's row counters.
 */
function ImportProgress({
  busy,
  progress,
}: {
  busy: "dry" | "commit";
  progress: { rowsTotal: number | null; rowsProcessed: number } | null;
}) {
  const total = progress?.rowsTotal ?? null;
  const done = Math.max(0, progress?.rowsProcessed ?? 0);
  const pct =
    total != null && total > 0 ? Math.min(100, Math.round((done / total) * 100)) : null;
  const validating = busy === "dry";
  const stages = [
    { label: "Upload", state: "done" as const },
    { label: validating ? "Validating" : "Processing", state: "active" as const },
    { label: "Done", state: "todo" as const },
  ];

  return (
    <div
      role="progressbar"
      aria-label={validating ? "CSV validation progress" : "CSV import progress"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct ?? undefined}
      aria-valuetext={pct != null ? `${pct}% complete` : "queued"}
      className="rounded-xl border border-primary/15 bg-primary/4 p-4 sm:p-5"
    >
      {/* Pipeline stepper */}
      <div className="flex items-center">
        {stages.map((stage, i) => (
          <Fragment key={stage.label}>
            {i > 0 ? (
              <div
                className={cn(
                  "mx-2 h-px flex-1 sm:mx-3",
                  stages[i - 1].state === "todo" ? "bg-border" : "bg-primary/40",
                )}
                aria-hidden
              />
            ) : null}
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[11px] font-bold",
                  stage.state === "done" && "bg-primary text-white",
                  stage.state === "active" && "border-2 border-primary bg-background text-primary",
                  stage.state === "todo" && "border border-border bg-muted text-muted-foreground",
                )}
              >
                {stage.state === "done" ? (
                  <Check className="size-3.5" aria-hidden />
                ) : stage.state === "active" ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium tracking-tight",
                  stage.state === "todo" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {stage.label}
              </span>
            </div>
          </Fragment>
        ))}
      </div>

      {/* Percentage readout + bar */}
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {pct != null
            ? `${done.toLocaleString()} of ${total?.toLocaleString()} rows`
            : "Queued — processing shortly…"}
        </span>
        <span className="text-lg font-bold tabular-nums tracking-tight text-primary">
          {pct != null ? `${pct}%` : "—"}
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "import-fill relative h-full overflow-hidden rounded-full bg-primary",
            pct != null ? "transition-[width] duration-300 ease-out" : "w-full",
          )}
          style={pct != null ? { width: `${pct}%` } : undefined}
        >
          <span className="import-fill-shimmer" aria-hidden />
        </div>
      </div>
    </div>
  );
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
  const [exportBusy, setExportBusy] = useState<CsvTemplateKind | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
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
            warnings: job.warnings ?? [],
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
          warnings: [],
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

  const onDownloadExport = useCallback(async (kind: CsvTemplateKind) => {
    setExportBusy(kind);
    setExportError(null);
    try {
      const blob = await fetchCsvExport(kind);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind}-export.csv`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(
        "Could not export. Check your connection and permission, then try again.",
      );
    } finally {
      setExportBusy(null);
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
            to upload data. Ask an administrator to grant this permission on your role.
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
  const csvKindLabel = CSV_TEMPLATES.find((t) => t.kind === csvKind)?.label ?? csvKind;

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        icon={FileSpreadsheet}
        eyebrow="Integrations"
        title="Data import"
        description="Export catalog data as CSV, edit in Excel, and import back with the same columns. Validate first, then import with live progress. Legacy JSON exports are supported below."
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Main column — the two import flows */}
        <div className="min-w-0 space-y-6">
          {/* CSV import — the primary task */}
          <section className={cn(DASHBOARD_SECTION_SURFACE, "relative overflow-hidden")}>
            <SectionHead
              accent
              icon={FileSpreadsheet}
              title="Import from CSV"
              desc="Upload a file completed from one of the templates. Validate first to catch row errors, then import — jobs run in the background with live progress."
            />

            <div className={cn("mt-5 flex flex-wrap gap-2 rounded-xl border border-border/50 bg-muted/25 p-1.5")}>
              {CSV_TEMPLATES.map((t) => {
                const Icon = CSV_KIND_ICONS[t.kind];
                return (
                  <Button
                    key={t.kind}
                    type="button"
                    variant={csvKind === t.kind ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex-1 gap-1.5 sm:flex-initial",
                      csvKind !== t.kind && "text-muted-foreground hover:text-foreground",
                    )}
                    disabled={csvBusy != null}
                    onClick={() => {
                      setCsvKind(t.kind);
                      setCsvResult(null);
                    }}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {t.label}
                  </Button>
                );
              })}
            </div>

            <div className="mt-5 space-y-5">
              <FileDropzone
                file={csvFile}
                accept=".csv,text/csv"
                hint=".csv — columns must match the template order"
                disabled={csvBusy != null}
                onSelect={(f) => {
                  setCsvFile(f);
                  setCsvResult(null);
                }}
                icon={FileUp}
              />

              <div>
                <p className={cn(dashboardHintClass(), "mb-1.5")}>
                  Columns expected for{" "}
                  <span className="font-semibold text-foreground">{csvKindLabel}</span>
                  {csvKind === "items" ? (
                    <>
                      {" "}
                      — only <code className="rounded bg-muted px-1">sku</code> and{" "}
                      <code className="rounded bg-muted px-1">name</code> are required; leave the rest blank or omit
                      them. Optional{" "}
                      <code className="rounded bg-muted px-1">supplier_name</code> /{" "}
                      <code className="rounded bg-muted px-1">supplier_code</code> link the item to an existing
                      supplier (matched by exact code, then exact name); unmatched values are reported as notes.
                      Optional <code className="rounded bg-muted px-1">image_url</code> sets the product image.
                    </>
                  ) : null}
                  :
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CSV_COLUMNS[csvKind].map((col) => (
                    <code
                      key={col}
                      className="rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                    >
                      {col}
                    </code>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="shadow-sm transition-shadow hover:shadow-md"
                  disabled={!csvFile || csvBusy != null}
                  onClick={() => void runCsv(true)}
                >
                  {csvBusy === "dry" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Validating…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" aria-hidden />
                      Validate only
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="shadow-sm transition-shadow hover:shadow-md"
                  disabled={!csvFile || csvBusy != null}
                  onClick={() => void runCsv(false)}
                >
                  {csvBusy === "commit" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Importing…
                    </>
                  ) : (
                    <>
                      <FileUp className="size-4" aria-hidden />
                      Import
                    </>
                  )}
                </Button>
                {csvFile && csvBusy == null ? (
                  <span className="text-xs text-muted-foreground">
                    Ready: <span className="font-medium text-foreground">{csvFile.name}</span>
                  </span>
                ) : null}
              </div>
            </div>

            {csvBusy != null && !csvResult ? (
              <div className="mt-5">
                <ImportProgress busy={csvBusy} progress={csvProgress} />
              </div>
            ) : null}
            {csvResult ? (
              <div className="mt-5">
                <ImportResultCard
                  result={csvResult}
                  successMessage={csvSuccessMessage}
                  failureMessage={csvFailure}
                />
              </div>
            ) : null}
          </section>

          {/* Legacy JSON imports */}
          <section className={DASHBOARD_SECTION_SURFACE}>
            <SectionHead
              icon={KindIcon}
              title="Legacy JSON import"
              desc="For exports from the old system: products, suppliers, buying prices, or selling prices. CSV is recommended for new imports."
            />

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

            <div className="mt-5 space-y-5">
              <FileDropzone
                file={file}
                accept=".json,application/json"
                hint=".json — array or wrapped under products / suppliers / prices keys"
                disabled={busy != null}
                onSelect={(f) => {
                  setFile(f);
                  setResult(null);
                }}
                icon={FileJson}
              />

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
                    Pulls shelf price, buying/cost, and stock from the product export when present
                    (<code className="rounded bg-muted px-1">current_sell_price</code> /{" "}
                    <code className="rounded bg-muted px-1">selling_price</code>,{" "}
                    <code className="rounded bg-muted px-1">buying_price</code> /{" "}
                    <code className="rounded bg-muted px-1">cost_price</code>,{" "}
                    <code className="rounded bg-muted px-1">current_stock</code> /{" "}
                    <code className="rounded bg-muted px-1">quantity</code>). Branch is required for stock &gt; 0
                    (defaults to the first branch if left blank). Re-importing the same file updates prices on
                    existing SKUs; opening stock is only posted when on-hand is still zero. Opening unit cost
                    uses the buying price when available.
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

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="shadow-sm transition-shadow hover:shadow-md"
                  disabled={!file || busy != null}
                  onClick={() => void run(true)}
                >
                  {busy === "dry" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Validating…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" aria-hidden />
                      Validate only
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="shadow-sm transition-shadow hover:shadow-md"
                  disabled={!file || busy != null}
                  onClick={() => void run(false)}
                >
                  {busy === "commit" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Importing…
                    </>
                  ) : (
                    <>
                      <FileUp className="size-4" aria-hidden />
                      Import
                    </>
                  )}
                </Button>
              </div>
            </div>

            {result ? (
              <div className="mt-5">
                <ImportResultCard result={result} successMessage={jsonSuccessMessage} />
              </div>
            ) : null}
          </section>
        </div>

        {/* Rail — templates, how-to, and background notes */}
        <aside className="min-w-0 space-y-6">
          <section className={DASHBOARD_SECTION_SURFACE}>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/60 text-foreground">
                <FileSpreadsheet className="size-4" aria-hidden />
              </span>
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Start with a template
                </h2>
                <p className={cn(dashboardHintClass(), "mt-0.5")}>
                  Pre-mapped to the columns we import.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {CSV_TEMPLATES.map((t) => {
                const Icon = CSV_KIND_ICONS[t.kind];
                const busy = templateBusy === t.kind;
                return (
                  <div
                    key={t.kind}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-3 shadow-sm transition-colors hover:border-border"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/50 text-muted-foreground">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight text-foreground">{t.label}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {CSV_COLUMNS[t.kind].length} columns · {t.hint}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={templateBusy != null}
                      aria-label={`Download ${t.label} template`}
                      onClick={() => void onDownloadTemplate(t.kind)}
                    >
                      {busy ? (
                        <Loader2 className="animate-spin" aria-hidden />
                      ) : (
                        <Download aria-hidden />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
            {templateError ? (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {templateError}
              </p>
            ) : null}
          </section>

          <section className={DASHBOARD_SECTION_SURFACE}>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/60 text-foreground">
                <Download className="size-4" aria-hidden />
              </span>
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Export current data
                </h2>
                <p className={cn(dashboardHintClass(), "mt-0.5")}>
                  Same columns as the templates — edit and re-upload. Extra item columns
                  (prices, on-hand, category) are optional on import.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {CSV_TEMPLATES.map((t) => {
                const Icon = CSV_KIND_ICONS[t.kind];
                const busy = exportBusy === t.kind;
                return (
                  <div
                    key={`export-${t.kind}`}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-3 shadow-sm transition-colors hover:border-border"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/50 text-muted-foreground">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight text-foreground">{t.label}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {CSV_COLUMNS[t.kind].length} columns · live catalog
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={exportBusy != null}
                      aria-label={`Export ${t.label} CSV`}
                      onClick={() => void onDownloadExport(t.kind)}
                    >
                      {busy ? (
                        <Loader2 className="animate-spin" aria-hidden />
                      ) : (
                        <Download aria-hidden />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
            {exportError ? (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {exportError}
              </p>
            ) : null}
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Items and suppliers import creates new rows — existing SKUs / supplier names will
              fail validation. Opening stock posts additional quantity (it does not replace
              on-hand). Prefer export for backup and for adding only new rows.
            </p>
          </section>

          <section className={DASHBOARD_SECTION_SURFACE}>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/60 text-foreground">
                <ListChecks className="size-4" aria-hidden />
              </span>
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-foreground">How it works</h2>
                <p className={cn(dashboardHintClass(), "mt-0.5")}>
                  CSV round-trip.
                </p>
              </div>
            </div>

            <ol className="mt-4 space-y-3.5">
              {[
                ["Export or download a template", "Start from live data or an empty pre-mapped file."],
                ["Edit in Excel", "Keep the header row; save as .csv when done."],
                ["Upload & validate", "A dry run checks every row and reports line-level errors."],
                ["Import & track", "Rows are committed in the background — watch the progress bar."],
              ].map(([title, desc], i) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted text-[11px] font-bold text-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-primary/15 bg-primary/4 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Info className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  Large imports run in the background
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Files with hundreds or thousands of rows are processed as a job on our side. You can
                  leave this page while it runs — progress updates here every few seconds.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
