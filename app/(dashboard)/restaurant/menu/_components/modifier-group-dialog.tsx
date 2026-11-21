"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { dashboardHintClass, dashboardInputClass, dashboardLabelClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiRequestError } from "@/lib/api";
import { createModifierGroup, updateModifierGroup, type ModifierGroupRecord } from "@/lib/restaurant-api";
import { cleanMoneyText, parseMoney } from "@/lib/service-cart";

type OptionRow = { key: string; id?: string; name: string; extra: string; usual: boolean };

/** A set of choices offered with a dish: "Patty: single or double", "Extras: cheese, bacon". */
export function ModifierGroupDialog({
  group,
  onClose,
  onSaved,
}: {
  group: ModifierGroupRecord | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const seq = useRef(0);
  const blank = (): OptionRow => ({ key: `n${++seq.current}`, name: "", extra: "", usual: false });
  const [name, setName] = useState(group?.name ?? "");
  const [mustChoose, setMustChoose] = useState((group?.minSelect ?? 0) > 0);
  const [max, setMax] = useState(String(group?.maxSelect ?? 1));
  const [options, setOptions] = useState<OptionRow[]>(() =>
    group
      ? group.options.map((o) => ({
          key: o.id,
          id: o.id,
          name: o.name,
          extra: o.priceDelta > 0 ? String(o.priceDelta) : "",
          usual: o.preselected,
        }))
      : [blank(), blank()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(key: string, change: Partial<OptionRow>) {
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, ...change } : o)));
  }

  async function save() {
    setError(null);
    const filled = options.filter((o) => o.name.trim() !== "");
    const maxSelect = Number(max);
    if (!name.trim()) return setError("Give the choices a name, like Patty or Extras");
    if (filled.length === 0) return setError("Add at least one option");
    if (!Number.isInteger(maxSelect) || maxSelect < 1) return setError("How many can be picked must be 1 or more");
    if (maxSelect > filled.length) return setError("There are fewer options than can be picked");
    if (filled.filter((o) => o.usual).length > maxSelect) {
      return setError("More options are marked as the usual choice than can be picked");
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        minSelect: mustChoose ? 1 : 0,
        maxSelect,
        options: filled.map((o) => ({
          ...(o.id ? { id: o.id } : {}),
          name: o.name.trim(),
          priceDelta: parseMoney(o.extra) ?? 0,
          preselected: o.usual,
        })),
      };
      if (group) await updateModifierGroup(group.id, body);
      else await createModifierGroup(body);
      toast.success("Choices saved");
      await onSaved();
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{group ? `Change ${group.name}` : "Add choices"}</DialogTitle>
          <DialogDescription>
            What a customer can pick on a dish. Changing these never alters orders already taken.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Name</span>
            <input
              className={dashboardInputClass(false)}
              value={name}
              maxLength={120}
              placeholder="Patty, Extras, Sauce…"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="flex min-h-9 items-center gap-2 text-sm">
            <input type="checkbox" checked={mustChoose} onChange={(e) => setMustChoose(e.target.checked)} />
            The customer must pick one
          </label>

          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>How many can be picked</span>
            <input
              className={dashboardInputClass(false, "w-24 font-mono")}
              inputMode="numeric"
              value={max}
              onChange={(e) => setMax(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
            />
          </label>

          <fieldset className="grid gap-2">
            <legend className={dashboardLabelClass()}>Options</legend>
            {options.map((o, index) => (
              <div key={o.key} className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-2">
                <input
                  className={dashboardInputClass(false)}
                  aria-label={`Option ${index + 1} name`}
                  placeholder="Single, Double, Cheese…"
                  value={o.name}
                  maxLength={120}
                  onChange={(e) => patch(o.key, { name: e.target.value })}
                />
                <input
                  className={dashboardInputClass(false, "text-right font-mono")}
                  aria-label={`Option ${index + 1} extra charge in shillings`}
                  inputMode="decimal"
                  placeholder="+ 0"
                  value={o.extra}
                  onChange={(e) => patch(o.key, { extra: cleanMoneyText(e.target.value) })}
                />
                <label className="col-span-2 flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={o.usual} onChange={(e) => patch(o.key, { usual: e.target.checked })} />
                    The usual choice
                  </span>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setOptions((prev) => prev.filter((x) => x.key !== o.key))}
                  >
                    Remove
                  </button>
                </label>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setOptions((prev) => [...prev, blank()])}>
              Add an option
            </Button>
            <span className={dashboardHintClass()}>The second box is what the option adds to the price. Leave it empty for no extra.</span>
          </fieldset>

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
