"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { toast } from "sonner";

import {
  downloadReport,
  type ReportExportFormat,
  type ReportExportInput,
  type ReportKey,
} from "@/lib/api";
import { downloadBlob } from "@/lib/sales-activity-pdf";
import { cn } from "@/lib/utils";
import {
  reportBtn,
  reportFaint,
  reportMenuItem,
  reportMono,
  reportOverlay,
} from "./report-ui";

const FORMATS: { id: ReportExportFormat; label: string; note?: string }[] = [
  { id: "pdf", label: "PDF", note: "styled" },
  { id: "xlsx", label: "Excel" },
  { id: "csv", label: "CSV" },
];

/** A "Download" control that opens a format menu (PDF / Excel / CSV) and streams the file. */
export function ReportDownloadButton({
  reportKey,
  input,
  disabled,
  className,
}: {
  reportKey: ReportKey;
  input: () => Omit<ReportExportInput, "format"> | null;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ReportExportFormat | null>(null);

  const run = async (format: ReportExportFormat) => {
    setOpen(false);
    const current = input();
    if (!current) {
      toast.error("Choose a period first.");
      return;
    }
    setBusy(format);
    try {
      const { blob, filename } = await downloadReport(reportKey, {
        ...current,
        format,
      });
      downloadBlob(blob, filename);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not download the report.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || busy !== null}
        className={reportBtn}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download
          className={cn("size-3.5", busy !== null && "animate-pulse")}
          aria-hidden
        />
        {busy !== null ? "Preparing" : "Download"}
        <ChevronDown className="size-3 opacity-60" aria-hidden />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div
            className={cn("absolute right-0 z-30 mt-1 w-40 p-1", reportOverlay)}
            role="menu"
          >
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="menuitem"
                onClick={() => void run(f.id)}
                className={reportMenuItem}
              >
                <span>{f.label}</span>
                {f.note ? (
                  <span className={cn("text-[10px]", reportMono, reportFaint)}>
                    {f.note}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
