"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DATE_PRESETS, defaultRange, ymd } from "@/lib/filters";
import { date as fmt } from "@/lib/format";
import { subDays } from "date-fns";

export function DateRangePicker({
  from,
  to,
  onChange,
  allTime = false,
  onAllTime,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  allTime?: boolean;
  // When provided, an "All time" option is shown that drops from/to entirely.
  onAllTime?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  function applyPreset(days: number) {
    const r = defaultRange(days);
    onChange(r);
    setOpen(false);
  }

  function applyAllTime() {
    onAllTime?.();
    setOpen(false);
  }

  function applyCustom() {
    if (localFrom && localTo) {
      onChange({ from: localFrom, to: localTo });
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 font-normal">
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline">
            {allTime ? "All time" : `${fmt(from)} – ${fmt(to)}`}
          </span>
          <span className="sm:hidden">{allTime ? "All time" : "Dates"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="flex gap-1.5">
          {DATE_PRESETS.map((p) => {
            const presetFrom = ymd(subDays(new Date(), p.days));
            const active = !allTime && from === presetFrom;
            return (
              <Button
                key={p.label}
                variant={active ? "default" : "outline"}
                size="sm"
                className={cn("flex-1")}
                onClick={() => applyPreset(p.days)}
              >
                {p.label}
              </Button>
            );
          })}
        </div>
        {onAllTime && (
          <Button
            variant={allTime ? "default" : "outline"}
            size="sm"
            className="w-full"
            onClick={applyAllTime}
          >
            All time
          </Button>
        )}
        <div className="space-y-2 border-t pt-3">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">
              From
            </Label>
            <Input
              id="from"
              type="date"
              value={localFrom}
              max={localTo}
              onChange={(e) => setLocalFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">
              To
            </Label>
            <Input
              id="to"
              type="date"
              value={localTo}
              min={localFrom}
              onChange={(e) => setLocalTo(e.target.value)}
            />
          </div>
          <Button size="sm" className="w-full" onClick={applyCustom}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
