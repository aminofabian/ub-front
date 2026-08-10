"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  updateBusiness,
  type LandingContentRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const MILK_RUN_THEME_ID = "milk-run" as const;

export function hasUsableWhatsApp(
  value: string | null | undefined,
): boolean {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 9;
}

export function milkRunNeedsWhatsApp(
  themeId: string | null | undefined,
  whatsapp: string | null | undefined,
): boolean {
  return themeId === MILK_RUN_THEME_ID && !hasUsableWhatsApp(whatsapp);
}

type MilkRunWhatsAppDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill from existing landing content. */
  initialWhatsapp?: string | null;
  /** Merge into storefront.landingContent on save (full replace on API). */
  existingLandingContent?: LandingContentRecord | null;
  /**
   * Called after a successful API save, or with the typed value when
   * `persist` is false.
   */
  onSaved?: (whatsapp: string) => void;
  /**
   * When false, only validates + calls onSaved (parent persists).
   * Default true — PATCHes landingContent.whatsapp immediately.
   */
  persist?: boolean;
};

export function MilkRunWhatsAppDialog({
  open,
  onOpenChange,
  initialWhatsapp,
  existingLandingContent,
  onSaved,
  persist = true,
}: MilkRunWhatsAppDialogProps) {
  const [value, setValue] = useState(initialWhatsapp?.trim() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialWhatsapp?.trim() ?? "");
      setError(null);
      setSaving(false);
    }
  }, [open, initialWhatsapp]);

  const save = async () => {
    const trimmed = value.trim();
    if (!hasUsableWhatsApp(trimmed)) {
      setError("Enter a WhatsApp number with country code, e.g. 2547…");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (persist) {
        const existing = existingLandingContent ?? {};
        await updateBusiness({
          storefront: {
            landingContent: {
              headline: existing.headline ?? null,
              subheadline: existing.subheadline ?? null,
              phone: existing.phone ?? null,
              hours: existing.hours ?? null,
              address: existing.address ?? null,
              ctaLabel: existing.ctaLabel ?? null,
              whatsapp: trimmed,
            },
          },
        });
      }
      onSaved?.(trimmed);
      onOpenChange(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save WhatsApp number.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!saving}>
        <DialogHeader>
          <DialogTitle>Add your WhatsApp number</DialogTitle>
          <DialogDescription>
            Milk Run shows a chat button so customers can reach you. Add the
            number you use for orders — with country code, no plus sign needed.
          </DialogDescription>
        </DialogHeader>
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            WhatsApp
          </span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            autoFocus
            disabled={saving}
            placeholder="254712345678"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void save();
              }
            }}
            className={cn(
              "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm",
              "placeholder:text-muted-foreground/70",
              "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30",
            )}
          />
        </label>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Example: 2547XXXXXXXX for Kenya. You can change this later in
            business settings.
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Maybe later
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save number"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
