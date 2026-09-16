"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardLoading,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
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

import { ImportTheatre } from "./_components/import-theatre";
import {
  CSV_JOB_MAX_POLLS,
  CSV_JOB_POLL_MS,
  csvKindFromSection,
  importKindFromSection,
  type CsvTemplateKind,
  type ImportKind,
  type ImportSectionId,
} from "./_components/import-shared";

export default function BusinessImportPage() {
  const { loading, canManageImports, branches, branchId, branchesLoading } =
    useDashboard();
  const [activeSectionId, setActiveSectionId] =
    useState<ImportSectionId | null>(null);
  const [importKind, setImportKind] = useState<ImportKind>("products");
  const [file, setFile] = useState<File | null>(null);
  const [branchForStock, setBranchForStock] = useState("");
  const [busy, setBusy] = useState<"dry" | "commit" | null>(null);
  const [result, setResult] = useState<JsonImportResponse | null>(null);
  const [templateBusy, setTemplateBusy] = useState<CsvTemplateKind | null>(
    null,
  );
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

  const onActiveSectionChange = useCallback((id: ImportSectionId | null) => {
    setActiveSectionId(id);
    if (!id) return;
    const nextCsv = csvKindFromSection(id);
    if (nextCsv) {
      setCsvKind(nextCsv);
      setCsvResult(null);
      setCsvFailure(null);
    }
    const nextLegacy = importKindFromSection(id);
    if (nextLegacy) {
      setImportKind(nextLegacy);
      setResult(null);
    }
  }, []);

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
            to upload data. Ask an administrator to grant this permission on
            your role.
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
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={FileSpreadsheet}
        eyebrow="Integrations"
        title="Data import"
        description="CSV round-trip and legacy JSON. Validate first, then import with live progress."
      />

      <ImportTheatre
        activeSectionId={activeSectionId}
        onActiveSectionChange={onActiveSectionChange}
        csvKind={csvKind}
        importKind={importKind}
        csvFile={csvFile}
        onCsvFileChange={(f) => {
          setCsvFile(f);
          setCsvResult(null);
          setCsvFailure(null);
        }}
        file={file}
        onFileChange={(f) => {
          setFile(f);
          setResult(null);
        }}
        branchForStock={branchForStock}
        onBranchForStockChange={setBranchForStock}
        branchId={branchId}
        branches={branches}
        branchesLoading={branchesLoading}
        csvBusy={csvBusy}
        busy={busy}
        csvProgress={csvProgress}
        csvResult={csvResult}
        csvFailure={csvFailure}
        result={result}
        onRunCsv={(dryRun) => void runCsv(dryRun)}
        onRunLegacy={(dryRun) => void run(dryRun)}
        templateBusy={templateBusy}
        templateError={templateError}
        onDownloadTemplate={(kind) => void onDownloadTemplate(kind)}
        exportBusy={exportBusy}
        exportError={exportError}
        onDownloadExport={(kind) => void onDownloadExport(kind)}
      />
    </div>
  );
}
