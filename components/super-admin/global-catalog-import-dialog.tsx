"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Info, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  commitSaGlobalCatalogImport,
  exportSaGlobalProductsCsv,
  fetchSaGlobalCatalogImportTemplate,
  previewSaGlobalCatalogImport,
  type SaImportCommitResult,
  type SaImportIssue,
  type SaImportOptions,
  type SaImportPreview,
  type SaImportRowPlan,
} from "@/lib/super-admin-api";

type ParentGroup = {
  label: string;
  state: string | null;
  children: SaImportRowPlan[];
};

/** Groups child rows under their resolved parent for the Relations tree. */
function buildParentGroups(preview: SaImportPreview): ParentGroup[] {
  const byRef = new Map<string, SaImportRowPlan>();
  const byMatchedId = new Map<string, SaImportRowPlan>();
  for (const row of preview.rows) {
    if (row.ref) byRef.set(row.ref, row);
    if (row.matchedProductId) byMatchedId.set(row.matchedProductId, row);
  }
  const groups = new Map<string, ParentGroup>();
  for (const row of preview.rows) {
    if (!row.parent) continue;
    const pid = row.parent.plannedId ?? `key:${row.parent.key}`;
    let group = groups.get(pid);
    if (!group) {
      const parentRow =
        (row.parent.resolution === "in_file" && row.parent.key ? byRef.get(row.parent.key) : undefined) ??
        (row.parent.plannedId ? byMatchedId.get(row.parent.plannedId) : undefined);
      const label =
        parentRow?.name ??
        (row.parent.resolution === "synthetic"
          ? `${row.parent.key} (new parent)`
          : row.parent.key ?? "parent");
      group = { label, state: row.parent.state, children: [] };
      groups.set(pid, group);
    }
    group.children.push(row);
  }
  return [...groups.values()];
}
import { cn } from "@/lib/utils";

/**
 * 3-step CSV import for the global catalog (GLOBAL_CATALOG_IMPORT_SCOPE §7.1, P0):
 * File → Review (the step that did not exist) → Result.
 *
 * UX decisions U1/U3/U7: fixes are contextual (driven by what the preview found, not
 * upfront flags), problems are grouped by issue code with one fix per group, and valid
 * rows can commit while error rows stay quarantined in the downloadable report.
 */

type Step = "file" | "review" | "result";

type IssueGroup = {
  code: string;
  severity: SaImportIssue["severity"];
  message: string;
  lines: number[];
};

const MAX_ROWS_SHOWN = 150;

const STATUS_CHOICES = [
  { value: "draft", label: "Draft (review before shops see them)" },
  { value: "published", label: "Published (visible to shops immediately)" },
];

function groupIssues(preview: SaImportPreview): IssueGroup[] {
  const groups = new Map<string, IssueGroup>();
  const add = (issue: SaImportIssue, line: number) => {
    const key = `${issue.severity}:${issue.code}`;
    const existing = groups.get(key);
    if (existing) {
      existing.lines.push(line);
    } else {
      groups.set(key, {
        code: issue.code,
        severity: issue.severity,
        message: issue.message,
        lines: [line],
      });
    }
  };
  for (const row of preview.rows) {
    for (const issue of row.issues) add(issue, row.line);
  }
  for (const pack of preview.packs ?? []) {
    for (const issue of pack.issues) add(issue, pack.line);
  }
  const order = { error: 0, warning: 1, info: 2 } as const;
  return [...groups.values()].sort(
    (a, b) => order[a.severity] - order[b.severity] || b.lines.length - a.lines.length,
  );
}

function diffSummary(row: SaImportRowPlan): string {
  const parts: string[] = [];
  for (const [field, change] of Object.entries(row.diff ?? {})) {
    const [from, to] = change;
    parts.push(from ? `${field}: ${from} → ${to}` : `${field}: ${to}`);
    if (parts.length >= 4) {
      const remaining = Object.keys(row.diff).length - parts.length;
      if (remaining > 0) parts.push(`+${remaining} more`);
      break;
    }
  }
  return parts.join(" · ");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function buildReportCsv(result: SaImportCommitResult): string {
  const lines = ["line,row_type,action,name,code,severity,message"];
  for (const row of result.rows) {
    if (row.issues.length === 0) {
      lines.push([row.line, row.rowType, row.action, csvEscape(row.name ?? ""), "", "", ""].join(","));
      continue;
    }
    for (const issue of row.issues) {
      lines.push(
        [
          row.line,
          row.rowType,
          row.action,
          csvEscape(row.name ?? ""),
          issue.code,
          issue.severity,
          csvEscape(issue.message),
        ].join(","),
      );
    }
  }
  for (const pack of result.packs ?? []) {
    if (pack.issues.length === 0) {
      lines.push([pack.line, "pack", pack.action, csvEscape(pack.code ?? ""), "", "", ""].join(","));
      continue;
    }
    for (const issue of pack.issues) {
      lines.push(
        [
          pack.line,
          "pack",
          pack.action,
          csvEscape(pack.code ?? ""),
          issue.code,
          issue.severity,
          csvEscape(issue.message),
        ].join(","),
      );
    }
  }
  return "﻿" + lines.join("\r\n");
}

const severityIcon = {
  error: <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />,
  warning: <AlertTriangle className="size-4 shrink-0 text-amber-500" aria-hidden />,
  info: <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden />,
} as const;

function SummaryChip({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" | "bad" }) {
  if (value === 0 && tone !== "ok") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums",
        tone === "bad" && value > 0
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : tone === "warn" && value > 0
            ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "border-border/70 bg-muted/40 text-foreground",
      )}
    >
      {value.toLocaleString()} {label}
    </span>
  );
}

export function GlobalCatalogImportDialog({
  open,
  onOpenChange,
  catalogId,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogId: string;
  onCompleted: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("file");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SaImportPreview | null>(null);
  const [result, setResult] = useState<SaImportCommitResult | null>(null);
  const [options, setOptions] = useState<SaImportOptions>({ defaultStatus: "draft" });
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const reset = useCallback(() => {
    setStep("file");
    setFile(null);
    setPreview(null);
    setResult(null);
    setOptions({ defaultStatus: "draft" });
    setWarningsAcknowledged(false);
    setShowAdvanced(false);
  }, []);

  const close = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      if (!next) reset();
    },
    [onOpenChange, reset],
  );

  const runPreview = useCallback(
    async (chosenFile: File, nextOptions: SaImportOptions) => {
      setBusy(true);
      try {
        const plan = await previewSaGlobalCatalogImport(chosenFile, catalogId, nextOptions);
        setPreview(plan);
        setOptions(nextOptions);
        setWarningsAcknowledged(false);
        setStep("review");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not read the file.");
      } finally {
        setBusy(false);
      }
    },
    [catalogId],
  );

  const onPickFile = useCallback(
    (chosen: File | null) => {
      if (!chosen) return;
      setFile(chosen);
      void runPreview(chosen, options);
    },
    [options, runPreview],
  );

  /** Contextual fix: flips one option and re-plans — never an upfront flag. */
  const applyFix = useCallback(
    (patch: SaImportOptions) => {
      if (!file) return;
      void runPreview(file, { ...options, ...patch });
    },
    [file, options, runPreview],
  );

  const onCommit = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    try {
      const commitResult = await commitSaGlobalCatalogImport(file, catalogId, options);
      setResult(commitResult);
      setStep("result");
      onCompleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }, [catalogId, file, onCompleted, options]);

  const onDownloadTemplate = useCallback(async (mode: "products" | "manifest") => {
    try {
      downloadBlob(
        await fetchSaGlobalCatalogImportTemplate(mode),
        mode === "manifest"
          ? "global-catalog-manifest-template.csv"
          : "global-catalog-import-template.csv",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not download the template.");
    }
  }, []);

  const onDownloadCatalog = useCallback(async () => {
    setBusy(true);
    try {
      const exported = await exportSaGlobalProductsCsv({ catalogId });
      downloadBlob(exported.blob, exported.fileName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }, [catalogId]);

  const issueGroups = useMemo(() => (preview ? groupIssues(preview) : []), [preview]);
  const fileBlocked = useMemo(
    () => (preview?.fileIssues ?? []).some((i) => i.severity === "error"),
    [preview],
  );
  const validRows = preview ? preview.summary.create + preview.summary.update : 0;
  const needsAck = (preview?.summary.warnings ?? 0) > 0 && !warningsAcknowledged;

  const unknownCategoryCount = useMemo(
    () =>
      issueGroups.find((g) => g.code === "category.unknown" && g.severity === "error")?.lines.length ?? 0,
    [issueGroups],
  );
  const staleVersionCount = useMemo(
    () => issueGroups.find((g) => g.code === "product.stale_version")?.lines.length ?? 0,
    [issueGroups],
  );
  const archivedConflictCount = useMemo(
    () => issueGroups.find((g) => g.code === "product.archived_conflict")?.lines.length ?? 0,
    [issueGroups],
  );
  const draftParentCount = useMemo(
    () =>
      issueGroups.find((g) => g.code === "relation.parent_not_published" && g.severity === "error")
        ?.lines.length ?? 0,
    [issueGroups],
  );

  const changedRows = useMemo(
    () => (preview?.rows ?? []).filter((r) => r.action === "create" || r.action === "update"),
    [preview],
  );
  const parentGroups = useMemo(() => (preview ? buildParentGroups(preview) : []), [preview]);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[88vh] w-full max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle>
            {step === "file" && "Import products"}
            {step === "review" && "Review before importing"}
            {step === "result" && "Import finished"}
          </DialogTitle>
          <DialogDescription>
            {step === "file" &&
              "Nothing is written until you have reviewed the plan on the next step."}
            {step === "review" && preview && (
              <>
                <span className="font-medium text-foreground">{preview.fileName}</span> ·{" "}
                {preview.rows.length.toLocaleString()} rows · nothing written yet
              </>
            )}
            {step === "result" && result && (
              <>
                <span className="font-medium text-foreground">{result.fileName}</span> — done.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {step === "file" && (
            <div className="space-y-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed",
                  "border-border/70 bg-muted/20 px-6 py-10 text-center transition hover:border-primary/50 hover:bg-muted/40",
                )}
              >
                {busy ? (
                  <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden />
                ) : (
                  <Upload className="size-7 text-muted-foreground" aria-hidden />
                )}
                <span className="text-sm font-medium">
                  {busy ? "Reading file…" : "Choose a CSV or Excel file"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Palmart item exports are understood — prices, categories and parent SKUs map
                  automatically. Excel (.xlsx) keeps barcodes intact.
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const chosen = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  onPickFile(chosen);
                }}
              />
              <div className="grid gap-2 sm:grid-cols-3">
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void onDownloadCatalog()}>
                  <FileSpreadsheet className="size-4" aria-hidden />
                  Download catalog to edit
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void onDownloadTemplate("products")}>
                  <Download className="size-4" aria-hidden />
                  Products template
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void onDownloadTemplate("manifest")}>
                  <Download className="size-4" aria-hidden />
                  Manifest template
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The safest loop is: download the catalog, edit it in Excel, re-import it here. A
                column you delete keeps its stored values; a cell you blank clears that field. The
                manifest template shows how to import parents, tray/crate variants and starter
                packs in one file — or use an Excel workbook with sheets named{" "}
                <span className="font-medium">products</span>, <span className="font-medium">packs</span>{" "}
                and <span className="font-medium">pack_items</span>.
              </p>
            </div>
          )}

          {step === "review" && preview && (
            <div className="space-y-4">
              {/* Summary chips */}
              <div className="flex flex-wrap gap-1.5">
                <SummaryChip label="new" value={preview.summary.create} tone="ok" />
                <SummaryChip label="updated" value={preview.summary.update} tone="ok" />
                <SummaryChip label="unchanged" value={preview.summary.unchanged} />
                <SummaryChip label="skipped" value={preview.summary.skipped} />
                <SummaryChip label="errors" value={preview.summary.errors} tone="bad" />
                <SummaryChip label="blocked" value={preview.summary.blocked} tone="bad" />
                <SummaryChip label="warnings" value={preview.summary.warnings} tone="warn" />
                <SummaryChip label="parent links" value={preview.summary.parentLinks} />
                <SummaryChip label="new parents" value={preview.summary.syntheticParents} />
                <SummaryChip label="pack members" value={preview.summary.packMemberships} />
                <SummaryChip label="will publish" value={preview.summary.willPublish} />
                <SummaryChip label="stay draft" value={preview.summary.willStayDraft} />
              </div>

              {/* File-level issues (blocking or informative) */}
              {preview.fileIssues.length > 0 && (
                <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 p-3">
                  {preview.fileIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      {severityIcon[issue.severity]}
                      <span className={cn(issue.severity === "error" && "font-medium text-destructive")}>
                        {issue.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Column mapping */}
              {(preview.columns.aliased.length > 0 || preview.columns.ignored.length > 0 || preview.columns.unknown.length > 0) && (
                <p className="text-xs text-muted-foreground">
                  {preview.columns.aliased.length > 0 && (
                    <>Mapped columns: {preview.columns.aliased.join(", ")}. </>
                  )}
                  {preview.columns.ignored.length > 0 && (
                    <>Ignored: {preview.columns.ignored.join(", ")}. </>
                  )}
                  {preview.columns.unknown.length > 0 && (
                    <>Unknown (ignored): {preview.columns.unknown.join(", ")}.</>
                  )}
                </p>
              )}

              {/* Grouped problems with contextual fixes (U1/U7) */}
              {issueGroups.length > 0 && !fileBlocked && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Problems
                  </h4>
                  {unknownCategoryCount > 0 && !options.createCategories && (
                    <Button type="button" size="sm" variant="secondary" disabled={busy}
                      onClick={() => applyFix({ createCategories: true })}>
                      Create the missing categories ({unknownCategoryCount} rows)
                    </Button>
                  )}
                  {staleVersionCount > 0 && !options.force && (
                    <Button type="button" size="sm" variant="secondary" disabled={busy}
                      onClick={() => applyFix({ force: true })}>
                      Overwrite {staleVersionCount} rows edited since this export
                    </Button>
                  )}
                  {archivedConflictCount > 0 && options.reviveArchived === false && (
                    <Button type="button" size="sm" variant="secondary" disabled={busy}
                      onClick={() => applyFix({ reviveArchived: true })}>
                      Revive {archivedConflictCount} archived matches
                    </Button>
                  )}
                  {draftParentCount > 0 && !options.allowDraftParent && (
                    <Button type="button" size="sm" variant="secondary" disabled={busy}
                      onClick={() => applyFix({ allowDraftParent: true })}>
                      Allow {draftParentCount} published rows under draft parents
                    </Button>
                  )}
                  <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border/60 p-3">
                    {issueGroups.map((group, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        {severityIcon[group.severity]}
                        <span className="min-w-0">
                          <span className="font-medium tabular-nums">{group.lines.length}×</span>{" "}
                          {group.message}
                          <span className="text-muted-foreground">
                            {" "}
                            (line{group.lines.length === 1 ? "" : "s"}{" "}
                            {group.lines.slice(0, 12).join(", ")}
                            {group.lines.length > 12 ? "…" : ""})
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Relations tree (manifest / parents mode) */}
              {parentGroups.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Parent → variants
                  </h4>
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/60 p-3">
                    {parentGroups.map((group, i) => (
                      <div key={i} className="text-xs">
                        <div className="flex items-center gap-1.5 font-medium">
                          {group.label}
                          {group.state && group.state !== "exists" && group.state !== "published" && (
                            <Badge variant="outline" className="text-[10px]">
                              {group.state.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                        {group.children.map((child) => (
                          <div
                            key={child.line}
                            className={cn(
                              "flex items-center gap-1.5 pl-4 text-muted-foreground",
                              (child.action === "error" || child.action === "blocked") && "text-destructive",
                            )}
                          >
                            <span aria-hidden>└</span>
                            <span className="truncate">{child.name}</span>
                            {child.action === "blocked" && (
                              <Badge variant="outline" className="text-[10px] text-destructive">
                                blocked
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Packs */}
              {(preview.packs?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Packs
                  </h4>
                  <div className="space-y-1.5 rounded-lg border border-border/60 p-3">
                    {preview.packs.map((pack) => (
                      <div key={pack.line} className="text-xs">
                        <span className="font-medium">{pack.name ?? pack.code}</span>{" "}
                        <span className="text-muted-foreground">
                          · {pack.action === "create" ? "new pack" : pack.action} ·{" "}
                          {pack.memberCount} member{pack.memberCount === 1 ? "" : "s"}
                          {pack.replace ? " · replaces current members" : " · adds to current members"}
                        </span>
                        {pack.issues.map((issue, i) => (
                          <span key={i} className="flex items-start gap-1.5 pl-4">
                            {severityIcon[issue.severity]}
                            <span className="text-muted-foreground">{issue.message}</span>
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Changes table */}
              {changedRows.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    What will change
                  </h4>
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-border/60">
                    <table className="w-full text-xs">
                      <tbody>
                        {changedRows.slice(0, MAX_ROWS_SHOWN).map((row) => (
                          <tr key={row.line} className="border-b border-border/40 last:border-0">
                            <td className="px-2 py-1.5 text-muted-foreground tabular-nums">{row.line}</td>
                            <td className="px-2 py-1.5">
                              <Badge variant="outline" className="text-[10px]">
                                {row.action === "create" ? "new" : row.revived ? "revive" : "update"}
                              </Badge>
                            </td>
                            <td className="max-w-[180px] truncate px-2 py-1.5 font-medium">{row.name}</td>
                            <td className="max-w-[260px] truncate px-2 py-1.5 text-muted-foreground">
                              {diffSummary(row)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {changedRows.length > MAX_ROWS_SHOWN && (
                      <p className="px-2 py-1.5 text-center text-[11px] text-muted-foreground">
                        …and {(changedRows.length - MAX_ROWS_SHOWN).toLocaleString()} more rows
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Two visible options; the rest behind Advanced (U1) */}
              <div className="space-y-3 rounded-lg border border-border/60 p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="gc-import-status">Rows without a status become</Label>
                  <select
                    id="gc-import-status"
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    value={options.defaultStatus ?? "draft"}
                    disabled={busy}
                    onChange={(e) => applyFix({ defaultStatus: e.target.value })}
                  >
                    {STATUS_CHOICES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? "Hide advanced options" : "Advanced options"}
                </button>
                {showAdvanced && (
                  <div className="space-y-2.5 text-sm">
                    <label className="flex items-center justify-between gap-3">
                      <span>Create unknown categories automatically</span>
                      <Switch
                        checked={Boolean(options.createCategories)}
                        disabled={busy}
                        onCheckedChange={(v) => applyFix({ createCategories: v })}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span>Revive archived products that match a barcode</span>
                      <Switch
                        checked={options.reviveArchived !== false}
                        disabled={busy}
                        onCheckedChange={(v) => applyFix({ reviveArchived: v })}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span>Overwrite rows edited since the file was exported</span>
                      <Switch
                        checked={Boolean(options.force)}
                        disabled={busy}
                        onCheckedChange={(v) => applyFix({ force: v })}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span>Allow published variants under draft parents</span>
                      <Switch
                        checked={Boolean(options.allowDraftParent)}
                        disabled={busy}
                        onCheckedChange={(v) => applyFix({ allowDraftParent: v })}
                      />
                    </label>
                  </div>
                )}
              </div>

              {preview.summary.warnings > 0 && (
                <label className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={warningsAcknowledged}
                    onChange={(e) => setWarningsAcknowledged(e.target.checked)}
                  />
                  <span>
                    I have reviewed the {preview.summary.warnings} warning
                    {preview.summary.warnings === 1 ? "" : "s"} above.
                  </span>
                </label>
              )}
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden />
                <div className="space-y-1 text-sm">
                  <p className="font-medium">
                    {result.summary.create.toLocaleString()} created ·{" "}
                    {result.summary.update.toLocaleString()} updated ·{" "}
                    {result.summary.unchanged.toLocaleString()} unchanged
                    {result.summary.errors > 0 && (
                      <span className="text-destructive">
                        {" "}
                        · {result.summary.errors.toLocaleString()} failed
                      </span>
                    )}
                    {result.summary.blocked > 0 && (
                      <span className="text-destructive">
                        {" "}
                        · {result.summary.blocked.toLocaleString()} blocked
                      </span>
                    )}
                  </p>
                  {(result.summary.parentLinks > 0 || (result.packs?.length ?? 0) > 0) && (
                    <p className="text-xs text-muted-foreground">
                      {result.summary.parentLinks > 0 &&
                        `${result.summary.parentLinks.toLocaleString()} parent links`}
                      {result.summary.parentLinks > 0 && (result.packs?.length ?? 0) > 0 && " · "}
                      {(result.packs?.length ?? 0) > 0 &&
                        `${result.packs.length} pack${result.packs.length === 1 ? "" : "s"} (${result.packs
                          .reduce((n, p) => n + p.membersAdded, 0)
                          .toLocaleString()} members added)`}
                    </p>
                  )}
                  {result.summary.willStayDraft > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {result.summary.willStayDraft.toLocaleString()} rows are drafts — shops cannot
                      see them until you publish (Products → Publish all drafts).
                    </p>
                  )}
                </div>
              </div>

              {result.rows.some((r) => r.action === "error" || r.action === "blocked") && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    Failed rows
                  </h4>
                  <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-destructive/40 p-3">
                    {result.rows
                      .filter((r) => r.action === "error" || r.action === "blocked")
                      .map((row) => (
                        <div key={row.line} className="text-xs">
                          <span className="font-medium tabular-nums">Line {row.line}</span>
                          {row.name ? <span className="font-medium"> · {row.name}</span> : null}
                          {row.issues.map((issue, i) => (
                            <span key={i} className="block pl-4 text-muted-foreground">
                              {issue.message}{" "}
                              <span className="text-[10px] opacity-70">({issue.code})</span>
                            </span>
                          ))}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadBlob(
                    new Blob([buildReportCsv(result)], { type: "text/csv;charset=utf-8" }),
                    `import-report-${result.fileName.replace(/\.csv$/i, "")}.csv`,
                  )
                }
              >
                <Download className="size-4" aria-hidden />
                Download full report
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3">
          {step === "review" ? (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={reset}>
              Choose another file
            </Button>
          ) : step === "result" ? (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Import another file
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => close(false)}>
              {step === "result" ? "Done" : "Cancel"}
            </Button>
            {step === "review" && (
              <Button
                type="button"
                size="sm"
                disabled={busy || fileBlocked || validRows === 0 || needsAck}
                onClick={() => void onCommit()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="size-4" aria-hidden />
                )}
                {preview && preview.summary.errors > 0
                  ? `Import ${validRows.toLocaleString()} valid rows`
                  : `Import ${validRows.toLocaleString()} rows`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
