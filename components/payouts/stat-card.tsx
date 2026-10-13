import { cn } from "@/lib/utils";

// Colour themes for the Payout page's cards. Each is a full class string so
// Tailwind keeps them at build time.
export const TONES = {
  blue: {
    chip: "bg-blue-50 text-blue-600 ring-blue-100",
    bar: "from-blue-600 to-sky-500",
    glow: "bg-blue-400/10",
    value: "text-slate-900",
  },
  emerald: {
    chip: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    bar: "from-emerald-500 to-teal-400",
    glow: "bg-emerald-400/10",
    value: "text-emerald-700",
  },
  sky: {
    chip: "bg-sky-50 text-sky-600 ring-sky-100",
    bar: "from-sky-500 to-cyan-400",
    glow: "bg-sky-400/10",
    value: "text-slate-900",
  },
  amber: {
    chip: "bg-amber-50 text-amber-600 ring-amber-100",
    bar: "from-amber-500 to-orange-400",
    glow: "bg-amber-400/10",
    value: "text-amber-700",
  },
  rose: {
    chip: "bg-rose-50 text-rose-600 ring-rose-100",
    bar: "from-rose-500 to-pink-500",
    glow: "bg-rose-400/10",
    value: "text-rose-600",
  },
  teal: {
    chip: "bg-teal-50 text-teal-600 ring-teal-100",
    bar: "from-teal-500 to-cyan-400",
    glow: "bg-teal-400/10",
    value: "text-slate-900",
  },
  slate: {
    chip: "bg-slate-100 text-slate-600 ring-slate-200",
    bar: "from-slate-400 to-slate-300",
    glow: "bg-slate-400/10",
    value: "text-slate-900",
  },
} as const;

export type Tone = keyof typeof TONES;

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone: Tone;
}) {
  const t = TONES[tone];
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", t.bar)} />
      <div className={cn("pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full", t.glow)} />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1", t.chip)}>
          {icon}
        </span>
      </div>
      <div className={cn("relative mt-2 text-2xl font-bold tabular-nums tracking-tight", t.value)}>
        {value}
      </div>
      {sub && <p className="relative mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// A card section header: coloured icon chip, title and an optional description.
export function SectionTitle({
  icon,
  tone,
  title,
  description,
  right,
}: {
  icon: React.ReactNode;
  tone: Tone;
  title: string;
  description?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
            TONES[tone].chip,
          )}
        >
          {icon}
        </span>
        <div className="space-y-1">
          <h3 className="font-semibold leading-tight tracking-tight">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}
