"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  FileJson,
  FileSpreadsheet,
  FileUp,
  Info,
  Loader2,
  Package,
  Search,
  Tags,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useMediaLg } from "@/hooks/use-media-lg";
import type { BranchRecord, JsonImportResponse } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import {
  CSV_COLUMNS,
  CSV_KIND_ICONS,
  CSV_TEMPLATES,
  csvSuccessMessage,
  formatBytes,
  IMPORT_SECTIONS,
  isCsvSection,
  isLegacySection,
  jsonSuccessMessage,
  sectionMeta,
  type CsvTemplateKind,
  type ImportKind,
  type ImportSectionId,
} from "./import-shared";

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
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
        "flex flex-col gap-1 rounded-none border px-4 py-3.5 text-sm leading-relaxed shadow-none",
        failed
          ? "border-destructive/25 bg-destructive/5"
          : "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-50",
      )}
    >
      <div className="flex items-start gap-3">
        {failed ? (
          <AlertCircle
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden
          />
        ) : warnings.length > 0 ? (
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
        ) : (
          <CheckCircle2
            className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            {result.dryRun ? "Validation" : "Import"} · {result.rowsParsed}{" "}
            row(s) parsed
            {result.rowsCommitted != null
              ? ` · ${result.rowsCommitted} committed`
              : null}
          </p>
          {result.errors.length > 0 ? (
            <ul className="mt-3 max-h-64 list-inside list-disc space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {result.errors.map((err, i) => (
                <li key={`err-${err.line}-${i}`}>
                  <span className="font-mono text-foreground">
                    Line {err.line}
                  </span>
                  : {err.message}
                </li>
              ))}
            </ul>
          ) : failureMessage ? (
            <p className="mt-2 text-xs leading-relaxed text-destructive">
              {failureMessage}
            </p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {successMessage}
            </p>
          )}
          {warnings.length > 0 ? (
            <div className="mt-3 rounded-none border border-amber-600/25 bg-amber-500/[0.06] px-3 py-2">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                {warnings.length} non-blocking note(s)
              </p>
              <ul className="mt-1 max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {warnings.map((w, i) => (
                  <li key={`warn-${w.line}-${i}`}>
                    {w.line > 0 ? (
                      <span className="font-mono text-foreground">
                        Line {w.line}
                      </span>
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
        "group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-none border-2 border-dashed px-6 py-7 text-center transition-colors duration-150",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_22%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)] hover:border-[var(--pos-primary,#0f766e)]/40",
        "focus-within:border-[var(--pos-primary,#0f766e)]/50 focus-within:ring-2 focus-within:ring-[var(--pos-primary,#0f766e)]/30",
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
          <span className="flex size-10 items-center justify-center rounded-none border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
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
          <span className="flex size-10 items-center justify-center rounded-none border border-[var(--pos-primary,#0f766e)]/20 bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)] transition-transform duration-150 group-hover:scale-105">
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
    total != null && total > 0
      ? Math.min(100, Math.round((done / total) * 100))
      : null;
  const validating = busy === "dry";
  const stages = [
    { label: "Upload", state: "done" as const },
    {
      label: validating ? "Validating" : "Processing",
      state: "active" as const,
    },
    { label: "Done", state: "todo" as const },
  ];

  return (
    <div
      role="progressbar"
      aria-label={
        validating ? "CSV validation progress" : "CSV import progress"
      }
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct ?? undefined}
      aria-valuetext={pct != null ? `${pct}% complete` : "queued"}
      className="rounded-none border border-[var(--pos-primary,#0f766e)]/15 bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,white)] p-4 sm:p-5"
    >
      <div className="flex items-center">
        {stages.map((stage, i) => (
          <Fragment key={stage.label}>
            {i > 0 ? (
              <div
                className={cn(
                  "mx-2 h-px flex-1 sm:mx-3",
                  stages[i - 1].state === "todo"
                    ? "bg-border"
                    : "bg-[var(--pos-primary,#0f766e)]/40",
                )}
                aria-hidden
              />
            ) : null}
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-none text-[11px] font-bold",
                  stage.state === "done" &&
                    "bg-[var(--pos-primary,#0f766e)] text-white",
                  stage.state === "active" &&
                    "border-2 border-[var(--pos-primary,#0f766e)] bg-background text-[var(--pos-primary,#0f766e)]",
                  stage.state === "todo" &&
                    "border border-border bg-muted text-muted-foreground",
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
                  stage.state === "todo"
                    ? "text-muted-foreground"
                    : "text-foreground",
                )}
              >
                {stage.label}
              </span>
            </div>
          </Fragment>
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {pct != null
            ? `${done.toLocaleString()} of ${total?.toLocaleString()} rows`
            : "Queued — processing shortly…"}
        </span>
        <span className="text-lg font-bold tabular-nums tracking-tight text-[var(--pos-primary,#0f766e)]">
          {pct != null ? `${pct}%` : "—"}
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-none bg-muted">
        <div
          className={cn(
            "import-fill relative h-full overflow-hidden rounded-none bg-[var(--pos-primary,#0f766e)]",
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

function resultChip(result: JsonImportResponse | null, label: string) {
  if (!result) return null;
  const failed = result.errors.length > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold",
        failed
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-emerald-600/25 bg-emerald-500/10 text-emerald-800",
      )}
    >
      {label}: {result.dryRun ? "validated" : "imported"}{" "}
      {result.rowsParsed} row
      {result.rowsParsed === 1 ? "" : "s"}
    </span>
  );
}

function ImportContextBanner({
  csvBusy,
  busy,
  csvResult,
  result,
  csvFile,
  file,
}: {
  csvBusy: "dry" | "commit" | null;
  busy: "dry" | "commit" | null;
  csvResult: JsonImportResponse | null;
  result: JsonImportResponse | null;
  csvFile: File | null;
  file: File | null;
}) {
  const anyBusy = csvBusy != null || busy != null;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <LiveDot />
          Data import
        </span>
        <span className={dashboardHintClass()}>
          CSV {csvFile ? "ready" : "idle"} · Legacy {file ? "ready" : "idle"}
        </span>
        {anyBusy ? (
          <span className="font-medium text-[#0f766e]">
            · {csvBusy === "dry" || busy === "dry" ? "validating" : "importing"}
            …
          </span>
        ) : null}
        {resultChip(csvResult, "CSV")}
        {resultChip(result, "JSON")}
      </p>
      <span className={cn(dashboardHintClass(), "hidden sm:inline")}>
        Validate first — then import from the panel.
      </span>
    </div>
  );
}

function ImportPulse({
  csvFile,
  file,
  csvResult,
  result,
  onSelectSection,
  className,
}: {
  csvFile: File | null;
  file: File | null;
  csvResult: JsonImportResponse | null;
  result: JsonImportResponse | null;
  onSelectSection: (id: ImportSectionId) => void;
  className?: string;
}) {
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M20 36 C 36 22, 60 18, 78 26"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M24 54 C 44 64, 62 58, 76 68"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className={cn(card, "left-3 top-[10%]")}>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <FileSpreadsheet
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          CSV round-trip
        </p>
        <ol className="mt-2 space-y-1.5 text-[11px] leading-snug text-muted-foreground">
          <li>1. Export or template</li>
          <li>2. Edit in Excel → .csv</li>
          <li>3. Validate, then import</li>
        </ol>
      </div>

      <div className={cn(card, "right-3 top-[28%] space-y-2")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Ready files
        </p>
        <p className="text-[12px] text-foreground">
          CSV:{" "}
          <span className="font-semibold">
            {csvFile?.name ?? "none selected"}
          </span>
        </p>
        <p className="text-[12px] text-foreground">
          JSON:{" "}
          <span className="font-semibold">{file?.name ?? "none selected"}</span>
        </p>
        <div className="flex flex-wrap gap-1 pt-1">
          {resultChip(csvResult, "CSV")}
          {resultChip(result, "JSON")}
        </div>
      </div>

      <button
        type="button"
        className={cn(
          card,
          "bottom-[10%] left-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={() => onSelectSection("csv-items")}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <Package
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Start with CSV Items
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
          Or pick a section from the roster
        </p>
      </button>

      <button
        type="button"
        className={cn(
          card,
          "bottom-[10%] right-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={() => onSelectSection("templates")}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <Download
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Need a blank template?
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
          Download pre-mapped columns
        </p>
      </button>
    </div>
  );
}

function CsvColumnNote({ csvKind }: { csvKind: CsvTemplateKind }) {
  const csvKindLabel =
    CSV_TEMPLATES.find((t) => t.kind === csvKind)?.label ?? csvKind;
  return (
    <div>
      <p className={cn(dashboardHintClass(), "mb-1.5")}>
        Columns expected for{" "}
        <span className="font-semibold text-foreground">{csvKindLabel}</span>
        {csvKind === "items" ? (
          <>
            {" "}
            — only <code className="rounded-none bg-muted px-1">sku</code> and{" "}
            <code className="rounded-none bg-muted px-1">name</code> are
            required; leave the rest blank or omit them. Optional{" "}
            <code className="rounded-none bg-muted px-1">supplier_name</code> /{" "}
            <code className="rounded-none bg-muted px-1">supplier_code</code>{" "}
            link the item to an existing supplier (matched by exact code, then
            exact name); unmatched values are reported as notes. Optional{" "}
            <code className="rounded-none bg-muted px-1">image_url</code> sets
            the product image.
          </>
        ) : null}
        :
      </p>
      <div className="flex flex-wrap gap-1.5">
        {CSV_COLUMNS[csvKind].map((col) => (
          <code
            key={col}
            className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] px-1.5 py-0.5 font-mono text-[11px] text-foreground"
          >
            {col}
          </code>
        ))}
      </div>
    </div>
  );
}

function LegacyHint({ importKind }: { importKind: ImportKind }) {
  if (importKind === "products") {
    return (
      <p className={dashboardHintClass()}>
        Pulls shelf price, buying/cost, and stock from the product export when
        present (
        <code className="rounded-none bg-muted px-1">current_sell_price</code> /{" "}
        <code className="rounded-none bg-muted px-1">selling_price</code>,{" "}
        <code className="rounded-none bg-muted px-1">buying_price</code> /{" "}
        <code className="rounded-none bg-muted px-1">cost_price</code>,{" "}
        <code className="rounded-none bg-muted px-1">current_stock</code> /{" "}
        <code className="rounded-none bg-muted px-1">quantity</code>). Branch is
        required for stock &gt; 0 (defaults to the first branch if left blank).
        Re-importing the same file updates prices on existing SKUs; opening
        stock is only posted when on-hand is still zero. Opening unit cost uses
        the buying price when available.
      </p>
    );
  }
  if (importKind === "suppliers") {
    return (
      <p className={dashboardHintClass()}>
        Each row needs a display name:{" "}
        <code className="rounded-none bg-muted px-1">name</code>,{" "}
        <code className="rounded-none bg-muted px-1">company_name</code>, nested{" "}
        <code className="rounded-none bg-muted px-1">supplier.name</code>, or
        fallback <code className="rounded-none bg-muted px-1">code</code>.
        Optional <code className="rounded-none bg-muted px-1">id</code> from the
        export (UUID) is stored to map buying prices. Supported wrappers:
        top-level array or{" "}
        <code className="rounded-none bg-muted px-1">suppliers</code> /{" "}
        <code className="rounded-none bg-muted px-1">vendors</code> /{" "}
        <code className="rounded-none bg-muted px-1">data</code> /{" "}
        <code className="rounded-none bg-muted px-1">results</code> arrays.
        Duplicate <em>legacy ids</em> are dropped (first wins); duplicate{" "}
        <em>display names</em> get a short suffix so each row can be imported
        and mapped.
      </p>
    );
  }
  if (importKind === "buying_prices") {
    return (
      <p className={dashboardHintClass()}>
        Each row matches the legacy export:{" "}
        <code className="rounded-none bg-muted px-1">item_id</code> or{" "}
        <code className="rounded-none bg-muted px-1">product_id</code> (UUID —
        same values as your product export’s id; Palmart matches by item id,
        stored legacy id, SKU{" "}
        <code className="rounded-none bg-muted px-1">IMP-{"<uuid>"}</code> when
        the product had no code, or optional{" "}
        <code className="rounded-none bg-muted px-1">product_code</code> /{" "}
        <code className="rounded-none bg-muted px-1">barcode</code>),{" "}
        <code className="rounded-none bg-muted px-1">supplier_id</code> (UUID or
        supplier code; if the UUID is not in Palmart, cost is attached to
        SYS-UNASSIGNED and the note records the original id), optional{" "}
        <code className="rounded-none bg-muted px-1">price</code> (number,
        stored as unit cost; alias{" "}
        <code className="rounded-none bg-muted px-1">unit_cost</code>),{" "}
        <code className="rounded-none bg-muted px-1">effective_from</code> (unix
        timestamp), optional{" "}
        <code className="rounded-none bg-muted px-1">notes</code>. Export-only
        fields are not applied:{" "}
        <code className="rounded-none bg-muted px-1">id</code>,{" "}
        <code className="rounded-none bg-muted px-1">set_by</code>,{" "}
        <code className="rounded-none bg-muted px-1">created_at</code> — the
        signed-in user is stored as setter and{" "}
        <code className="rounded-none bg-muted px-1">created_at</code> is the
        server import time. CamelCase keys are OK.
      </p>
    );
  }
  return (
    <p className={dashboardHintClass()}>
      Each row: <code className="rounded-none bg-muted px-1">item_id</code>,{" "}
      <code className="rounded-none bg-muted px-1">price</code>,{" "}
      <code className="rounded-none bg-muted px-1">effective_from</code> (unix).
      Optional <code className="rounded-none bg-muted px-1">branch_id</code> for
      branch-specific list prices; omit for business-wide sell price. Ignored
      export fields: <code className="rounded-none bg-muted px-1">id</code>,{" "}
      <code className="rounded-none bg-muted px-1">supplier_id</code>,{" "}
      <code className="rounded-none bg-muted px-1">set_by</code>,{" "}
      <code className="rounded-none bg-muted px-1">created_at</code>.
    </p>
  );
}

function ImportFocus({
  sectionId,
  csvKind,
  importKind,
  csvBusy,
  csvProgress,
  csvResult,
  csvFailure,
  busy,
  result,
  className,
}: {
  sectionId: ImportSectionId;
  csvKind: CsvTemplateKind;
  importKind: ImportKind;
  csvBusy: "dry" | "commit" | null;
  csvProgress: { rowsTotal: number | null; rowsProcessed: number } | null;
  csvResult: JsonImportResponse | null;
  csvFailure: string | null;
  busy: "dry" | "commit" | null;
  result: JsonImportResponse | null;
  className?: string;
}) {
  const meta = sectionMeta(sectionId);
  const Icon = meta.icon;
  const csv = isCsvSection(sectionId);
  const legacy = isLegacySection(sectionId);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
        className,
      )}
    >
      <div className="max-w-md space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <Icon className="size-3" aria-hidden />
          {meta.label}
        </span>
        <h2
          className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {meta.label}
        </h2>
        <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
          {meta.hint}
        </p>

        {csv ? (
          <div className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2">
            <p className="text-[12px] font-semibold text-foreground">
              {CSV_COLUMNS[csvKind].length} columns expected
            </p>
            <p className={cn(dashboardHintClass(), "mt-1")}>
              Header order must match the template. Validate before import.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {CSV_COLUMNS[csvKind].slice(0, 8).map((col) => (
                <code
                  key={col}
                  className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-1 py-0.5 font-mono text-[10px]"
                >
                  {col}
                </code>
              ))}
              {CSV_COLUMNS[csvKind].length > 8 ? (
                <span className="text-[10px] text-muted-foreground">
                  +{CSV_COLUMNS[csvKind].length - 8} more
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {legacy && importKind === "products" ? (
          <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
            Pick a branch for opening stock in the panel when the export
            includes on-hand quantity.
          </p>
        ) : null}

        {sectionId === "templates" ? (
          <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
            Three blank CSVs — items, suppliers, opening stock — pre-mapped to
            import columns.
          </p>
        ) : null}

        {sectionId === "export" ? (
          <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
            Live catalog export uses the same columns as templates — edit and
            re-upload.
          </p>
        ) : null}

        {sectionId === "howto" ? (
          <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
            Export → Excel → validate → import. Large files keep running as a
            background job.
          </p>
        ) : null}

        {csv && csvBusy != null && !csvResult ? (
          <ImportProgress busy={csvBusy} progress={csvProgress} />
        ) : null}
        {csv && csvResult ? (
          <ImportResultCard
            result={csvResult}
            successMessage={csvSuccessMessage(csvKind)}
            failureMessage={csvFailure}
          />
        ) : null}
        {legacy && result ? (
          <ImportResultCard
            result={result}
            successMessage={jsonSuccessMessage(importKind)}
          />
        ) : null}
        {legacy && busy != null && !result ? (
          <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {busy === "dry" ? "Validating JSON…" : "Importing JSON…"}
          </p>
        ) : null}
      </div>
      <p
        className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
      >
        <LiveDot />
        {csv || legacy
          ? "Actions live in the panel → Validate, then Import"
          : "Use the panel for downloads and steps"}
      </p>
    </div>
  );
}

function DownloadRows({
  mode,
  busyKind,
  error,
  disabled,
  onDownload,
}: {
  mode: "template" | "export";
  busyKind: CsvTemplateKind | null;
  error: string | null;
  disabled: boolean;
  onDownload: (kind: CsvTemplateKind) => void;
}) {
  return (
    <div className="space-y-2">
      {CSV_TEMPLATES.map((t) => {
        const Icon = CSV_KIND_ICONS[t.kind];
        const rowBusy = busyKind === t.kind;
        return (
          <div
            key={`${mode}-${t.kind}`}
            className="flex items-center gap-3 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white p-3"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] text-muted-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight text-foreground">
                {t.label}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {CSV_COLUMNS[t.kind].length} columns ·{" "}
                {mode === "template" ? t.hint : "live catalog"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={disabled}
              aria-label={
                mode === "template"
                  ? `Download ${t.label} template`
                  : `Export ${t.label} CSV`
              }
              onClick={() => onDownload(t.kind)}
            >
              {rowBusy ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Download aria-hidden />
              )}
            </Button>
          </div>
        );
      })}
      {error ? (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function sectionStatus(
  id: ImportSectionId,
  csvKind: CsvTemplateKind,
  importKind: ImportKind,
  csvFile: File | null,
  file: File | null,
  csvBusy: "dry" | "commit" | null,
  busy: "dry" | "commit" | null,
  csvResult: JsonImportResponse | null,
  result: JsonImportResponse | null,
): string {
  if (id === "templates") return "3 blank CSVs";
  if (id === "export") return "Live catalog download";
  if (id === "howto") return "4-step round-trip";
  if (isCsvSection(id)) {
    const kind = id === "csv-items" ? "items" : id === "csv-suppliers" ? "suppliers" : "opening-stock";
    if (csvKind === kind && csvBusy) {
      return csvBusy === "dry" ? "Validating…" : "Importing…";
    }
    if (csvKind === kind && csvResult) {
      return csvResult.errors.length
        ? `${csvResult.errors.length} error(s)`
        : `${csvResult.rowsParsed} row(s)`;
    }
    if (csvKind === kind && csvFile) return csvFile.name;
    return `${CSV_COLUMNS[kind].length} columns`;
  }
  if (isLegacySection(id)) {
    const kind =
      id === "legacy-products"
        ? "products"
        : id === "legacy-suppliers"
          ? "suppliers"
          : id === "legacy-buying"
            ? "buying_prices"
            : "selling_prices";
    if (importKind === kind && busy) {
      return busy === "dry" ? "Validating…" : "Importing…";
    }
    if (importKind === kind && result) {
      return result.errors.length
        ? `${result.errors.length} error(s)`
        : `${result.rowsParsed} row(s)`;
    }
    if (importKind === kind && file) return file.name;
    return "JSON export";
  }
  return "";
}

export type ImportTheatreProps = {
  activeSectionId: ImportSectionId | null;
  onActiveSectionChange: (id: ImportSectionId | null) => void;
  csvKind: CsvTemplateKind;
  importKind: ImportKind;
  csvFile: File | null;
  onCsvFileChange: (file: File | null) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  branchForStock: string;
  onBranchForStockChange: (id: string) => void;
  branchId: string;
  branches: BranchRecord[];
  branchesLoading: boolean;
  csvBusy: "dry" | "commit" | null;
  busy: "dry" | "commit" | null;
  csvProgress: { rowsTotal: number | null; rowsProcessed: number } | null;
  csvResult: JsonImportResponse | null;
  csvFailure: string | null;
  result: JsonImportResponse | null;
  onRunCsv: (dryRun: boolean) => void;
  onRunLegacy: (dryRun: boolean) => void;
  templateBusy: CsvTemplateKind | null;
  templateError: string | null;
  onDownloadTemplate: (kind: CsvTemplateKind) => void;
  exportBusy: CsvTemplateKind | null;
  exportError: string | null;
  onDownloadExport: (kind: CsvTemplateKind) => void;
};

export function ImportTheatre({
  activeSectionId,
  onActiveSectionChange,
  csvKind,
  importKind,
  csvFile,
  onCsvFileChange,
  file,
  onFileChange,
  branchForStock,
  onBranchForStockChange,
  branchId,
  branches,
  branchesLoading,
  csvBusy,
  busy,
  csvProgress,
  csvResult,
  csvFailure,
  result,
  onRunCsv,
  onRunLegacy,
  templateBusy,
  templateError,
  onDownloadTemplate,
  exportBusy,
  exportError,
  onDownloadExport,
}: ImportTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return IMPORT_SECTIONS;
    return IMPORT_SECTIONS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q),
    );
  }, [query]);

  const selectSection = (id: ImportSectionId) => {
    onActiveSectionChange(id);
    if (!isLg) setMobileDrawerOpen(true);
  };

  const clearSection = () => {
    onActiveSectionChange(null);
    setMobileDrawerOpen(false);
  };

  const activeMeta = activeSectionId ? sectionMeta(activeSectionId) : null;
  const drawerOpen = !!activeSectionId && (isLg || mobileDrawerOpen);

  useEffect(() => {
    if (activeSectionId && !isLg) {
      setMobileDrawerOpen(true);
    }
  }, [activeSectionId, isLg]);

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;

    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          fill ? "h-full bg-transparent" : "bg-white",
        )}
      >
        <div
          className={cn(
            "shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3",
            fill ? "bg-transparent" : "sticky top-0 z-[1] bg-white",
          )}
        >
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(
                dashboardInputClass(),
                "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]",
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search import…"
              aria-label="Search import sections"
            />
          </label>
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {filteredSections.length} section
            {filteredSections.length === 1 ? "" : "s"}
            {csvBusy || busy ? (
              <span className="text-[#0f766e]"> · busy</span>
            ) : null}
          </p>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {filteredSections.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              No sections match “{query.trim()}”.
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filteredSections.map((item) => {
                const active = activeSectionId === item.id;
                const Icon = item.icon;
                const status = sectionStatus(
                  item.id,
                  csvKind,
                  importKind,
                  csvFile,
                  file,
                  csvBusy,
                  busy,
                  csvResult,
                  result,
                );
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectSection(item.id)}
                      className={cn(
                        "relative flex w-full items-start gap-2.5 text-left transition-colors",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-7 shrink-0 place-items-center border",
                          active
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {item.label}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                          {status}
                        </p>
                      </div>
                      {!denser ? (
                        <ChevronRight
                          className="mt-1 size-4 shrink-0 text-muted-foreground/70"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const room = activeSectionId ? (
    <ImportFocus
      sectionId={activeSectionId}
      csvKind={csvKind}
      importKind={importKind}
      csvBusy={csvBusy}
      csvProgress={csvProgress}
      csvResult={csvResult}
      csvFailure={csvFailure}
      busy={busy}
      result={result}
      className="h-full min-h-0"
    />
  ) : (
    <ImportPulse
      csvFile={csvFile}
      file={file}
      csvResult={csvResult}
      result={result}
      onSelectSection={selectSection}
      className="h-full min-h-0"
    />
  );

  const relatedLinks: { href: string; label: string; icon: LucideIcon }[] = [
    { href: APP_ROUTES.business, label: "Business", icon: Building2 },
    { href: APP_ROUTES.products, label: "Products", icon: Package },
    { href: APP_ROUTES.suppliers, label: "Suppliers", icon: Truck },
    { href: APP_ROUTES.pricing, label: "Pricing", icon: Tags },
  ];

  const inspect = activeSectionId ? null : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a section
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          Validate first to catch row errors, then import. CSV jobs run in the
          background with live progress.
        </p>
        <div className="mt-4 flex flex-col gap-1.5">
          {relatedLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-2 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-2.5 py-2 text-[12px] font-semibold text-foreground transition-colors hover:border-[var(--pos-primary,#0f766e)]"
            >
              <Icon className="size-3.5 text-muted-foreground" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </div>
      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
        <Info className="size-3.5 shrink-0" aria-hidden />
        Tip: always dry-run before a live import
      </p>
    </div>
  );

  let drawerBody: ReactNode = null;
  if (activeSectionId && isCsvSection(activeSectionId)) {
    drawerBody = (
      <div className="space-y-5">
        <FileDropzone
          file={csvFile}
          accept=".csv,text/csv"
          hint=".csv — columns must match the template order"
          disabled={csvBusy != null}
          onSelect={(f) => onCsvFileChange(f)}
          icon={FileUp}
        />
        <CsvColumnNote csvKind={csvKind} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="shadow-none"
            disabled={!csvFile || csvBusy != null}
            onClick={() => onRunCsv(true)}
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
            className="shadow-none"
            disabled={!csvFile || csvBusy != null}
            onClick={() => onRunCsv(false)}
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
              Ready:{" "}
              <span className="font-medium text-foreground">{csvFile.name}</span>
            </span>
          ) : null}
        </div>
        {csvBusy != null && !csvResult ? (
          <ImportProgress busy={csvBusy} progress={csvProgress} />
        ) : null}
        {csvResult ? (
          <ImportResultCard
            result={csvResult}
            successMessage={csvSuccessMessage(csvKind)}
            failureMessage={csvFailure}
          />
        ) : null}
      </div>
    );
  } else if (activeSectionId && isLegacySection(activeSectionId)) {
    drawerBody = (
      <div className="space-y-5">
        <FileDropzone
          file={file}
          accept=".json,application/json"
          hint=".json — array or wrapped under products / suppliers / prices keys"
          disabled={busy != null}
          onSelect={(f) => onFileChange(f)}
          icon={FileJson}
        />
        {importKind === "products" ? (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground">
              Branch for opening stock
            </span>
            <select
              className={dashboardSelectClass(busy != null || branchesLoading)}
              disabled={busy != null || branchesLoading}
              value={branchForStock || branchId || ""}
              onChange={(e) => onBranchForStockChange(e.target.value)}
            >
              <option value="">Use workspace default branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <LegacyHint importKind={importKind} />
          </label>
        ) : (
          <LegacyHint importKind={importKind} />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="shadow-none"
            disabled={!file || busy != null}
            onClick={() => onRunLegacy(true)}
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
            className="shadow-none"
            disabled={!file || busy != null}
            onClick={() => onRunLegacy(false)}
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
        {result ? (
          <ImportResultCard
            result={result}
            successMessage={jsonSuccessMessage(importKind)}
          />
        ) : null}
      </div>
    );
  } else if (activeSectionId === "templates") {
    drawerBody = (
      <div className="space-y-3">
        <p className={dashboardHintClass()}>
          Pre-mapped to the columns we import.
        </p>
        <DownloadRows
          mode="template"
          busyKind={templateBusy}
          error={templateError}
          disabled={templateBusy != null}
          onDownload={onDownloadTemplate}
        />
      </div>
    );
  } else if (activeSectionId === "export") {
    drawerBody = (
      <div className="space-y-3">
        <p className={dashboardHintClass()}>
          Same columns as the templates — edit and re-upload. Extra item columns
          (prices, on-hand, category) are optional on import.
        </p>
        <DownloadRows
          mode="export"
          busyKind={exportBusy}
          error={exportError}
          disabled={exportBusy != null}
          onDownload={onDownloadExport}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Items and suppliers import creates new rows — existing SKUs / supplier
          names will fail validation. Opening stock posts additional quantity
          (it does not replace on-hand). Prefer export for backup and for adding
          only new rows.
        </p>
      </div>
    );
  } else if (activeSectionId === "howto") {
    drawerBody = (
      <div className="space-y-5">
        <ol className="space-y-3.5">
          {[
            [
              "Export or download a template",
              "Start from live data or an empty pre-mapped file.",
            ],
            [
              "Edit in Excel",
              "Keep the header row; save as .csv when done.",
            ],
            [
              "Upload & validate",
              "A dry run checks every row and reports line-level errors.",
            ],
            [
              "Import & track",
              "Rows are committed in the background — watch the progress bar.",
            ],
          ].map(([title, desc], i) => (
            <li key={title} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] text-[11px] font-bold text-foreground">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-foreground">
                  {title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="rounded-none border border-[var(--pos-primary,#0f766e)]/15 bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,white)] p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-none bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]">
              <Info className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Large imports run in the background
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Files with hundreds or thousands of rows are processed as a job
                on our side. You can leave this page while it runs — progress
                updates here every few seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <ImportContextBanner
        csvBusy={csvBusy}
        busy={busy}
        csvResult={csvResult}
        result={result}
        csvFile={csvFile}
        file={file}
      />

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] lg:grid",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]">
          {roster({ fill: true, denser: true })}
        </div>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <p
            className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
            aria-hidden
          >
            Import
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && activeSectionId ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) clearSection();
        }}
        contextLabel="Import"
        title={activeMeta?.label ?? "Section"}
        description={activeMeta?.hint}
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
      >
        {activeSectionId ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-white px-3 py-3 sm:px-4",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            {drawerBody}
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
