"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { dashboardHintClass, dashboardInputClass, dashboardLabelClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { serviceApiMessage, setServiceOptions, type ServiceRecord } from "@/lib/service-business-api";
import {
  MAX_OPTION_GROUPS,
  MAX_OPTION_NAME,
  MAX_OPTIONS_PER_GROUP,
  draftsToPayload,
  groupsToDrafts,
  type GroupDraft,
  type OptionDraft,
} from "@/lib/service-options";
import { cn } from "@/lib/utils";

const EMPTY_OPTION: OptionDraft = { name: "", price: "", minutes: "" };

/**
 * What a customer can choose on a service: a pick-one group such as hair length, or extras.
 * Each choice can add to the price and to the time, so a booking is as long as what was chosen.
 */
export function ServiceOptionsDialog({
  service,
  onClose,
  onSaved,
}: {
  service: ServiceRecord;
  onClose: () => void;
  onSaved: (service: ServiceRecord) => void;
}) {
  const [groups, setGroups] = useState<GroupDraft[]>(() => groupsToDrafts(service.options ?? []));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function patchGroup(index: number, patch: Partial<GroupDraft>) {
    setError(null);
    setGroups((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  function patchOption(groupIndex: number, optionIndex: number, patch: Partial<OptionDraft>) {
    setError(null);
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex ? { ...g, options: g.options.map((o, j) => (j === optionIndex ? { ...o, ...patch } : o)) } : g,
      ),
    );
  }

  function addGroup(multiple: boolean) {
    setError(null);
    setGroups((prev) => [
      ...prev,
      { name: "", required: !multiple, multiple, options: [{ ...EMPTY_OPTION }, ...(multiple ? [] : [{ ...EMPTY_OPTION }])] },
    ]);
  }

  async function save() {
    const out = draftsToPayload(groups);
    if ("error" in out) return setError(out.error);
    setError(null);
    setSaving(true);
    try {
      onSaved(await setServiceOptions(service.id, out.groups));
    } catch (err) {
      setError(serviceApiMessage(err, "Could not save. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Options for {service.name}</DialogTitle>
          <DialogDescription>
            What the customer can choose. A choice can add to the price and to the time the service takes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {groups.length === 0 ? (
            <p className={dashboardHintClass()}>
              No options yet. {service.name} is sold as it is.
            </p>
          ) : null}

          {groups.map((group, gi) => (
            <fieldset key={group.id ?? `new-${gi}`} className="grid gap-2 rounded-[2px] border border-[var(--op-rule)] p-3">
              <legend className="sr-only">{group.name || (group.multiple ? "Extras" : "Pick-one group")}</legend>
              <div className="flex items-end gap-2">
                <label className="grid min-w-0 flex-1 gap-1">
                  <span className={dashboardLabelClass()}>{group.multiple ? "Extras called" : "Customer picks one"}</span>
                  <input
                    className={dashboardInputClass(false)}
                    placeholder={group.multiple ? "Extras" : "Hair length"}
                    maxLength={MAX_OPTION_NAME}
                    value={group.name}
                    onChange={(e) => patchGroup(gi, { name: e.target.value })}
                  />
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${group.name || "this group"}`}
                  onClick={() => {
                    setError(null);
                    setGroups((prev) => prev.filter((_, i) => i !== gi));
                  }}
                >
                  Remove
                </Button>
              </div>

              <ul className="grid gap-1.5">
                <li className="grid grid-cols-[minmax(0,1fr)_4.25rem_3.5rem_2rem] sm:grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_2rem] gap-1.5" aria-hidden>
                  <span className={dashboardLabelClass()}>Choice</span>
                  <span className={cn(dashboardLabelClass(), "text-right")}>Adds Ksh</span>
                  <span className={cn(dashboardLabelClass(), "text-right")}>Adds min</span>
                  <span />
                </li>
                {group.options.map((option, oi) => (
                  <li
                    key={option.id ?? `new-${oi}`}
                    className="grid grid-cols-[minmax(0,1fr)_4.25rem_3.5rem_2rem] sm:grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_2rem] items-center gap-1.5"
                  >
                    <input
                      className={dashboardInputClass(false)}
                      placeholder={group.multiple ? "Extra packs" : oi === 0 ? "Short" : "Long"}
                      aria-label={`Choice ${oi + 1} under ${group.name || "this group"}`}
                      maxLength={MAX_OPTION_NAME}
                      value={option.name}
                      onChange={(e) => patchOption(gi, oi, { name: e.target.value })}
                    />
                    <input
                      className={dashboardInputClass(false, "text-right font-mono")}
                      inputMode="decimal"
                      placeholder="0"
                      aria-label={`What ${option.name || "this choice"} adds to the price, in shillings`}
                      value={option.price}
                      onChange={(e) => patchOption(gi, oi, { price: e.target.value.replace(/[^0-9.]/g, "") })}
                    />
                    <input
                      className={dashboardInputClass(false, "text-right font-mono")}
                      inputMode="numeric"
                      placeholder="0"
                      aria-label={`Minutes ${option.name || "this choice"} adds`}
                      value={option.minutes}
                      onChange={(e) => patchOption(gi, oi, { minutes: e.target.value.replace(/[^0-9]/g, "") })}
                    />
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-[2px] text-[var(--op-muted)] hover:text-[var(--op-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent)] disabled:opacity-40"
                      disabled={group.options.length === 1}
                      aria-label={`Remove ${option.name || `choice ${oi + 1}`}`}
                      onClick={() => patchGroup(gi, { options: group.options.filter((_, j) => j !== oi) })}
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={group.options.length >= MAX_OPTIONS_PER_GROUP}
                  onClick={() => patchGroup(gi, { options: [...group.options, { ...EMPTY_OPTION }] })}
                >
                  <Plus className="size-4" aria-hidden /> Another choice
                </Button>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={group.required}
                    onChange={(e) => patchGroup(gi, { required: e.target.checked })}
                  />
                  Must be chosen before payment
                </label>
              </div>
            </fieldset>
          ))}

          {groups.length < MAX_OPTION_GROUPS ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => addGroup(false)}>
                <Plus className="size-4" aria-hidden /> Pick one (length, style)
              </Button>
              <Button variant="outline" size="sm" onClick={() => addGroup(true)}>
                <Plus className="size-4" aria-hidden /> Extras (pick any)
              </Button>
            </div>
          ) : (
            <p className={dashboardHintClass()}>A service can have up to {MAX_OPTION_GROUPS} groups.</p>
          )}

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
