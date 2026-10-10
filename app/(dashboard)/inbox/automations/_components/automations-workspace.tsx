"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2, Zap } from "lucide-react";

import {
  createCrmAutomation,
  deleteCrmAutomation,
  fetchCrmAutomation,
  fetchCrmAutomationRuns,
  fetchCrmAutomations,
  setCrmAutomationActive,
  updateCrmAutomation,
  type CrmAutomationInput,
  type CrmAutomationRow,
  type CrmAutomationRunRow,
  type CrmAutomationStepInput,
} from "@/lib/crm";
import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const TRIGGER_OPTIONS = [
  { value: "KEYWORD_MATCH", label: "Keyword match" },
  { value: "FIRST_INBOUND_MESSAGE", label: "First inbound message" },
];

const TRIGGER_LABELS: Record<string, string> = {
  KEYWORD_MATCH: "Keyword",
  FIRST_INBOUND_MESSAGE: "First message",
};

const STEP_OPTIONS = [
  { value: "SEND_MESSAGE", label: "Send message" },
  { value: "ADD_TAG", label: "Add tag" },
  { value: "ASSIGN", label: "Assign" },
  { value: "CLOSE_CONVERSATION", label: "Close conversation" },
];

const STEP_LABELS: Record<string, string> = {
  SEND_MESSAGE: "Send message",
  ADD_TAG: "Add tag",
  ASSIGN: "Assign",
  CLOSE_CONVERSATION: "Close conversation",
};

type EditorStep = { key: string; type: string; value: string };

let stepKeySeq = 0;
function nextStepKey(): string {
  stepKeySeq += 1;
  return `step-${stepKeySeq}`;
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function readJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** The step's single editable value, mapped to its config field. */
function stepValue(step: { type: string; configJson: string | null }): string {
  const config = readJson(step.configJson);
  if (step.type === "SEND_MESSAGE") return String(config.body ?? "");
  if (step.type === "ADD_TAG") return String(config.tag ?? "");
  if (step.type === "ASSIGN") return String(config.userId ?? "");
  return "";
}

function stepConfigJson(step: EditorStep): string {
  if (step.type === "SEND_MESSAGE") return JSON.stringify({ body: step.value });
  if (step.type === "ADD_TAG") return JSON.stringify({ tag: step.value });
  if (step.type === "ASSIGN") return JSON.stringify({ userId: step.value });
  return "{}";
}

function keywordsFromConfig(raw: string | null): string {
  const config = readJson(raw);
  const keywords = config.keywords;
  return Array.isArray(keywords) ? keywords.join(", ") : "";
}

function triggerConfigJson(triggerType: string, keywords: string): string {
  if (triggerType === "KEYWORD_MATCH") {
    const list = keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    return JSON.stringify({ keywords: list });
  }
  return "{}";
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleString();
}

export function AutomationsWorkspace() {
  const { me } = useDashboard();
  const canManage = hasPermission(
    me?.permissions,
    Permission.CrmAutomationManage,
  );

  const [rules, setRules] = useState<CrmAutomationRow[]>([]);
  const [runs, setRuns] = useState<CrmAutomationRunRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("KEYWORD_MATCH");
  const [keywords, setKeywords] = useState("");
  const [steps, setSteps] = useState<EditorStep[]>([]);
  const [active, setActive] = useState(true);
  const [editorLoading, setEditorLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const rulesById = useMemo(() => {
    const map = new Map<string, CrmAutomationRow>();
    for (const rule of rules) map.set(rule.id, rule);
    return map;
  }, [rules]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const [nextRules, nextRuns] = await Promise.all([
        fetchCrmAutomations(),
        fetchCrmAutomationRuns().catch(() => ({
          items: [] as CrmAutomationRunRow[],
          page: 0,
          size: 30,
          total: 0,
        })),
      ]);
      setRules(nextRules);
      setRuns(nextRuns.items);
      setListError(null);
    } catch (err) {
      setListError(messageFor(err, "Could not load automations."));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const startNew = useCallback(() => {
    setSelectedId(null);
    setName("");
    setTriggerType("KEYWORD_MATCH");
    setKeywords("");
    setSteps([]);
    setActive(true);
    setEditorError(null);
  }, []);

  const loadRule = useCallback(async (id: string) => {
    setSelectedId(id);
    setEditorLoading(true);
    setEditorError(null);
    try {
      const detail = await fetchCrmAutomation(id);
      setName(detail.automation.name);
      setTriggerType(detail.automation.triggerType);
      setKeywords(keywordsFromConfig(detail.automation.triggerConfigJson));
      setActive(detail.automation.active);
      setSteps(
        detail.steps.map((s) => ({
          key: nextStepKey(),
          type: s.type,
          value: stepValue(s),
        })),
      );
    } catch (err) {
      setEditorError(messageFor(err, "Could not load the rule."));
    } finally {
      setEditorLoading(false);
    }
  }, []);

  const onSave = useCallback(async () => {
    if (!canManage) return;
    if (!name.trim()) {
      setEditorError("Give the rule a name.");
      return;
    }
    if (steps.length === 0) {
      setEditorError("Add at least one step.");
      return;
    }
    setSaving(true);
    setEditorError(null);
    const input: CrmAutomationInput = {
      name: name.trim(),
      triggerType,
      triggerConfigJson: triggerConfigJson(triggerType, keywords),
      active,
      steps: steps.map<CrmAutomationStepInput>((s) => ({
        type: s.type,
        configJson: stepConfigJson(s),
      })),
    };
    try {
      const saved = selectedId
        ? await updateCrmAutomation(selectedId, input)
        : await createCrmAutomation(input);
      setSelectedId(saved.automation.id);
      await loadList();
    } catch (err) {
      setEditorError(messageFor(err, "Could not save the rule."));
    } finally {
      setSaving(false);
    }
  }, [canManage, name, triggerType, keywords, active, steps, selectedId, loadList]);

  const onDelete = useCallback(
    async (id: string) => {
      if (!canManage) return;
      try {
        await deleteCrmAutomation(id);
        if (selectedId === id) startNew();
        await loadList();
      } catch {
        // api layer toasts
      }
    },
    [canManage, selectedId, startNew, loadList],
  );

  const onToggleActive = useCallback(
    async (rule: CrmAutomationRow) => {
      if (!canManage) return;
      try {
        await setCrmAutomationActive(rule.id, !rule.active);
        await loadList();
        if (selectedId === rule.id) setActive(!rule.active);
      } catch {
        // api layer toasts
      }
    },
    [canManage, selectedId, loadList],
  );

  const addStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      { key: nextStepKey(), type: "SEND_MESSAGE", value: "" },
    ]);
  }, []);

  const updateStep = useCallback((key: string, patch: Partial<EditorStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    );
  }, []);

  const removeStep = useCallback((key: string) => {
    setSteps((prev) => prev.filter((s) => s.key !== key));
  }, []);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Rules list */}
      <aside className="flex flex-col rounded-none border bg-white">
        <div className="flex items-center justify-between gap-2 border-b p-2">
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold">
            <Zap className="size-3.5" /> Rules
          </span>
          {canManage ? (
            <button
              type="button"
              onClick={startNew}
              className="inline-flex items-center gap-1 rounded-none border px-2 py-1 text-[12px]"
            >
              <Plus className="size-3.5" /> New
            </button>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="flex items-center justify-center py-10 text-[13px] text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
            </div>
          ) : listError ? (
            <p className="p-3 text-[13px] text-red-600">{listError}</p>
          ) : rules.length === 0 ? (
            <p className="p-3 text-[13px] text-muted-foreground">
              No rules yet. Create one to reply automatically.
            </p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "flex flex-col gap-0.5 border-b px-3 py-2",
                  rule.id === selectedId
                    ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                    : "hover:bg-neutral-50",
                )}
              >
                <button
                  type="button"
                  onClick={() => void loadRule(rule.id)}
                  className="flex items-center justify-between gap-2 text-left"
                >
                  <span className="truncate text-[13px] font-medium">
                    {rule.name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-none border px-1.5 text-[10px]",
                      rule.active
                        ? "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
                        : "text-muted-foreground",
                    )}
                  >
                    {rule.active ? "on" : "off"}
                  </span>
                </button>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {TRIGGER_LABELS[rule.triggerType] ?? rule.triggerType} ·{" "}
                    {rule.executionCount} runs
                  </span>
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => void onToggleActive(rule)}
                      className="shrink-0 text-[11px] underline-offset-2 hover:underline"
                    >
                      {rule.active ? "Turn off" : "Turn on"}
                    </button>
                  ) : null}
                </span>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Editor + runs */}
      <section className="flex flex-col gap-3">
        <div className={DASHBOARD_SECTION_SURFACE}>
          <h2 className="mb-2 text-[13px] font-semibold">
            {selectedId ? "Edit rule" : "New rule"}
          </h2>

          {editorLoading ? (
            <div className="flex items-center justify-center py-6 text-[13px] text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={dashboardLabelClass()}>Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!canManage}
                    placeholder="e.g. Price question"
                    className={cn(dashboardInputClass(!canManage), "mt-1")}
                  />
                </div>
                <div>
                  <label className={dashboardLabelClass()}>Trigger</label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value)}
                    disabled={!canManage}
                    className={cn(dashboardSelectClass(!canManage), "mt-1")}
                  >
                    {TRIGGER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {triggerType === "KEYWORD_MATCH" ? (
                <div>
                  <label className={dashboardLabelClass()}>
                    Keywords (comma-separated)
                  </label>
                  <input
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    disabled={!canManage}
                    placeholder="price, bei, how much"
                    className={cn(dashboardInputClass(!canManage), "mt-1")}
                  />
                  <p className={cn(dashboardHintClass(), "mt-1")}>
                    Fires when an incoming message contains any of these.
                  </p>
                </div>
              ) : (
                <p className={dashboardHintClass()}>
                  Fires on a new contact's first ever message.
                </p>
              )}

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className={dashboardLabelClass()}>Steps</label>
                  {canManage ? (
                    <button
                      type="button"
                      onClick={addStep}
                      className="inline-flex items-center gap-1 rounded-none border px-2 py-0.5 text-[11px]"
                    >
                      <Plus className="size-3" /> Add step
                    </button>
                  ) : null}
                </div>
                {steps.length === 0 ? (
                  <p className={dashboardHintClass()}>No steps yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {steps.map((step, index) => (
                      <li
                        key={step.key}
                        className="flex flex-wrap items-start gap-2 rounded-none border p-2"
                      >
                        <span className="mt-1 text-[11px] text-muted-foreground">
                          {index + 1}.
                        </span>
                        <select
                          value={step.type}
                          onChange={(e) =>
                            updateStep(step.key, {
                              type: e.target.value,
                              value: "",
                            })
                          }
                          disabled={!canManage}
                          className={cn(
                            dashboardSelectClass(!canManage),
                            "w-40",
                          )}
                        >
                          {STEP_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {step.type === "SEND_MESSAGE" ? (
                          <textarea
                            value={step.value}
                            onChange={(e) =>
                              updateStep(step.key, { value: e.target.value })
                            }
                            disabled={!canManage}
                            rows={2}
                            placeholder="Reply text…"
                            className={cn(
                              dashboardTextareaClass(!canManage),
                              "min-w-[12rem] flex-1",
                            )}
                          />
                        ) : step.type === "CLOSE_CONVERSATION" ? (
                          <span className={cn(dashboardHintClass(), "mt-2 flex-1")}>
                            Marks the conversation closed.
                          </span>
                        ) : (
                          <input
                            value={step.value}
                            onChange={(e) =>
                              updateStep(step.key, { value: e.target.value })
                            }
                            disabled={!canManage}
                            placeholder={
                              step.type === "ADD_TAG" ? "Tag name" : "User id"
                            }
                            className={cn(
                              dashboardInputClass(!canManage),
                              "min-w-[10rem] flex-1",
                            )}
                          />
                        )}
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => removeStep(step.key)}
                            className="mt-1 text-red-600"
                            aria-label="Remove step"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={active}
                  disabled={!canManage}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <span className="text-[13px] font-medium">Active</span>
              </label>

              {editorError ? (
                <p className="text-[12px] text-red-600">{editorError}</p>
              ) : null}

              {canManage ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void onSave()}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-none border bg-[var(--pos-primary,#0f766e)] px-3 py-1.5 text-[13px] text-white disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save
                  </button>
                  {selectedId ? (
                    <button
                      type="button"
                      onClick={() => void onDelete(selectedId)}
                      className="inline-flex items-center gap-1 rounded-none border px-3 py-1.5 text-[13px] text-red-600"
                    >
                      <Trash2 className="size-4" /> Delete
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className={dashboardHintClass()}>
                  You need the automation-manage permission to edit rules.
                </p>
              )}
            </div>
          )}
        </div>

        <div className={DASHBOARD_SECTION_SURFACE}>
          <h2 className="mb-2 text-[13px] font-semibold">Recent runs</h2>
          {runs.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Nothing has fired yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {runs.map((run) => (
                <li
                  key={run.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-none border px-2 py-1 text-[12px]"
                >
                  <span className="truncate">
                    {rulesById.get(run.automationId)?.name ?? "Rule"}
                    <span className="text-muted-foreground">
                      {" "}
                      · {run.triggerEvent}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-none border px-1.5 text-[10px]",
                        run.status === "success"
                          ? "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
                          : run.status === "failed"
                            ? "text-red-600"
                            : "text-amber-600",
                      )}
                    >
                      {run.status}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatWhen(run.createdAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
