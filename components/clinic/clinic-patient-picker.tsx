"use client";

import { useEffect, useRef, useState } from "react";

import { Field, RX_INK, RX_INPUT, RX_MUTED, RX_RULE, errorText } from "@/components/pharmacy/pharmacy-ui";
import { Button } from "@/components/ui/button";
import { addClinicPatient, searchClinicPatients, type ReceptionPatient } from "@/lib/clinic-api";
import { ageLabel } from "@/lib/clinic-visit";
import { formatPatientNo } from "@/lib/pharmacy-patient-no";
import { cn } from "@/lib/utils";

/** "P-0412 · 34 years · 0722 000 000": what tells two people of one name or one phone apart. */
export function patientDetail(p: Pick<ReceptionPatient, "patientNo" | "ageYears" | "phone">): string {
  return [formatPatientNo(p.patientNo), ageLabel(p.ageYears), p.phone ?? ""].filter(Boolean).join(" · ");
}

/**
 * Reception finds a patient by name, phone or patient number, or adds one. It shows a name,
 * number, age and phone and nothing clinical (ADR 0034, decision 10).
 */
export function ClinicPatientPicker({
  value,
  onChange,
}: {
  value: ReceptionPatient | null;
  onChange: (patient: ReceptionPatient | null) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ReceptionPatient[] | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setResults(null);
      setSearchFailed(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchClinicPatients(text, controller.signal)
        .then((list) => {
          setResults(list);
          setSearchFailed(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setResults(null);
            setSearchFailed(true);
          }
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  if (value) {
    return (
      <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-[2px] border px-3 py-2.5", RX_RULE)}>
        <div className="min-w-0">
          <p className={cn("font-medium", RX_INK)}>{value.name}</p>
          <p className={cn("text-[13px] tabular-nums", RX_MUTED)}>{patientDetail(value) || "No number or phone recorded"}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onChange(null);
            setQ("");
            setTimeout(() => searchRef.current?.focus(), 0);
          }}
        >
          Change
        </Button>
      </div>
    );
  }

  if (adding) {
    const save = async () => {
      if (!name.trim()) {
        setError("Enter the patient's name.");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const created = await addClinicPatient({
          name: name.trim(),
          phone: phone.trim() || null,
          dateOfBirth: dob || null,
        });
        onChange(created);
        setAdding(false);
      } catch (err) {
        setError(errorText(err, "Could not add the patient. Check the connection and try again."));
      } finally {
        setSaving(false);
      }
    };
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" className="sm:col-span-2">
            <input className={RX_INPUT} value={name} onChange={(e) => setName(e.target.value)} maxLength={191} autoFocus />
          </Field>
          <Field label="Phone" hint="A parent's number is fine for a child.">
            <input
              className={RX_INPUT}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={32}
              inputMode="tel"
              autoComplete="off"
            />
          </Field>
          <Field label="Date of birth" hint="Optional. Shown as an age.">
            <input className={RX_INPUT} type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </Field>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Adding…" : "Add patient"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setAdding(false)} disabled={saving}>
            Back to search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Field label="Patient" hint="Name, phone number or patient number.">
        <input
          ref={searchRef}
          className={RX_INPUT}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Wanjiru, 0722…, or P-0412"
          autoComplete="off"
          autoFocus
        />
      </Field>
      {searchFailed ? (
        <p role="alert" className="text-sm text-destructive">
          Could not search just now. Check the connection and try again.
        </p>
      ) : null}
      {results && results.length === 0 ? (
        <p className={cn("text-[13px]", RX_MUTED)}>Nobody matches. Add them as a new patient.</p>
      ) : null}
      {results && results.length > 0 ? (
        <ul className={cn("max-h-64 overflow-y-auto rounded-[2px] border", RX_RULE)}>
          {results.map((p) => (
            <li key={p.id} className={cn("border-b last:border-0", RX_RULE)}>
              <button
                type="button"
                onClick={() => onChange(p)}
                className="flex min-h-11 w-full flex-wrap items-baseline gap-x-3 px-3 py-2 text-left hover:bg-[var(--op-hover,rgba(18,26,22,0.04))] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]"
              >
                <span className={cn("font-medium", RX_INK)}>{p.name}</span>
                <span className={cn("text-[13px] tabular-nums", RX_MUTED)}>{patientDetail(p)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setName(/^[\d\s+()-]+$/.test(q.trim()) || /^p\s*[-#]?\s*\d+$/i.test(q.trim()) ? "" : q.trim());
          setPhone(/^[\d\s+()-]{7,}$/.test(q.trim()) ? q.trim() : "");
          setAdding(true);
        }}
      >
        Add a new patient
      </Button>
    </div>
  );
}
