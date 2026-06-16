import { cn } from "@/lib/utils";
import { STAGE_COLORS, STAGE_LABELS, BRAND_SHORT } from "@/lib/tokens";
import type { CanonicalStage, Brand } from "@/lib/types";

export function StageBadge({ stage, className }: { stage: CanonicalStage; className?: string }) {
  const color = STAGE_COLORS[stage];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{ borderColor: `${color}55`, backgroundColor: `${color}1a`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function BrandChip({ brand, className }: { brand: Brand; className?: string }) {
  const isFmc = brand === "fmc";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-semibold",
        isFmc
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-teal-200 bg-teal-50 text-teal-700",
        className,
      )}
    >
      {BRAND_SHORT[brand]}
    </span>
  );
}
