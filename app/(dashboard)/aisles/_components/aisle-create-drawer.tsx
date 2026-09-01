"use client";

import { Loader2, MapPin } from "lucide-react";

import { FormDrawer } from "@/components/form-drawer";
import { dashboardInputClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { labelToAisleCode } from "@/lib/aisle-suggestions";

export function AisleCreateDrawer({
  open,
  onOpenChange,
  name,
  code,
  onNameChange,
  onCodeChange,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  code: string;
  onNameChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      contextLabel="Shelf zones"
      title="New walk stop"
      description="A shelf zone is where feet go — not what the product is (category) or how you run the shop (department)."
      icon={<MapPin className="size-4" aria-hidden />}
      width="default"
      appearance="sharp"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={onSubmit}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Create zone
          </Button>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Display name
          </span>
          <input
            className={dashboardInputClass()}
            value={name}
            onChange={(e) => {
              onNameChange(e.target.value);
              if (!code.trim()) onCodeChange(labelToAisleCode(e.target.value));
            }}
            placeholder="Front · Beverages"
            autoFocus
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Short code
          </span>
          <input
            className={dashboardInputClass()}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="a1-beverages"
          />
          <p className="text-[11px] text-muted-foreground">
            Shown on product badges and pick lists. Keep it short.
          </p>
        </label>
      </form>
    </FormDrawer>
  );
}
