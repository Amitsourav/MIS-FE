import { cn } from "@/lib/utils";
import { GRADE_BADGE_CLASSES } from "@/lib/tokens";
import type { Grade } from "@/lib/types";

export function GradeBadge({
  grade,
  className,
  size = "default",
}: {
  grade: Grade;
  className?: string;
  size?: "default" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-bold",
        size === "lg" ? "h-9 w-9 text-lg" : "h-6 px-2 text-xs",
        GRADE_BADGE_CLASSES[grade],
        className,
      )}
    >
      {grade}
    </span>
  );
}
