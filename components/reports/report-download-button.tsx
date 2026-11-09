"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import {
  downloadReport,
  type ReportExportFormat,
  type ReportExportInput,
  type ReportKey,
} from "@/lib/api";
import { downloadBlob } from "@/lib/sales-activity-pdf";
import { cn } from "@/lib/utils";

/**
 * Format picker + download for any server-generated report. `input` is read
 * lazily on click so the current filters are used. The generated file reconciles
 * with the screen only where the screen is backed by the same report query, so
 * place this on pages whose data matches the chosen reportKey.
 */
export function ReportDownloadButton({
  reportKey,
  input,
  disabled,
  label = "Download",
  className,
}: {
  reportKey: ReportKey;
  input: () => Omit<ReportExportInput, "format"> | null;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const [format, setFormat] = useState<ReportExportFormat>("xlsx");
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    const current = input();
    if (!current) {
      toast.error("Choose a period to download.");
      return;
    }
    setBusy(true);
    try {
      const { blob, filename } = await downloadReport(reportKey, {
        ...current,
        format,
      });
      downloadBlob(blob, filename);
      toast.success("Report downloaded.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not download the report.",
      );
    } finally {
      setBusy(false);
    }
  };

  const control =
    "h-9 rounded-xl border bg-white px-2.5 text-[12px] font-semibold disabled:opacity-40";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <label className="sr-only" htmlFor={`report-format-${reportKey}`}>
        Download format
      </label>
      <select
        id={`report-format-${reportKey}`}
        value={format}
        onChange={(e) => setFormat(e.target.value as ReportExportFormat)}
        disabled={busy || disabled}
        className={cn(control, "cursor-pointer px-2")}
      >
        <option value="xlsx">Excel</option>
        <option value="csv">CSV</option>
        <option value="pdf">PDF</option>
      </select>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={busy || disabled}
        className={cn(control, "inline-flex items-center gap-1")}
      >
        <Download
          className={cn("size-3.5", busy && "animate-pulse")}
          aria-hidden
        />
        {busy ? "Preparing…" : label}
      </button>
    </div>
  );
}
