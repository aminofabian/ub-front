"use client";

import { useCallback, useEffect, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  addMyDomain,
  deleteMyDomain,
  fetchMyDomains,
  setMyPrimaryDomain,
  type DomainRecord,
} from "@/lib/api";

type Busy = { kind: "idle" } | { kind: "load" } | { kind: "save" } | { kind: "row"; id: string };

type Notice = { tone: "error" | "info"; text: string } | null;

function sortDomains(rows: DomainRecord[]): DomainRecord[] {
  return [...rows].sort((a, b) => {
    if (a.primary !== b.primary) {
      return a.primary ? -1 : 1;
    }
    return a.domain.localeCompare(b.domain);
  });
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function LockedNotice() {
  return (
    <section className="max-w-2xl space-y-3">
      <h2 className="text-xl font-semibold">Domains</h2>
      <p className="text-sm text-muted-foreground">
        Ask an owner or admin (permission <code>business.manage_settings</code>) to manage your storefront
        domains.
      </p>
    </section>
  );
}

function AddDomainForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (domain: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");

  const onSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = value.trim();
    if (!next) {
      return;
    }
    await onSubmit(next);
    setValue("");
  };

  return (
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onSend}>
      <label htmlFor="new-domain" className="sr-only">
        Domain hostname
      </label>
      <input
        id="new-domain"
        className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="shop.acme.com"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button type="submit" disabled={busy || !value.trim()}>
        {busy ? "Adding…" : "Add domain"}
      </Button>
    </form>
  );
}

function DomainRow({
  row,
  busy,
  onMakePrimary,
  onDelete,
}: {
  row: DomainRecord;
  busy: boolean;
  onMakePrimary: (row: DomainRecord) => void;
  onDelete: (row: DomainRecord) => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col">
        <span className="font-mono text-sm">{row.domain}</span>
        <span className="text-xs text-muted-foreground">
          {row.primary ? "Primary · " : ""}
          {row.active ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy || row.primary}
          onClick={() => onMakePrimary(row)}
        >
          {row.primary ? "Primary" : "Make primary"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || row.primary}
          onClick={() => onDelete(row)}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

export default function DomainsPage() {
  const { canManageBusinessSettings } = useDashboard();
  const [rows, setRows] = useState<DomainRecord[]>([]);
  const [busy, setBusy] = useState<Busy>({ kind: "load" });
  const [notice, setNotice] = useState<Notice>(null);

  const reload = useCallback(async () => {
    setBusy({ kind: "load" });
    try {
      setRows(sortDomains(await fetchMyDomains()));
      setNotice(null);
    } catch (e) {
      setNotice({ tone: "error", text: messageFor(e, "Failed to load domains.") });
    } finally {
      setBusy({ kind: "idle" });
    }
  }, []);

  useEffect(() => {
    if (canManageBusinessSettings) {
      void reload();
    }
  }, [canManageBusinessSettings, reload]);

  const handleAdd = async (domain: string) => {
    setBusy({ kind: "save" });
    try {
      const created = await addMyDomain(domain);
      setRows((previous) => sortDomains([...previous, created]));
      setNotice({ tone: "info", text: `Added ${created.domain}.` });
    } catch (e) {
      setNotice({ tone: "error", text: messageFor(e, "Could not add domain.") });
    } finally {
      setBusy({ kind: "idle" });
    }
  };

  const handleMakePrimary = async (row: DomainRecord) => {
    setBusy({ kind: "row", id: row.id });
    try {
      await setMyPrimaryDomain(row.id);
      await reload();
      setNotice({ tone: "info", text: `Primary changed to ${row.domain}.` });
    } catch (e) {
      setNotice({ tone: "error", text: messageFor(e, "Could not promote domain.") });
      setBusy({ kind: "idle" });
    }
  };

  const handleDelete = async (row: DomainRecord) => {
    setBusy({ kind: "row", id: row.id });
    try {
      await deleteMyDomain(row.id);
      setRows((previous) => previous.filter((r) => r.id !== row.id));
      setNotice({ tone: "info", text: `Deleted ${row.domain}.` });
    } catch (e) {
      setNotice({ tone: "error", text: messageFor(e, "Could not delete domain.") });
    } finally {
      setBusy({ kind: "idle" });
    }
  };

  if (!canManageBusinessSettings) {
    return <LockedNotice />;
  }

  const rowBusyId = busy.kind === "row" ? busy.id : null;

  return (
    <section className="max-w-2xl space-y-5">
      <header>
        <h2 className="text-xl font-semibold">Domains</h2>
        <p className="text-sm text-muted-foreground">
          Map any custom domain (e.g. <code>shop.acme.com</code>) or your platform subdomain to this
          tenant. Storefront resolution uses the hostname a visitor types, so every active mapping is a
          valid entry point.
        </p>
      </header>

      <AddDomainForm busy={busy.kind === "save"} onSubmit={handleAdd} />

      {busy.kind === "load" && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading domains…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No domains yet. Add one above.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <DomainRow
              key={row.id}
              row={row}
              busy={rowBusyId === row.id}
              onMakePrimary={handleMakePrimary}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}

      {notice ? (
        <p
          className={
            notice.tone === "error"
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}
