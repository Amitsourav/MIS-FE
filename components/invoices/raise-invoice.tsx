"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Eye, FilePlus2, Landmark, Loader2, X } from "lucide-react";
import { previewInvoice, useBillingProfile, useInvoiceEligible, useRaiseInvoice } from "@/lib/queries";
import { errorMessage, statusOf } from "@/lib/api";
import { ymd } from "@/lib/filters";
import { gstPct, inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BillingSetup } from "./billing-setup";
import type { BillingProfile, EligibleStudent } from "@/lib/types";

const MAX_NUMBER = 60;

// Preview totals in paise (integers) so they can't drift. The server's are final.
function toPaise(x: string): number {
  return Math.round(Number(x) * 100);
}
function paiseToMoney(p: number): string {
  return (p / 100).toFixed(2);
}
/** GST on a non-negative paise amount, rounded half up to the paisa. */
function gstPaise(paise: number, rate: string): number {
  const bp = Math.round(Number(rate) * 100); // "18.00" -> 1800 (hundredths of a percent)
  return Math.floor((paise * bp + 5000) / 10000);
}

function newInvoiceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ ((Math.random() * 16) >> (Number(c) / 4))).toString(16),
  );
}

/** "Raise invoice (5)" next to Export CSV. Partners on FundMyCampus only. */
export function RaiseInvoiceButton() {
  const eligible = useInvoiceEligible();
  const profile = useBillingProfile();
  const [open, setOpen] = useState<null | "invoice" | "billing">(null);
  const count = eligible.data?.items.length ?? 0;
  const disabled = !eligible.data || count === 0;
  const tip = eligible.isError
    ? "Couldn't load the students to invoice"
    : eligible.data && count === 0
      ? "Nothing left to invoice"
      : undefined;

  return (
    <>
      {/* Set up once, change any time. */}
      {profile.data !== undefined && (
        <Button size="sm" variant="ghost" onClick={() => setOpen("billing")} className="text-muted-foreground">
          <Landmark className="h-4 w-4" />
          {profile.data ? "Billing details" : "Set up billing"}
        </Button>
      )}
      {/* A disabled button gets no hover, so the tooltip sits on a wrapper. */}
      <span title={tip} className="inline-flex">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => setOpen("invoice")}
          className="border-blue-200 bg-blue-50 text-blue-700 shadow-sm hover:bg-blue-100 hover:text-blue-800"
        >
          {eligible.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
          Raise invoice{count > 0 ? ` (${count})` : ""}
        </Button>
      </span>
      {open === "billing" && profile.data !== undefined && (
        <Sheet
          title="Billing details"
          subtitle="Printed on every invoice you raise to FundMyCampus."
          onClose={() => setOpen(null)}
        >
          <div className="px-5 py-4">
            <BillingSetup
              initial={profile.data}
              onSaved={() => {
                toast.success("Billing details saved");
                setOpen(null);
              }}
              onCancel={() => setOpen(null)}
            />
          </div>
        </Sheet>
      )}
      {open === "invoice" && eligible.data && (
        <RaiseInvoiceDialog
          items={eligible.data.items}
          gstRate={eligible.data.gst_rate}
          profile={profile.data}
          profileLoading={profile.isLoading}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

/** Full-screen on a phone, a centred box on desktop. */
function Sheet({
  title,
  subtitle,
  onClose,
  busy = false,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(o) => {
        // Don't close mid-send: the result still has to land.
        if (!o && !busy) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-background shadow-xl",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border",
          )}
        >
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <FilePlus2 className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="font-semibold leading-tight">{title}</DialogPrimitive.Title>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close" disabled={busy}>
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function RaiseInvoiceDialog({
  items,
  gstRate,
  profile,
  profileLoading,
  onClose,
}: {
  items: EligibleStudent[];
  gstRate: string;
  profile: BillingProfile | null | undefined;
  profileLoading: boolean;
  onClose: () => void;
}) {
  const raise = useRaiseInvoice();
  // First time: the one-time billing setup, then straight on to the invoice.
  const [editing, setEditing] = useState(false);
  const needsSetup = profile === null || editing;

  return (
    <Sheet
      title={needsSetup ? "Set up billing (one time)" : "Raise invoice"}
      subtitle={
        needsSetup
          ? "We make your invoice from these details every time."
          : "We make the invoice from your billing details and send it to FundMyCampus."
      }
      onClose={onClose}
      busy={raise.isPending}
    >
      {profileLoading || profile === undefined ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : needsSetup ? (
        <div className="px-5 py-4">
          <BillingSetup
            initial={profile}
            onSaved={() => setEditing(false)}
            onCancel={profile ? () => setEditing(false) : onClose}
          />
        </div>
      ) : (
        <InvoiceStep
          items={items}
          gstRate={gstRate}
          profile={profile}
          raise={raise}
          onEditBilling={() => setEditing(true)}
          onDone={onClose}
        />
      )}
    </Sheet>
  );
}

function InvoiceStep({
  items,
  gstRate,
  profile,
  raise,
  onEditBilling,
  onDone,
}: {
  items: EligibleStudent[];
  gstRate: string;
  profile: BillingProfile;
  raise: ReturnType<typeof useRaiseInvoice>;
  onEditBilling: () => void;
  onDone: () => void;
}) {
  // One id per dialog, reused on every retry, so the CRM stores the invoice once.
  const [clientInvoiceId] = useState(newInvoiceId);
  const today = ymd(new Date());

  const [ticked, setTicked] = useState<Set<string>>(() => new Set(items.map((s) => s.lead_bank_id)));
  const [number, setNumber] = useState(profile.next_invoice_number);
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [numberError, setNumberError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  // Blocks a double click before isPending re-renders the button disabled.
  const sending = useRef(false);

  const allRef = useRef<HTMLInputElement>(null);
  const allTicked = ticked.size === items.length;
  const noneTicked = ticked.size === 0;
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = !allTicked && !noneTicked;
  }, [allTicked, noneTicked]);

  const withGst = profile.gst_registered;
  const totals = useMemo(() => {
    const payouts = items
      .filter((s) => ticked.has(s.lead_bank_id))
      .reduce((sum, s) => sum + toPaise(s.remaining), 0);
    const gst = withGst ? gstPaise(payouts, gstRate) : 0;
    const half = Math.floor((gst + 1) / 2); // CGST takes the odd paisa, as the PDF does
    return {
      payouts: paiseToMoney(payouts),
      gst: paiseToMoney(gst),
      cgst: paiseToMoney(half),
      sgst: paiseToMoney(gst - half),
      total: paiseToMoney(payouts + gst),
    };
  }, [items, ticked, gstRate, withGst]);

  function toggle(id: string) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const trimmed = number.trim();
  const canSend = !noneTicked && trimmed.length > 0 && !!invoiceDate && invoiceDate <= today && !raise.isPending;

  function form(): FormData {
    const fd = new FormData();
    fd.append("invoice_number", trimmed);
    fd.append("invoice_date", invoiceDate);
    fd.append(
      "lines",
      JSON.stringify(items.filter((s) => ticked.has(s.lead_bank_id)).map((s) => ({ lead_bank_id: s.lead_bank_id }))),
    );
    return fd;
  }

  async function preview() {
    if (noneTicked || previewing) return;
    // Open the tab now (inside the click) so a popup blocker allows it.
    const tab = window.open("", "_blank");
    setPreviewing(true);
    setFormError(null);
    try {
      const blob = await previewInvoice(form());
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      setFormError(errorMessage(err, "Couldn't make the preview. Try again."));
    } finally {
      setPreviewing(false);
    }
  }

  function send() {
    if (!canSend || sending.current) return;
    sending.current = true;
    setFormError(null);
    setNumberError(null);
    const fd = form();
    fd.append("client_invoice_id", clientInvoiceId);
    raise.mutate(fd, {
      onSettled: () => {
        sending.current = false;
      },
      onSuccess: (inv) => {
        toast.success(`Invoice ${inv.invoice_number} sent to FundMyCampus for ${inr(inv.amount)}`);
        onDone();
      },
      onError: (err) => {
        const status = statusOf(err);
        if (status === 409) setNumberError(errorMessage(err));
        else if (status === 429) setFormError("Too many invoices, wait a minute.");
        else if (status === 503) setFormError(errorMessage(err, "Couldn't send the invoice right now, try again."));
        else setFormError(errorMessage(err, "Couldn't send the invoice. Try again."));
      },
    });
  }

  return (
    <>
      {/* Scrolls; the totals and Send below stay put. */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border bg-slate-50 px-3 py-2.5 text-sm">
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{profile.legal_name}</p>
            <p className="text-xs text-muted-foreground">
              {withGst ? `GSTIN ${profile.gstin} · with ${gstPct(gstRate)} GST` : `PAN ${profile.pan} · without GST`}
              {" · "}
              {profile.state_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onEditBilling}
            className="shrink-0 text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Change details
          </button>
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                ref={allRef}
                type="checkbox"
                checked={allTicked}
                onChange={() => setTicked(allTicked ? new Set() : new Set(items.map((s) => s.lead_bank_id)))}
                className="h-4 w-4 accent-blue-600"
              />
              Select all
            </label>
            <span className="text-xs text-muted-foreground">
              {ticked.size} of {items.length} students · amounts without GST
            </span>
          </div>
          <ul className="divide-y rounded-lg border">
            {items.map((s) => (
              <li key={s.lead_bank_id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={ticked.has(s.lead_bank_id)}
                    onChange={() => toggle(s.lead_bank_id)}
                    className="h-4 w-4 shrink-0 accent-blue-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {s.lead_no != null && (
                        <span className="mr-1.5 font-semibold tabular-nums text-primary">#{s.lead_no}</span>
                      )}
                      <span className="font-medium text-slate-900">{s.full_name ?? "—"}</span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{s.bank_name ?? "—"}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{inr(s.remaining)}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="invoice-number">Invoice number</Label>
            <Input
              id="invoice-number"
              value={number}
              maxLength={MAX_NUMBER}
              onChange={(e) => {
                setNumber(e.target.value);
                setNumberError(null);
              }}
              aria-invalid={!!numberError}
              className={cn(numberError && "border-destructive focus-visible:ring-destructive")}
              autoComplete="off"
            />
            {numberError ? (
              <p className="text-xs text-destructive">{numberError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Filled in for you; change it if you need to</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoice-date">Invoice date</Label>
            <Input
              id="invoice-date"
              type="date"
              value={invoiceDate}
              max={today}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
        </section>
      </div>

      <div className="space-y-3 border-t bg-slate-50/80 px-5 py-4 sm:rounded-b-xl">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Payouts (without GST)</dt>
            <dd className="tabular-nums">{inr(totals.payouts)}</dd>
          </div>
          {!withGst ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">GST (not registered)</dt>
              <dd className="tabular-nums">{inr("0")}</dd>
            </div>
          ) : profile.tax_split === "cgst_sgst" ? (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">CGST {Number(gstRate) / 2}%</dt>
                <dd className="tabular-nums">{inr(totals.cgst)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">SGST {Number(gstRate) / 2}%</dt>
                <dd className="tabular-nums">{inr(totals.sgst)}</dd>
              </div>
            </>
          ) : (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">IGST {gstPct(gstRate)}</dt>
              <dd className="tabular-nums">{inr(totals.gst)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t pt-1.5 font-semibold">
            <dt>Invoice total</dt>
            <dd className="tabular-nums">{inr(totals.total)}</dd>
          </div>
        </dl>
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
            {formError}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
          <Button variant="outline" disabled={noneTicked || previewing} onClick={preview}>
            {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Preview invoice
          </Button>
          <Button disabled={!canSend} onClick={send}>
            {raise.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send invoice for {inr(totals.total)}
          </Button>
        </div>
      </div>
    </>
  );
}
