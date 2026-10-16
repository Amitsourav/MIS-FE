/* eslint-disable @next/next/no-img-element -- small static logos; next/image adds nothing here */
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_LABELS } from "@/lib/tokens";
import type { Brand } from "@/lib/types";

// Each company's own logo, from public/brand/. Same height for both; width follows.
const LOGOS: Record<Brand, { src: string; className: string }> = {
  fmc: { src: "/brand/fmc-logo.png", className: "" }, // dark text on transparent: needs a light background
  av: { src: "/brand/av-logo.jpg", className: "rounded-[4px]" }, // white text on its own blue block
};

/**
 * The signed-in company's logo: FundMyCampus or Admitverse. Without a brand
 * (still loading, or a super-admin viewing both) it falls back to the neutral MIS mark.
 */
export function BrandLogo({
  brand,
  className,
  fallbackClassName,
}: {
  brand: Brand | null | undefined;
  className?: string; // sets the height, e.g. "h-7"
  fallbackClassName?: string;
}) {
  if (!brand) {
    return (
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground",
          fallbackClassName,
        )}
      >
        <BarChart3 className="h-4 w-4" />
      </span>
    );
  }
  const logo = LOGOS[brand];
  return (
    <img
      src={logo.src}
      alt={BRAND_LABELS[brand]}
      className={cn("h-7 w-auto shrink-0 object-contain", logo.className, className)}
    />
  );
}
