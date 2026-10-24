"use client";

// Two-option switch: "With GST" | "Without GST" (labels can be changed).
export function GstSwitch({
  value,
  onChange,
  withLabel = "With GST",
  withoutLabel = "Without GST",
  disabled = false,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  withLabel?: string;
  withoutLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label="GST" className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs font-medium">
      {[
        { on: true, label: withLabel },
        { on: false, label: withoutLabel },
      ].map((o) => (
        <button
          key={o.label}
          type="button"
          disabled={disabled}
          aria-pressed={value === o.on}
          onClick={() => onChange(o.on)}
          className={
            value === o.on
              ? "rounded-md bg-white px-2.5 py-1 text-slate-900 shadow-sm"
              : "rounded-md px-2.5 py-1 text-muted-foreground hover:text-slate-900"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
