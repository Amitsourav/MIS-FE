"use client";

import { useEffect, useRef, useState } from "react";
import { CloudOff, MessageCircle, RefreshCw, Send } from "lucide-react";
import { useLeadMessages, useSendLeadMessage } from "@/lib/queries";
import { errorMessage, statusOf } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessage, ChatTag } from "@/lib/types";

const MAX = 2000;
const COUNTER_FROM = 1800; // show the counter near the limit

const TAG_LABEL: Record<ChatTag, string> = { counsellor: "@Counsellor", admin: "@Admin" };
const ROLE_LABEL: Record<string, string> = { counsellor: "Counsellor", team: "FundMyCampus team" };

function newMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Fallback for non-secure contexts (e.g. a LAN IP over http).
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16),
  );
}

function sendError(err: unknown): string {
  const status = statusOf(err);
  if (status === 429) return "Too many messages, wait a minute.";
  if (status === 503) return "Chat unavailable, try again.";
  if (status === 404) return "Lead not found.";
  return errorMessage(err, "Couldn't send. Try again.");
}

/**
 * The lead's chat with its counsellor and the FundMyCampus team. Fails on its own:
 * a 503 shows "Chat unavailable" here while the rest of the page renders. A 404
 * means the lead isn't this partner's; the page shows "Lead not found".
 */
export function LeadChat({
  leadId,
  counsellorName,
  onNotFound,
  className,
}: {
  leadId: string;
  counsellorName: string | null;
  onNotFound: () => void;
  className?: string;
}) {
  const thread = useLeadMessages(leadId);
  const send = useSendLeadMessage(leadId);

  const [text, setText] = useState("");
  const [tags, setTags] = useState<Record<ChatTag, boolean>>({ counsellor: true, admin: false });
  // One id per message, kept across retries so a resend posts only once.
  const pendingId = useRef<{ id: string; key: string } | null>(null);

  const notFound = statusOf(thread.error) === 404 || statusOf(send.error) === 404;
  useEffect(() => {
    if (notFound) onNotFound();
  }, [notFound, onNotFound]);

  // Scroll to the newest message on open and when one arrives.
  const scroller = useRef<HTMLDivElement>(null);
  const count = thread.data?.items.length ?? 0;
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  const body = text.trim();
  const selected = (Object.keys(tags) as ChatTag[]).filter((t) => tags[t]);

  function submit() {
    if (!body || send.isPending) return;
    const key = `${body}\u0000${selected.join(",")}`;
    if (pendingId.current?.key !== key) pendingId.current = { id: newMessageId(), key };
    send.mutate(
      { body, tags: selected, client_message_id: pendingId.current.id },
      {
        onSuccess: () => {
          pendingId.current = null;
          setText("");
        },
      },
    );
  }

  const name = thread.data?.counsellor_name ?? counsellorName;
  const unavailable = !thread.data && thread.isError && !notFound;

  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      <header className="flex items-center gap-2.5 border-b bg-gradient-to-r from-slate-900 to-blue-900 px-4 py-3 text-white">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <MessageCircle className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold leading-snug">
          Chat with {name ?? "your counsellor"} &amp; FundMyCampus team
        </h2>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-4 py-4">
        {thread.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="ml-auto h-10 w-2/3" />
            <Skeleton className="h-14 w-3/4" />
          </div>
        ) : unavailable ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
            <CloudOff className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">Chat unavailable, try again</p>
            <Button variant="outline" size="sm" onClick={() => void thread.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : count === 0 ? (
          <p className="flex h-full items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
            Ask about this student. Your counsellor and our team reply here.
          </p>
        ) : (
          thread.data!.items.map((m) => <Bubble key={m.id} m={m} />)
        )}
      </div>

      <form
        className="space-y-2 border-t bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-center gap-2">
          {(Object.keys(TAG_LABEL) as ChatTag[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tags[t]}
              onClick={() => setTags((v) => ({ ...v, [t]: !v[t] }))}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                tags[t]
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-blue-400",
              )}
            >
              {TAG_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            maxLength={MAX}
            rows={2}
            placeholder="Write a message…"
            aria-label="Message"
            className="min-h-[2.75rem] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="icon" disabled={!body || send.isPending} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex min-h-4 items-start justify-between gap-2 text-xs">
          {send.isError ? (
            <p className="text-destructive">{sendError(send.error)}</p>
          ) : (
            <span />
          )}
          {text.length >= COUNTER_FROM && (
            <span className={cn("tabular-nums", text.length >= MAX ? "text-destructive" : "text-muted-foreground")}>
              {text.length}/{MAX}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const mine = m.author_kind === "partner";
  const role = ROLE_LABEL[m.author_role];
  const removed = m.is_hidden || m.body == null;
  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      {!mine && (
        <p className="mb-0.5 flex flex-wrap items-center gap-1.5 px-1 text-xs">
          <span className="font-medium text-slate-800">{m.author_name}</span>
          {role && (
            <span
              className={cn(
                "rounded px-1.5 py-px text-[10px] font-semibold",
                m.author_role === "counsellor" ? "bg-teal-100 text-teal-800" : "bg-sky-100 text-sky-800",
              )}
            >
              {role}
            </span>
          )}
        </p>
      )}
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
          mine ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm border bg-white text-slate-900",
          removed && "italic text-muted-foreground",
          removed && mine && "bg-blue-100 text-blue-900/60",
        )}
      >
        {removed ? "Message removed" : m.body}
      </div>
      <div className={cn("mt-1 flex flex-wrap items-center gap-1.5 px-1", mine && "justify-end")}>
        {mine &&
          m.tags.map((t) => (
            <span key={t} className="rounded-full bg-blue-50 px-1.5 py-px text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200">
              {TAG_LABEL[t] ?? `@${t}`}
            </span>
          ))}
        <time dateTime={m.created_at} className="text-[11px] text-muted-foreground">
          {dateTime(m.created_at)}
        </time>
      </div>
    </div>
  );
}
