"use client";

import { useCallback, useEffect, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  createBranch,
  fetchBranches,
  patchBranch,
  type BranchRecord,
} from "@/lib/api";

type BranchDraft = {
  name: string;
  address: string;
};

const EMPTY_DRAFT: BranchDraft = { name: "", address: "" };

export default function BranchesPage() {
  const { refreshSession, canManageBusinessSettings } = useDashboard();
  const [rows, setRows] = useState<BranchRecord[]>([]);
  const [draft, setDraft] = useState<BranchDraft>(EMPTY_DRAFT);
  const [edits, setEdits] = useState<Record<string, BranchDraft & { active: boolean }>>(
    {},
  );
  const [message, setMessage] = useState("");

  const canManage = canManageBusinessSettings;

  const load = useCallback(async () => {
    const list = await fetchBranches();
    setRows(list);
    const nextEdits: Record<string, BranchDraft & { active: boolean }> = {};
    for (const b of list) {
      nextEdits[b.id] = {
        name: b.name,
        address: b.address ?? "",
        active: b.active,
      };
    }
    setEdits(nextEdits);
  }, []);

  useEffect(() => {
    load().catch((error) =>
      setMessage(error instanceof Error ? error.message : "Failed to load branches."),
    );
  }, [load]);

  const onCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    try {
      await createBranch({
        name: draft.name.trim(),
        address: draft.address.trim() || undefined,
      });
      setDraft(EMPTY_DRAFT);
      await load();
      await refreshSession();
      setMessage("Branch created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed.");
    }
  };

  const onSaveRow = async (branchId: string) => {
    const row = edits[branchId];
    if (!row?.name.trim()) {
      setMessage("Branch name is required.");
      return;
    }
    setMessage("");
    try {
      await patchBranch(branchId, {
        name: row.name.trim(),
        address: row.address.trim() || undefined,
        active: row.active,
      });
      await load();
      setMessage("Branch updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">Branches</h2>
        <p className="text-sm text-muted-foreground">
          List locations for this business. Editing requires{" "}
          <code>business.manage_settings</code>.
        </p>
      </header>

      {canManage ? (
        <form
          className="grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-4"
          onSubmit={onCreate}
        >
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
            placeholder="Branch name"
            value={draft.name}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, name: event.target.value }))
            }
            required
            aria-label="New branch name"
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
            placeholder="Address (optional)"
            value={draft.address}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, address: event.target.value }))
            }
            aria-label="New branch address"
          />
          <Button className="md:col-span-2 md:w-fit" type="submit">
            Create branch
          </Button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Address</th>
              <th className="px-3 py-2 font-medium">Active</th>
              {canManage ? (
                <th className="px-3 py-2 font-medium">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((branch) => {
              const row = edits[branch.id];
              return (
                <tr key={branch.id} className="border-b">
                  <td className="px-3 py-2 align-top">
                    {canManage && row ? (
                      <input
                        className="w-full rounded border bg-background px-2 py-1 text-xs"
                        value={row.name}
                        onChange={(event) =>
                          setEdits((previous) => ({
                            ...previous,
                            [branch.id]: {
                              ...row,
                              name: event.target.value,
                            },
                          }))
                        }
                        aria-label={`Edit name for ${branch.name}`}
                      />
                    ) : (
                      branch.name
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {canManage && row ? (
                      <input
                        className="w-full rounded border bg-background px-2 py-1 text-xs"
                        value={row.address}
                        onChange={(event) =>
                          setEdits((previous) => ({
                            ...previous,
                            [branch.id]: {
                              ...row,
                              address: event.target.value,
                            },
                          }))
                        }
                        aria-label={`Edit address for ${branch.name}`}
                      />
                    ) : (
                      (branch.address ?? "—")
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {canManage && row ? (
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={row.active}
                          onChange={(event) =>
                            setEdits((previous) => ({
                              ...previous,
                              [branch.id]: {
                                ...row,
                                active: event.target.checked,
                              },
                            }))
                          }
                        />
                        Active
                      </label>
                    ) : (
                      (branch.active ? "yes" : "no")
                    )}
                  </td>
                  {canManage ? (
                    <td className="px-3 py-2 align-top">
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        className="h-7 text-xs"
                        onClick={() => onSaveRow(branch.id)}
                      >
                        Save
                      </Button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}
