"use client";

import { Loader2, Pencil } from "lucide-react";

import {
  FormDrawer,
  FormDrawerMessageBanner,
} from "@/components/form-drawer";
import { dashboardInputClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import type { AisleRecord } from "@/lib/api";

export function AisleEditDrawer({
  aisle,
  open,
  onOpenChange,
  name,
  code,
  onNameChange,
  onCodeChange,
  busy,
  error,
  onSubmit,
}: {
  aisle: AisleRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  code: string;
  onNameChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  busy: boolean;
  error?: string | null;
  onSubmit: () => void;
}) {
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      contextLabel={aisle.code}
      title="Edit shelf zone"
      description={`${aisle.productCount.toLocaleString()} products currently tagged here.`}
      icon={<Pencil className="size-4" aria-hidden />}
      width="default"
      appearance="sharp"
      banner={error ? <FormDrawerMessageBanner text={error} /> : undefined}
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
            Save changes
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
            onChange={(e) => onNameChange(e.target.value)}
            disabled={busy}
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
            disabled={busy}
          />
        </label>
      </form>
    </FormDrawer>
  );
}
