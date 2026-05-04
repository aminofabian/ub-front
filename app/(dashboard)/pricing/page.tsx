"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleDollarSign, Package, Tags, Truck } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchBranches,
  fetchPriceRules,
  fetchSellPriceSuggestion,
  fetchTaxRates,
  postPriceRule,
  postSellingPrice,
  postTaxRate,
  putPriceRule,
  type BranchRecord,
  type PriceRuleRecord,
  type SellPriceSuggestionRecord,
  type SellingPriceResponseRecord,
  type TaxRateRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function num(v: number | string | null | undefined): string {
  if (v == null) {
    return "—";
  }
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toFixed(4) : String(v);
}

const RULE_TYPE_MARGIN_PERCENT = "MARGIN_PERCENT";

function marginFromParamsJson(paramsJson: string): string {
  try {
    const parsed = JSON.parse(paramsJson) as { marginPercent?: number | string };
    if (parsed.marginPercent == null) {
      return "";
    }
    return String(parsed.marginPercent);
  } catch {
    return "";
  }
}

export default function PricingPage() {
  const { me, business } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.PricingRead);
  const canSetSell = hasPermission(me?.permissions, Permission.PricingSellPriceSet);
  const canManageRules = hasPermission(me?.permissions, Permission.PricingRulesManage);
  const allowed = canRead || canSetSell || canManageRules;
  const currency = business?.currency?.trim() || "KES";

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [rules, setRules] = useState<PriceRuleRecord[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateRecord[]>([]);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleMargin, setNewRuleMargin] = useState("");
  const [newRuleActive, setNewRuleActive] = useState(true);
  const [editRuleId, setEditRuleId] = useState("");
  const [editRuleName, setEditRuleName] = useState("");
  const [editRuleMargin, setEditRuleMargin] = useState("");
  const [editRuleActive, setEditRuleActive] = useState(true);
  const [taxName, setTaxName] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState("");
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [taxActive, setTaxActive] = useState(true);
  const [suggestItemId, setSuggestItemId] = useState("");
  const [suggestSupplierId, setSuggestSupplierId] = useState("");
  const [suggestion, setSuggestion] = useState<SellPriceSuggestionRecord | null>(null);
  const [sellItemId, setSellItemId] = useState("");
  const [sellBranchId, setSellBranchId] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [sellEffectiveFrom, setSellEffectiveFrom] = useState("");
  const [sellNotes, setSellNotes] = useState("");
  const [lastSellingPrice, setLastSellingPrice] = useState<SellingPriceResponseRecord | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) {
          setBranches(list.filter((b) => b.active));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  useEffect(() => {
    if (!canRead) {
      return;
    }
    let cancelled = false;
    Promise.all([fetchPriceRules(), fetchTaxRates()])
      .then(([r, t]) => {
        if (!cancelled) {
          setRules(r);
          setTaxRates(t);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load pricing reference data.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canRead]);

  const onSuggest = useCallback(async () => {
    const id = suggestItemId.trim();
    if (!id) {
      setError("Enter an item ID.");
      setNotice("");
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const row = await fetchSellPriceSuggestion(id, suggestSupplierId.trim() || undefined);
      setSuggestion(row);
      setNotice("Suggestion loaded.");
    } catch (err) {
      setSuggestion(null);
      setError(err instanceof Error ? err.message : "Suggest failed.");
    } finally {
      setLoading(false);
    }
  }, [suggestItemId, suggestSupplierId]);

  const onSetSellingPrice = useCallback(async () => {
    const itemId = sellItemId.trim();
    if (!itemId || !sellPrice.trim() || !sellEffectiveFrom.trim()) {
      setError("Item ID, price, and effective-from date are required.");
      setNotice("");
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const res = await postSellingPrice({
        itemId,
        branchId: sellBranchId.trim() || null,
        price: sellPrice.trim(),
        effectiveFrom: sellEffectiveFrom.trim(),
        notes: sellNotes.trim() || null,
      });
      setLastSellingPrice(res);
      setNotice("Selling price saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setLoading(false);
    }
  }, [sellBranchId, sellEffectiveFrom, sellItemId, sellNotes, sellPrice]);

  const reloadReadData = useCallback(async () => {
    if (!canRead) {
      return;
    }
    const [r, t] = await Promise.all([fetchPriceRules(), fetchTaxRates()]);
    setRules(r);
    setTaxRates(t);
  }, [canRead]);

  const onCreateRule = useCallback(async () => {
    const name = newRuleName.trim();
    if (!name || !newRuleMargin.trim()) {
      setError("Rule name and margin % are required.");
      setNotice("");
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const paramsJson = JSON.stringify({ marginPercent: newRuleMargin.trim() });
      await postPriceRule({
        name,
        ruleType: RULE_TYPE_MARGIN_PERCENT,
        paramsJson,
        active: newRuleActive,
      });
      setNewRuleName("");
      setNewRuleMargin("");
      setNewRuleActive(true);
      setNotice("Price rule created.");
      await reloadReadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create rule failed.");
    } finally {
      setLoading(false);
    }
  }, [newRuleActive, newRuleMargin, newRuleName, reloadReadData]);

  const onUpdateRule = useCallback(async () => {
    if (!editRuleId.trim()) {
      setError("Select a rule to update.");
      setNotice("");
      return;
    }
    const name = editRuleName.trim();
    if (!name || !editRuleMargin.trim()) {
      setError("Name and margin % are required.");
      setNotice("");
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const paramsJson = JSON.stringify({ marginPercent: editRuleMargin.trim() });
      await putPriceRule(editRuleId.trim(), {
        name,
        ruleType: RULE_TYPE_MARGIN_PERCENT,
        paramsJson,
        active: editRuleActive,
      });
      setNotice("Price rule updated.");
      await reloadReadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update rule failed.");
    } finally {
      setLoading(false);
    }
  }, [editRuleActive, editRuleId, editRuleMargin, editRuleName, reloadReadData]);

  const onCreateTaxRate = useCallback(async () => {
    const name = taxName.trim();
    if (!name || !taxRatePercent.trim()) {
      setError("Tax name and rate % are required.");
      setNotice("");
      return;
    }
    const pct = Number(taxRatePercent);
    if (!Number.isFinite(pct) || pct < 0) {
      setError("Invalid tax rate.");
      setNotice("");
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    try {
      await postTaxRate({
        name,
        ratePercent: pct,
        inclusive: taxInclusive,
        active: taxActive,
      });
      setTaxName("");
      setTaxRatePercent("");
      setTaxInclusive(false);
      setTaxActive(true);
      setNotice("Tax rate created.");
      await reloadReadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create tax rate failed.");
    } finally {
      setLoading(false);
    }
  }, [reloadReadData, taxActive, taxInclusive, taxName, taxRatePercent]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Pricing"
        description={
          <>
            You need{" "}
            <code className="text-xs">{Permission.PricingRead}</code>,{" "}
            <code className="text-xs">{Permission.PricingSellPriceSet}</code>, or{" "}
            <code className="text-xs">{Permission.PricingRulesManage}</code>.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <div className="space-y-10">
      <header className="space-y-4">
        <DashboardPageHero
          icon={CircleDollarSign}
          eyebrow="Commercial"
          title="Pricing"
          description={
            <>
              Suggested sell price uses the latest landed cost and active margin rules. Selling prices are
              effective-dated rows ({currency}).
            </>
          }
        />
        <DashboardQuickLinks
          links={[
            { href: APP_ROUTES.products, label: "Products", desc: "Items", icon: Package },
            { href: APP_ROUTES.suppliers, label: "Suppliers", desc: "Costs", icon: Truck },
            { href: APP_ROUTES.categories, label: "Categories", desc: "Margins", icon: Tags },
          ]}
        />
      </header>

      {canRead ? (
        <div className="space-y-4 rounded-md border bg-muted/20 p-4">
          <h3 className="text-sm font-medium">Suggest sell price</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Item ID</span>
              <input
                className="rounded border bg-background px-2 py-1.5 font-mono text-xs"
                value={suggestItemId}
                onChange={(e) => setSuggestItemId(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Supplier ID (optional)</span>
              <input
                className="rounded border bg-background px-2 py-1.5 font-mono text-xs"
                value={suggestSupplierId}
                onChange={(e) => setSuggestSupplierId(e.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => onSuggest().catch(() => undefined)}
            >
              Suggest
            </Button>
          </div>
          {suggestion ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Latest unit cost</dt>
                <dd className="tabular-nums">{num(suggestion.latestUnitCost)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Margin %</dt>
                <dd className="tabular-nums">{num(suggestion.marginPercent)}</dd>
              </div>
              <div className="flex justify-between gap-2 sm:col-span-2">
                <dt className="text-muted-foreground">Rule</dt>
                <dd>{suggestion.ruleName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 sm:col-span-2">
                <dt className="text-muted-foreground">Suggested sell</dt>
                <dd className="text-right font-semibold tabular-nums">
                  {num(suggestion.suggestedSellPrice)}
                </dd>
              </div>
              {suggestion.note ? (
                <div className="sm:col-span-2 text-muted-foreground">{suggestion.note}</div>
              ) : null}
            </dl>
          ) : null}

          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Price rules
            </h4>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Active</th>
                    <th className="px-3 py-2 font-medium">Params</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                        No rules.
                      </td>
                    </tr>
                  ) : (
                    rules.map((rule) => (
                      <tr key={rule.id} className="border-b last:border-0">
                        <td className="px-3 py-2">{rule.name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{rule.ruleType}</td>
                        <td className="px-3 py-2">{rule.active ? "Yes" : "No"}</td>
                        <td className="max-w-xs truncate px-3 py-2 font-mono text-xs">
                          {rule.paramsJson}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tax rates</h4>
            <p className="text-xs text-muted-foreground">Active rates only (for reference).</p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[24rem] text-left text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 text-right font-medium">Rate %</th>
                    <th className="px-3 py-2 font-medium">Inclusive</th>
                  </tr>
                </thead>
                <tbody>
                  {taxRates.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                        No tax rates.
                      </td>
                    </tr>
                  ) : (
                    taxRates.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{String(row.ratePercent)}</td>
                        <td className="px-3 py-2">{row.inclusive ? "Yes" : "No"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {canManageRules ? (
        <div className="space-y-6 rounded-md border bg-muted/20 p-4">
          <h3 className="text-sm font-medium">Manage rules &amp; tax</h3>
          {!canRead ? (
            <p className="text-xs text-muted-foreground">
              You can create records here. Listing rules and tax rates needs{" "}
              <code className="rounded bg-muted px-0.5">{Permission.PricingRead}</code>.
            </p>
          ) : null}

          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground">New margin rule</h4>
            <p className="text-xs text-muted-foreground">
              Rule type is fixed to <code className="rounded bg-muted px-0.5">MARGIN_PERCENT</code> (params:{" "}
              <code className="rounded bg-muted px-0.5">marginPercent</code>).
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Name</span>
                <input
                  className="rounded border bg-background px-2 py-1.5"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Margin %</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-28 rounded border bg-background px-2 py-1.5 tabular-nums"
                  value={newRuleMargin}
                  onChange={(e) => setNewRuleMargin(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newRuleActive}
                  onChange={(e) => setNewRuleActive(e.target.checked)}
                />
                Active
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => onCreateRule().catch(() => undefined)}
              >
                Create rule
              </Button>
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <h4 className="text-xs font-medium text-muted-foreground">Update margin rule</h4>
            {!canRead || rules.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {canRead ? "No rules yet — create one above." : "Requires read access to list rules."}
              </p>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Rule</span>
                  <select
                    className="min-w-[12rem] rounded border bg-background px-2 py-1.5"
                    value={editRuleId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setEditRuleId(id);
                      const rule = rules.find((x) => x.id === id);
                      if (rule) {
                        setEditRuleName(rule.name);
                        setEditRuleMargin(marginFromParamsJson(rule.paramsJson));
                        setEditRuleActive(rule.active);
                      }
                    }}
                  >
                    <option value="">—</option>
                    {rules.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <input
                    className="rounded border bg-background px-2 py-1.5"
                    value={editRuleName}
                    onChange={(e) => setEditRuleName(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Margin %</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-28 rounded border bg-background px-2 py-1.5 tabular-nums"
                    value={editRuleMargin}
                    onChange={(e) => setEditRuleMargin(e.target.value)}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editRuleActive}
                    onChange={(e) => setEditRuleActive(e.target.checked)}
                  />
                  Active
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading || !editRuleId}
                  onClick={() => onUpdateRule().catch(() => undefined)}
                >
                  Save changes
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            <h4 className="text-xs font-medium text-muted-foreground">New tax rate</h4>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Name</span>
                <input
                  className="rounded border bg-background px-2 py-1.5"
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Rate %</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-24 rounded border bg-background px-2 py-1.5 tabular-nums"
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={taxInclusive}
                  onChange={(e) => setTaxInclusive(e.target.checked)}
                />
                Inclusive
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={taxActive}
                  onChange={(e) => setTaxActive(e.target.checked)}
                />
                Active
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => onCreateTaxRate().catch(() => undefined)}
              >
                Create tax rate
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {canSetSell ? (
        <div className="space-y-4 rounded-md border bg-muted/20 p-4">
          <h3 className="text-sm font-medium">Set selling price</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Item ID</span>
              <input
                className="rounded border bg-background px-2 py-1.5 font-mono text-xs"
                value={sellItemId}
                onChange={(e) => setSellItemId(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Branch (optional)</span>
              <select
                className="rounded border bg-background px-2 py-1.5"
                value={sellBranchId}
                onChange={(e) => setSellBranchId(e.target.value)}
              >
                <option value="">All / default</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Price</span>
              <input
                type="text"
                inputMode="decimal"
                className="rounded border bg-background px-2 py-1.5 tabular-nums"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Effective from</span>
              <input
                type="date"
                className="rounded border bg-background px-2 py-1.5"
                value={sellEffectiveFrom}
                onChange={(e) => setSellEffectiveFrom(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Notes (optional)</span>
              <input
                className="rounded border bg-background px-2 py-1.5"
                value={sellNotes}
                onChange={(e) => setSellNotes(e.target.value)}
              />
            </label>
          </div>
          <Button
            type="button"
            disabled={loading}
            onClick={() => onSetSellingPrice().catch(() => undefined)}
          >
            Save selling price
          </Button>
          {lastSellingPrice ? (
            <p className="text-xs text-muted-foreground">
              Saved row {lastSellingPrice.id}: {String(lastSellingPrice.price)} from{" "}
              {lastSellingPrice.effectiveFrom}
              {lastSellingPrice.effectiveTo ? ` to ${lastSellingPrice.effectiveTo}` : ""}.
            </p>
          ) : null}
        </div>
      ) : null}

      {notice ? <DashboardFeedback kind="success" text={notice} /> : null}
      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      </div>
    </div>
  );
}
