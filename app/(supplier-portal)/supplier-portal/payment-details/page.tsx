"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalPaymentDetails,
  patchSupplierPortalPaymentDetails,
  type SupplierPortalPaymentDetails,
} from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";

export default function SupplierPortalPaymentDetailsPage() {
  const router = useRouter();
  const [details, setDetails] = useState<SupplierPortalPaymentDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [businessLegalName, setBusinessLegalName] = useState("");
  const [paybill, setPaybill] = useState("");
  const [tillNumber, setTillNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [mobileMoney, setMobileMoney] = useState("");
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState("");
  const [taxPin, setTaxPin] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void fetchSupplierPortalPaymentDetails()
      .then((row) => {
        setDetails(row);
        setBusinessLegalName(row.businessLegalName ?? "");
        setPaybill(row.paybill ?? "");
        setTillNumber(row.tillNumber ?? "");
        setBankName(row.bankName ?? "");
        setBankBranch(row.bankBranch ?? "");
        setBankAccountNumber(row.bankAccountNumber ?? "");
        setBankAccountName(row.bankAccountName ?? "");
        setMobileMoney(row.mobileMoney ?? "");
        setPreferredPaymentMethod(row.preferredPaymentMethod ?? "");
        setTaxPin(row.taxPin ?? "");
        setVatNumber(row.vatNumber ?? "");
        setContactPerson(row.contactPerson ?? "");
        setPhone(row.phone ?? "");
        setEmail(row.email ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load payment details"));
  }, [router]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const updated = await patchSupplierPortalPaymentDetails({
        businessLegalName,
        paybill,
        tillNumber,
        bankName,
        bankBranch,
        bankAccountNumber,
        bankAccountName,
        mobileMoney,
        preferredPaymentMethod,
        taxPin,
        vatNumber,
        contactPerson,
        phone,
        email,
      });
      setDetails(updated);
      setSuccess("Payment details saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const editable = details?.editable !== false;

  return (
    <SupplierPortalShell>
      <form className="space-y-6" onSubmit={onSave}>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Payment details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              How connected shops should pay you.
            </p>
          </div>
          {editable ? (
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          ) : null}
        </header>

        {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
        {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}
        {details && !details.editable ? (
          <AuthAlert variant="error">Payment detail edits are disabled by the platform.</AuthAlert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" value={businessLegalName} onChange={setBusinessLegalName} disabled={!editable} />
          <Field label="Preferred method" value={preferredPaymentMethod} onChange={setPreferredPaymentMethod} disabled={!editable} />
          <Field label="Paybill" value={paybill} onChange={setPaybill} disabled={!editable} />
          <Field label="Till" value={tillNumber} onChange={setTillNumber} disabled={!editable} />
          <Field label="Mobile money" value={mobileMoney} onChange={setMobileMoney} disabled={!editable} />
          <Field label="Bank" value={bankName} onChange={setBankName} disabled={!editable} />
          <Field label="Bank branch" value={bankBranch} onChange={setBankBranch} disabled={!editable} />
          <Field label="Account number" value={bankAccountNumber} onChange={setBankAccountNumber} disabled={!editable} />
          <Field label="Account name" value={bankAccountName} onChange={setBankAccountName} disabled={!editable} />
          <Field label="Tax PIN" value={taxPin} onChange={setTaxPin} disabled={!editable} />
          <Field label="VAT number" value={vatNumber} onChange={setVatNumber} disabled={!editable} />
          <Field label="Contact person" value={contactPerson} onChange={setContactPerson} disabled={!editable} />
          <Field label="Phone" value={phone} onChange={setPhone} disabled={!editable} />
          <Field label="Email" value={email} onChange={setEmail} disabled={!editable} />
        </div>
      </form>
    </SupplierPortalShell>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </label>
  );
}
