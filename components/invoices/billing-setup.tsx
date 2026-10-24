"use client";

import { useState } from "react";
import { BadgeCheck, FileText, Loader2 } from "lucide-react";
import { useSaveBillingProfile } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { GST_STATES } from "@/lib/gst-states";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BillingProfile, BillingProfileIn } from "@/lib/types";

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const EMPTY: BillingProfileIn = {
  gst_registered: true,
  legal_name: "",
  gstin: "",
  pan: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state_code: "",
  pincode: "",
  email: "",
  phone: "",
  bank_account_name: "",
  bank_account_number: "",
  bank_ifsc: "",
  bank_name: "",
  bank_branch: "",
  invoice_prefix: "",
  signatory_name: "",
};

/** Indian financial year (April to March) as "26-27". */
function financialYear(d = new Date()): string {
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const two = (n: number) => String(n % 100).padStart(2, "0");
  return `${two(start)}-${two(start + 1)}`;
}

/** First letters of the name, for the invoice number prefix: "Altera Edu" -> "AE". */
function prefixFrom(name: string): string {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return (words.length === 1 ? words[0].slice(0, 3) : words.map((w) => w[0]).join("")).slice(0, 6);
}

/**
 * One-time billing setup, also used to change the details later.
 * Step 1: with GST or without GST. Step 2: the details that kind of invoice needs.
 * Every field the invoice needs is required; the server checks GSTIN, PAN, IFSC etc.
 */
export function BillingSetup({
  initial,
  onSaved,
  onCancel,
}: {
  initial: BillingProfile | null;
  onSaved: (p: BillingProfile) => void;
  onCancel?: () => void;
}) {
  const save = useSaveBillingProfile();
  const [step, setStep] = useState<"choose" | "details">(initial ? "details" : "choose");
  const [f, setF] = useState<BillingProfileIn>(() =>
    initial
      ? {
          ...EMPTY,
          ...initial,
          gstin: initial.gstin ?? "",
          address_line2: initial.address_line2 ?? "",
          bank_branch: initial.bank_branch ?? "",
          signatory_name: initial.signatory_name ?? "",
        }
      : EMPTY,
  );
  const [confirmAccount, setConfirmAccount] = useState(initial?.bank_account_number ?? "");
  const [prefixTouched, setPrefixTouched] = useState(!!initial);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof BillingProfileIn>(key: K, value: BillingProfileIn[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function setGstin(raw: string) {
    const g = raw.toUpperCase().replace(/\s/g, "").slice(0, 15);
    setF((prev) => ({
      ...prev,
      gstin: g,
      // A GSTIN carries the PAN (characters 3-12) and the state (1-2).
      ...(GSTIN_RE.test(g) ? { pan: g.slice(2, 12), state_code: g.slice(0, 2) } : {}),
    }));
    setError(null);
  }

  function choose(registered: boolean) {
    setF((prev) => ({ ...prev, gst_registered: registered, gstin: registered ? prev.gstin : "" }));
    setStep("details");
  }

  const reg = f.gst_registered;
  const gstinValid = GSTIN_RE.test(f.gstin ?? "");
  const accountMismatch = confirmAccount !== "" && confirmAccount !== f.bank_account_number;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (accountMismatch || confirmAccount === "") {
      setError("The two bank account numbers don't match.");
      return;
    }
    save.mutate(
      {
        ...f,
        gstin: reg ? f.gstin : null,
        address_line2: f.address_line2 || null,
        bank_branch: f.bank_branch || null,
        signatory_name: f.signatory_name || null,
      },
      {
        onSuccess: onSaved,
        onError: (err) => setError(errorMessage(err, "Couldn't save your billing details. Try again.")),
      },
    );
  }

  if (step === "choose") {
    return (
      <div className="space-y-4">
        <div>
          <p className="font-medium">How do you bill FundMyCampus?</p>
          <p className="text-sm text-muted-foreground">
            A one-time setup. Your invoices are then made for you every time.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceCard
            icon={<BadgeCheck className="h-5 w-5" />}
            title="With GST"
            body="I'm registered under GST. Tax invoice with 18% GST, using my GSTIN."
            onClick={() => choose(true)}
          />
          <ChoiceCard
            icon={<FileText className="h-5 w-5" />}
            title="Without GST"
            body="I'm not registered under GST. Invoice without GST, using my PAN."
            onClick={() => choose(false)}
          />
        </div>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900 ring-1 ring-blue-100">
        <span>
          {reg ? "With GST: tax invoice with 18% GST" : "Without GST: invoice with no GST"}
        </span>
        <button
          type="button"
          className="font-medium text-primary underline-offset-2 hover:underline"
          onClick={() => setStep("choose")}
        >
          Change
        </button>
      </div>

      <Section title={reg ? "Business" : "You"}>
        <Field label={reg ? "Legal name (as on GST certificate)" : "Name (person or business)"} wide>
          <Input
            required
            maxLength={200}
            value={f.legal_name}
            onChange={(e) => {
              set("legal_name", e.target.value);
              if (!prefixTouched) set("invoice_prefix", prefixFrom(e.target.value));
            }}
          />
        </Field>
        {reg && (
          <Field label="GSTIN" hint={gstinValid ? "PAN and state filled in from your GSTIN" : "15 characters, e.g. 07ABCDE1234F1Z5"}>
            <Input required value={f.gstin ?? ""} onChange={(e) => setGstin(e.target.value)} className="uppercase" />
          </Field>
        )}
        <Field label="PAN" hint={reg ? undefined : "Needed for TDS, e.g. ABCDE1234F"}>
          <Input
            required
            maxLength={10}
            value={f.pan}
            readOnly={reg && gstinValid}
            onChange={(e) => set("pan", e.target.value.toUpperCase().replace(/\s/g, ""))}
            className={cn("uppercase", reg && gstinValid && "bg-muted")}
          />
        </Field>
      </Section>

      <Section title="Address">
        <Field label="Address line 1" wide>
          <Input required maxLength={200} value={f.address_line1} onChange={(e) => set("address_line1", e.target.value)} />
        </Field>
        <Field label="Address line 2 (optional)" wide>
          <Input maxLength={200} value={f.address_line2 ?? ""} onChange={(e) => set("address_line2", e.target.value)} />
        </Field>
        <Field label="City">
          <Input required maxLength={100} value={f.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="PIN code">
          <Input
            required
            inputMode="numeric"
            maxLength={6}
            value={f.pincode}
            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <Field label="State" wide hint={reg && gstinValid ? "From your GSTIN" : undefined}>
          <select
            required
            value={f.state_code}
            disabled={reg && gstinValid}
            onChange={(e) => set("state_code", e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:bg-muted"
          >
            <option value="">Pick your state</option>
            {GST_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Contact">
        <Field label="Email for invoices">
          <Input required type="email" maxLength={200} value={f.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Mobile number">
          <Input
            required
            inputMode="tel"
            maxLength={14}
            value={f.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="98765 43210"
          />
        </Field>
      </Section>

      <Section title="Bank account (FundMyCampus pays you here)">
        <Field label="Account holder name" wide>
          <Input required maxLength={200} value={f.bank_account_name} onChange={(e) => set("bank_account_name", e.target.value)} />
        </Field>
        <Field label="Account number">
          <Input
            required
            inputMode="numeric"
            maxLength={18}
            value={f.bank_account_number}
            onChange={(e) => set("bank_account_number", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <Field label="Confirm account number" error={accountMismatch ? "Doesn't match" : undefined}>
          <Input
            required
            inputMode="numeric"
            maxLength={18}
            value={confirmAccount}
            onChange={(e) => {
              setConfirmAccount(e.target.value.replace(/\D/g, ""));
              setError(null);
            }}
            onPaste={(e) => e.preventDefault()}
          />
        </Field>
        <Field label="IFSC">
          <Input
            required
            maxLength={11}
            value={f.bank_ifsc}
            onChange={(e) => set("bank_ifsc", e.target.value.toUpperCase().replace(/\s/g, ""))}
            className="uppercase"
            placeholder="HDFC0001234"
          />
        </Field>
        <Field label="Bank name">
          <Input required maxLength={100} value={f.bank_name} onChange={(e) => set("bank_name", e.target.value)} />
        </Field>
        <Field label="Branch (optional)" wide>
          <Input maxLength={100} value={f.bank_branch ?? ""} onChange={(e) => set("bank_branch", e.target.value)} />
        </Field>
      </Section>

      <Section title="On your invoices">
        <Field
          label="Invoice number prefix"
          hint={f.invoice_prefix ? `Numbers look like ${f.invoice_prefix}/${financialYear()}/001` : "e.g. ALT"}
        >
          <Input
            required
            maxLength={12}
            value={f.invoice_prefix}
            onChange={(e) => {
              setPrefixTouched(true);
              set("invoice_prefix", e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""));
            }}
            className="uppercase"
          />
        </Field>
        <Field label="Signed by (optional)" hint="Name under the signature line">
          <Input maxLength={100} value={f.signatory_name ?? ""} onChange={(e) => set("signatory_name", e.target.value)} />
        </Field>
      </Section>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={save.isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save billing details
        </Button>
      </div>
    </form>
  );
}

function ChoiceCard({
  icon,
  title,
  body,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
        {icon}
      </span>
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">{body}</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-semibold text-slate-900">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  hint,
  error,
  wide = false,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", wide && "sm:col-span-2")}>
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
