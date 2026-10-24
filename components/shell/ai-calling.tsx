"use client";

import { useState } from "react";
import { MessageCircle, Phone, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// The demo partner opens the CRM's AI calling (dialpad) screen. Unset = no screen.
const AI_CALLING_URL = process.env.NEXT_PUBLIC_CRM_AI_CALLING_URL;
// Our team's number for AI Calling enquiries (WhatsApp and phone).
const TEAM_PHONE = process.env.NEXT_PUBLIC_SALES_PHONE || "+917827225354";
const PRICE = "₹4 per minute";

const digits = TEAM_PHONE.replace(/\D/g, "");
const WHATSAPP = `https://wa.me/${digits}?text=${encodeURIComponent(
  "Hi, I'd like to know more about AI Calling for my leads.",
)}`;
const CALL = `tel:+${digits}`;

/** "AI Calling" in the top bar. The demo partner opens the real screen; every
 * other partner gets a box to contact our team (WhatsApp or call). */
export function AiCallingNav({ isDemo, className }: { isDemo: boolean; className: string }) {
  const [open, setOpen] = useState(false);
  const label = (
    <>
      <Phone className="mr-1.5 h-4 w-4" />
      AI Calling
    </>
  );

  if (isDemo && AI_CALLING_URL) {
    return (
      <a href={AI_CALLING_URL} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md overflow-hidden p-0">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-6 py-5 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <PhoneCall className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm text-white/80">AI Calling</p>
            <p className="text-2xl font-bold tracking-tight">{PRICE}</p>
            <p className="text-sm text-white/80">AI calls your leads, follows up and updates the stage.</p>
          </div>
          <div className="space-y-4 px-6 pb-6">
            <DialogHeader className="text-left">
              <DialogTitle>Connect to our team</DialogTitle>
              <DialogDescription>
                Our team will set up AI Calling for your leads. Message or call us.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm",
                  "bg-[#25D366] hover:bg-[#1ebe5b]",
                )}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <a
                href={CALL}
                className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-accent"
              >
                <Phone className="h-4 w-4" />
                Call {TEAM_PHONE.startsWith("+91") ? `+91 ${digits.slice(2, 7)} ${digits.slice(7)}` : TEAM_PHONE}
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
