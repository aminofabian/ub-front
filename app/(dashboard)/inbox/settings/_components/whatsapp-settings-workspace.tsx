"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  createCrmKnowledge,
  deleteCrmKnowledge,
  fetchCrmAgents,
  fetchCrmAiSettings,
  fetchCrmKnowledge,
  updateCrmAiSettings,
  updateCrmKnowledge,
  type CrmAgentRow,
  type CrmAiSettings,
  type CrmKnowledgeDocRow,
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

const DEFAULT_SETTINGS: CrmAiSettings = {
  autoReplyEnabled: false,
  maxRepliesPerConversation: 3,
  handoffUserId: null,
};

const CONTENT_PREVIEW_CHARS = 280;

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

export function WhatsappSettingsWorkspace() {
  const { me } = useDashboard();
  const canManage = hasPermission(me?.permissions, Permission.CrmInboxManage);

  const [settings, setSettings] = useState<CrmAiSettings>(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [agents, setAgents] = useState<CrmAgentRow[]>([]);

  const [docs, setDocs] = useState<CrmKnowledgeDocRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      setSettings(await fetchCrmAiSettings());
    } catch {
      // api layer toasts
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      setDocs(await fetchCrmKnowledge());
      setDocsError(null);
    } catch (err) {
      setDocsError(messageFor(err, "Could not load the knowledge base."));
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    void loadDocs();
    void fetchCrmAgents()
      .then(setAgents)
      .catch(() => setAgents([]));
  }, [loadSettings, loadDocs]);

  const onSaveSettings = useCallback(async () => {
    if (!canManage) return;
    setSettingsSaving(true);
    setSettingsNotice(null);
    try {
      setSettings(await updateCrmAiSettings(settings));
      setSettingsNotice("Saved.");
    } catch (err) {
      setSettingsNotice(messageFor(err, "Could not save the settings."));
    } finally {
      setSettingsSaving(false);
    }
  }, [canManage, settings]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setFormTitle("");
    setFormContent("");
    setFormError(null);
  }, []);

  const onEditDoc = useCallback((doc: CrmKnowledgeDocRow) => {
    setEditingId(doc.id);
    setFormTitle(doc.title);
    setFormContent(doc.content);
    setFormError(null);
  }, []);

  const onSubmitDoc = useCallback(async () => {
    if (!canManage) return;
    const title = formTitle.trim();
    const content = formContent.trim();
    if (!title || !content) {
      setFormError("Add a title and some content.");
      return;
    }
    setFormBusy(true);
    setFormError(null);
    try {
      if (editingId) {
        const saved = await updateCrmKnowledge(editingId, title, content);
        setDocs((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
      } else {
        const created = await createCrmKnowledge(title, content);
        setDocs((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      setFormError(messageFor(err, "Could not save the document."));
    } finally {
      setFormBusy(false);
    }
  }, [canManage, editingId, formTitle, formContent, resetForm]);

  const onDeleteDoc = useCallback(
    async (id: string) => {
      if (!canManage) return;
      setDeletingId(id);
      try {
        await deleteCrmKnowledge(id);
        setDocs((prev) => prev.filter((d) => d.id !== id));
        if (editingId === id) resetForm();
      } catch {
        // api layer toasts
      } finally {
        setDeletingId(null);
      }
    },
    [canManage, editingId, resetForm],
  );

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* AI auto-reply */}
      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-none border border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold">AI auto-reply</h2>
            <p className={dashboardHintClass()}>
              Let SokoMind answer new conversations using your knowledge base.
            </p>
          </div>
        </div>

        {settingsLoading ? (
          <div className="flex items-center justify-center py-6 text-[13px] text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoReplyEnabled}
                disabled={!canManage || settingsSaving}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    autoReplyEnabled: e.target.checked,
                  }))
                }
              />
              <span className="text-[13px] font-medium">Enable auto-reply</span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={dashboardLabelClass()}>
                  Max replies per conversation
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={settings.maxRepliesPerConversation}
                  disabled={!canManage || settingsSaving}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      maxRepliesPerConversation: Number(e.target.value),
                    }))
                  }
                  className={cn(
                    dashboardInputClass(!canManage || settingsSaving),
                    "mt-1",
                  )}
                />
                <p className={cn(dashboardHintClass(), "mt-1")}>
                  After this many AI replies the bot stands down and waits for an
                  agent.
                </p>
              </div>

              <div>
                <label className={dashboardLabelClass()}>Hand off to</label>
                <select
                  value={settings.handoffUserId ?? ""}
                  disabled={!canManage || settingsSaving}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      handoffUserId: e.target.value || null,
                    }))
                  }
                  className={cn(
                    dashboardSelectClass(!canManage || settingsSaving),
                    "mt-1",
                  )}
                >
                  <option value="">Shared queue (any agent)</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <p className={cn(dashboardHintClass(), "mt-1")}>
                  The thread is assigned here when the customer needs a human.
                </p>
              </div>
            </div>

            {canManage ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void onSaveSettings()}
                  disabled={settingsSaving}
                  className="inline-flex items-center gap-1 rounded-none border bg-[var(--pos-primary,#0f766e)] px-3 py-1.5 text-[13px] text-white disabled:opacity-50"
                >
                  {settingsSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Save
                </button>
                {settingsNotice ? (
                  <span className={dashboardHintClass()}>{settingsNotice}</span>
                ) : null}
              </div>
            ) : (
              <p className={dashboardHintClass()}>
                You need the inbox-manage permission to change these settings.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Knowledge base */}
      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-none border border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]">
            <BookOpen className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold">Knowledge base</h2>
            <p className={dashboardHintClass()}>
              FAQs and policies the assistant may quote. Nothing else is used.
            </p>
          </div>
        </div>

        {canManage ? (
          <div className="mb-3 rounded-none border p-2">
            <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
              {editingId ? "Edit document" : "New document"}
            </p>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Title, e.g. Delivery & returns"
              disabled={formBusy}
              className={dashboardInputClass(formBusy)}
            />
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={4}
              placeholder="Write the details the assistant may use…"
              disabled={formBusy}
              className={cn(dashboardTextareaClass(formBusy), "mt-2")}
            />
            {formError ? (
              <p className="mt-1 text-[11px] text-red-600">{formError}</p>
            ) : null}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void onSubmitDoc()}
                disabled={formBusy}
                className="inline-flex items-center gap-1 rounded-none border bg-[var(--pos-primary,#0f766e)] px-3 py-1.5 text-[13px] text-white disabled:opacity-50"
              >
                {formBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {editingId ? "Save changes" : "Add document"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={formBusy}
                  className="inline-flex items-center gap-1 rounded-none border px-3 py-1.5 text-[13px] disabled:opacity-50"
                >
                  <X className="size-4" /> Cancel
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {docsLoading ? (
          <div className="flex items-center justify-center py-6 text-[13px] text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
          </div>
        ) : docsError ? (
          <p className="text-[13px] text-red-600">{docsError}</p>
        ) : docs.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No documents yet. Add FAQs, delivery times, or return policies.
          </p>
        ) : (
          <ul className="space-y-1">
            {docs.map((doc) => (
              <li key={doc.id} className="rounded-none border p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {doc.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => onEditDoc(doc)}
                        className="inline-flex items-center gap-1 rounded-none border px-2 py-1 text-[11px]"
                      >
                        <Pencil className="size-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteDoc(doc.id)}
                        disabled={deletingId === doc.id}
                        className="inline-flex items-center gap-1 rounded-none border px-2 py-1 text-[11px] text-red-600 disabled:opacity-50"
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-[12px] text-muted-foreground">
                  {doc.content.length > CONTENT_PREVIEW_CHARS
                    ? `${doc.content.slice(0, CONTENT_PREVIEW_CHARS)}…`
                    : doc.content}
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className={cn(dashboardHintClass(), "mt-2")}>
          The assistant only answers from what is written here and never invents
          prices or stock.
        </p>
      </section>
    </div>
  );
}
