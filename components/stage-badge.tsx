import { cn } from "@/lib/utils";
import { BRAND_SHORT } from "@/lib/tokens";
import type { Brand } from "@/lib/types";

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
