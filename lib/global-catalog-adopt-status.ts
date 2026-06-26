export type AdoptStatusTone = "ready" | "skip" | "warn" | "error" | "unknown";

export function adoptStatusPresentation(status: string): {
  label: string;
  tone: AdoptStatusTone;
} {
  switch (status) {
    case "ready":
      return { label: "Ready to import", tone: "ready" };
    case "imported":
      return { label: "Imported", tone: "ready" };
    case "skip_already_imported":
      return { label: "Already in catalog", tone: "skip" };
    case "skip_sku_conflict":
      return { label: "SKU already in use", tone: "skip" };
    case "skip_barcode_conflict":
      return { label: "Barcode already in use", tone: "skip" };
    case "warn_missing_category":
      return { label: "No category mapped", tone: "warn" };
    case "warn_missing_supplier":
      return { label: "No supplier mapped", tone: "warn" };
    case "error_not_found":
      return { label: "Not found", tone: "error" };
    case "error_invalid_price":
      return { label: "Invalid price", tone: "error" };
    default:
      if (status.startsWith("error")) {
        return { label: status.replace(/^error_/, "").replace(/_/g, " "), tone: "error" };
      }
      if (status.startsWith("skip")) {
        return { label: status.replace(/^skip_/, "").replace(/_/g, " "), tone: "skip" };
      }
      if (status.startsWith("warn")) {
        return { label: status.replace(/^warn_/, "").replace(/_/g, " "), tone: "warn" };
      }
      return { label: status.replace(/_/g, " "), tone: "unknown" };
  }
}

export function adoptStatusClassName(tone: AdoptStatusTone): string {
  switch (tone) {
    case "ready":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
    case "skip":
      return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100";
    case "warn":
      return "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100";
    case "error":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}
