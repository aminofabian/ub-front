"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Download, Eye, Loader2, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchDesktopLogContent,
  fetchDesktopLogUploads,
  type DesktopLogUploadRow,
} from "@/lib/super-admin-api";

/**
 * Super Admin → Platform → Logs — bundles shipped from Kiosk Desktop installs
 * when they happen to be online. Each row is a gzip of the install's log tails
 * (kiosk.log, backend.out.log, backend.err.log, mariadb.log).
 */
export function DesktopInstallLogsPanel() {
  const [rows, setRows] = useState<DesktopLogUploadRow[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<DesktopLogUploadRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDesktopLogUploads({
        installId: filter.trim() || undefined,
        limit: 50,
      });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load desktop log bundles.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Desktop install logs
          </h2>
          <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Log bundles shipped from Kiosk Desktop tills when online — install
            failures, boot crashes, and backend errors, straight from the
            machine&apos;s data folder.
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by install id"
                className="h-8 w-52 pl-8"
                aria-label="Filter by install id"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-8">
              Filter
            </Button>
          </form>
          <Button size="sm" variant="outline" className="h-8" onClick={() => void load()} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-5">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No desktop log bundles yet. Installs ship logs here when they have
            internet and the ingest key is configured.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
                  <th scope="col" className="px-2 py-2 font-medium">Uploaded</th>
                  <th scope="col" className="px-2 py-2 font-medium">Install id</th>
                  <th scope="col" className="px-2 py-2 font-medium">Version</th>
                  <th scope="col" className="px-2 py-2 font-medium">Size</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-2 py-2.5 text-muted-foreground">
                      {formatTime(row.uploadedAt)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs">{row.installId}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">{row.appVersion ?? "—"}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">{formatBytes(row.sizeBytes)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setViewing(row)}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        View
                      </Button>
                      <DownloadButton row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing ? (
        <LogViewerDialog row={viewing} onClose={() => setViewing(null)} />
      ) : null}
    </section>
  );
}

function DownloadButton({ row }: { row: DesktopLogUploadRow }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const blob = await fetchDesktopLogContent(row.id);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = row.filename || "kiosk-logs.gz";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 30_000);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Download className="h-3.5 w-3.5" aria-hidden />
      )}
      Download
    </Button>
  );
}

function LogViewerDialog({
  row,
  onClose,
}: {
  row: DesktopLogUploadRow;
  onClose: () => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState("");
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const blob = await fetchDesktopLogContent(row.id);
        if (cancelled) return;
        if (typeof DecompressionStream === "undefined") {
          setText("(this browser can't decompress gzip — use Download instead)");
          return;
        }
        const decompressed = new Response(
          blob.stream().pipeThrough(new DecompressionStream("gzip")),
        );
        setText(await decompressed.text());
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to read the log bundle.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    preRef.current?.scrollTo({ top: preRef.current.scrollHeight });
  }, [text]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Logs from install ${row.installId}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              Logs from {row.installId}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTime(row.uploadedAt)} · {row.appVersion ?? "unknown version"} ·{" "}
              {formatBytes(row.sizeBytes)}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-black/90">
          {error ? (
            <p className="p-4 text-sm text-destructive">{error}</p>
          ) : text === null ? (
            <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Decompressing…
            </p>
          ) : (
            <pre
              ref={preRef}
              className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-emerald-100/90"
            >
              {text}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
