"use client";

import { useCallback, useState } from "react";
import { CircleDollarSign, FileJson, Loader2, Tag, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DashboardAccessDenied,
  DashboardLoading,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  postLegacyBuyingPriceJsonImport,
  postLegacyProductJsonImport,
  postLegacySellingPriceJsonImport,
  postLegacySupplierJsonImport,
  type JsonImportResponse,
} from "@/lib/api";
import { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type ImportKind = "products" | "suppliers" | "buying_prices" | "selling_prices";

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

  const effectiveBranch = branchForStock.trim() || branchId;

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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <DashboardPageHero
        icon={kindIcon(importKind)}
        eyebrow="Integrations"
        title="Import legacy data (JSON)"
        description="Upload catalog, supplier, or price exports. Products support an array or products / items; suppliers use suppliers / vendors; buying prices use buying_prices / costs; selling prices use selling_prices / sell_prices. CSV templates for items, suppliers, and opening stock are available from GET /api/v1/integrations/imports/templates/…"
      />

      <div className="flex flex-wrap gap-2 rounded-xl border border-border/70 bg-muted/30 p-1.5">
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
            className={cn("flex-1 sm:flex-initial", importKind !== key && "text-muted-foreground")}
            onClick={() => {
              setImportKind(key);
              setResult(null);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="space-y-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          JSON file
          <input
            type="file"
            accept=".json,application/json"
            className="max-w-full text-sm file:mr-3 file:rounded file:border file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
            disabled={busy != null}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
          />
        </label>

        {importKind === "products" ? (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Branch for opening stock
            <select
              className={cn(
                "rounded-lg border border-input bg-background px-3 py-2 text-sm",
                branchesLoading && "opacity-60",
              )}
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
            <span className="text-xs font-normal text-muted-foreground">
              Required when any row has <code className="rounded bg-muted px-1">current_stock</code> &gt; 0. Unit cost
              for opening balance defaults to 1% of sell price (minimum 0.01).
            </span>
          </label>
        ) : importKind === "suppliers" ? (
          <p className="text-xs text-muted-foreground">
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
          <p className="text-xs text-muted-foreground">
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
          <p className="text-xs text-muted-foreground">
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

      {result ? (
        <div
          className={cn(
            "rounded-xl border p-4 text-sm",
            result.errors.length > 0
              ? "border-destructive/40 bg-destructive/5"
              : "border-emerald-500/35 bg-emerald-500/[0.06]",
          )}
        >
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
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {importKind === "products"
                ? "No blocking issues reported. Products should appear under Catalog; refresh the Products page if it was already open."
                : importKind === "suppliers"
                  ? "No blocking issues reported. Suppliers should appear under Suppliers; refresh that page if it was already open."
                  : importKind === "buying_prices"
                    ? "No blocking issues reported. Buying costs are stored for the item + supplier; refresh pricing views as needed."
                    : "No blocking issues reported. Selling prices are applied from the effective date; refresh catalog or POS as needed."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
