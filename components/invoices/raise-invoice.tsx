"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { FilePlus2, FileText, Loader2, Upload, X } from "lucide-react";
import { useInvoiceEligible, useRaiseInvoice } from "@/lib/queries";
import { errorMessage, statusOf } from "@/lib/api";
import { ymd } from "@/lib/filters";
import { gstPct, inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EligibleStudent } from "@/lib/types";

const MAX_PDF_BYTES = 4 * 1024 * 1024;
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
  const [open, setOpen] = useState(false);
  const count = eligible.data?.items.length ?? 0;
  const disabled = !eligible.data || count === 0;
  const tip = eligible.isError
    ? "Couldn't load the students to invoice"
    : eligible.data && count === 0
      ? "Nothing left to invoice"
      : undefined;

  return (
    <>
      {/* A disabled button gets no hover, so the tooltip sits on a wrapper. */}
      <span title={tip} className="inline-flex">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="border-blue-200 bg-blue-50 text-blue-700 shadow-sm hover:bg-blue-100 hover:text-blue-800"
        >
          {eligible.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FilePlus2 className="h-4 w-4" />
          )}
          Raise invoice{count > 0 ? ` (${count})` : ""}
        </Button>
      </span>
      {open && eligible.data && (
        <RaiseInvoiceDialog
          items={eligible.data.items}
          gstRate={eligible.data.gst_rate}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function RaiseInvoiceDialog({
  items,
  gstRate,
  onClose,
}: {
  items: EligibleStudent[];
  gstRate: string;
  onClose: () => void;
}) {
  const raise = useRaiseInvoice();
  // One id per dialog, reused on every retry, so the CRM stores the invoice once.
  const [clientInvoiceId] = useState(newInvoiceId);
  const today = ymd(new Date());

  const [ticked, setTicked] = useState<Set<string>>(() => new Set(items.map((s) => s.lead_bank_id)));
  const [number, setNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [numberError, setNumberError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // Blocks a double click before isPending re-renders the button disabled.
  const sending = useRef(false);

  const allRef = useRef<HTMLInputElement>(null);
  const allTicked = ticked.size === items.length;
  const noneTicked = ticked.size === 0;
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = !allTicked && !noneTicked;
  }, [allTicked, noneTicked]);

  const totals = useMemo(() => {
    const payouts = items
      .filter((s) => ticked.has(s.lead_bank_id))
      .reduce((sum, s) => sum + toPaise(s.remaining), 0);
    const gst = gstPaise(payouts, gstRate);
    return {
      payouts: paiseToMoney(payouts),
      gst: paiseToMoney(gst),
      total: paiseToMoney(payouts + gst),
    };
  }, [items, ticked, gstRate]);

  function toggle(id: string) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function pickFile(f: File | undefined) {
    if (!f) return;
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setFileError("Attach your invoice as a PDF.");
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      setFileError("The PDF is larger than 4 MB.");
      return;
    }
    setFileError(null);
    setFile(f);
  }

  const trimmed = number.trim();
  const canSend =
    !noneTicked && trimmed.length > 0 && !!file && !!invoiceDate && invoiceDate <= today && !raise.isPending;

  function send() {
    if (!canSend || !file || sending.current) return;
    sending.current = true;
    setFormError(null);
    setNumberError(null);
    const fd = new FormData();
    fd.append("invoice_number", trimmed);
    fd.append("invoice_date", invoiceDate);
    fd.append(
      "lines",
      JSON.stringify(
        items.filter((s) => ticked.has(s.lead_bank_id)).map((s) => ({ lead_bank_id: s.lead_bank_id })),
      ),
    );
    fd.append("client_invoice_id", clientInvoiceId);
    fd.append("pdf", file);
    raise.mutate(fd, {
      onSettled: () => {
        sending.current = false;
      },
      onSuccess: (inv) => {
        toast.success(`Invoice ${inv.invoice_number} sent to FundMyCampus for ${inr(inv.amount)}`);
        onClose();
      },
      onError: (err) => {
        const status = statusOf(err);
        if (status === 409) setNumberError(errorMessage(err));
        else if (status === 429) setFormError("Too many invoices, wait a minute.");
        else if (status === 503) setFormError("Couldn't send the invoice right now, try again.");
        else setFormError(errorMessage(err, "Couldn't send the invoice. Try again."));
      },
    });
  }

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(o) => {
        // Don't close mid-send: the result still has to land.
        if (!o && !raise.isPending) onClose();
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
              <DialogPrimitive.Title className="font-semibold leading-tight">Raise invoice</DialogPrimitive.Title>
              <p className="text-sm text-muted-foreground">
                Bill FundMyCampus for your payouts + {gstPct(gstRate)} GST.
              </p>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close" disabled={raise.isPending}>
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Scrolls; the totals and Send below stay put. */}
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <input
                    ref={allRef}
                    type="checkbox"
                    checked={allTicked}
                    onChange={() =>
                      setTicked(allTicked ? new Set() : new Set(items.map((s) => s.lead_bank_id)))
                    }
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
                  <p className="text-xs text-muted-foreground">As printed on your invoice</p>
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

            <section className="space-y-1.5">
              <Label>Invoice PDF</Label>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = ""; // picking the same file again still fires
                }}
              />
              {file ? (
                <div className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-2.5">
                  <FileText className="h-5 w-5 shrink-0 text-blue-600" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="shrink-0 text-sm font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground hover:border-blue-400 hover:text-blue-700"
                >
                  <Upload className="h-4 w-4" />
                  Attach your invoice PDF (max 4 MB)
                </button>
              )}
              {fileError && <p className="text-xs text-destructive">{fileError}</p>}
            </section>
          </div>

          <div className="space-y-3 border-t bg-slate-50/80 px-5 py-4 sm:rounded-b-xl">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Payouts (without GST)</dt>
                <dd className="tabular-nums">{inr(totals.payouts)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">GST {gstPct(gstRate)}</dt>
                <dd className="tabular-nums">{inr(totals.gst)}</dd>
              </div>
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
            <Button className="w-full" disabled={!canSend} onClick={send}>
              {raise.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Raise invoice for {inr(totals.total)}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
