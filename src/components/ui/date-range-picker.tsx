"use client";

import { useState, useRef, useEffect } from "react";

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  className?: string;
  "aria-label"?: string;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function DateRangePicker({
  from,
  to,
  onChange,
  className = "",
  "aria-label": ariaLabel,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalFrom(from);
    setLocalTo(to);
  }, [from, to]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const hasRange = from || to;
  const display = hasRange
    ? `${from ? formatDateDisplay(from) : "Start"} — ${to ? formatDateDisplay(to) : "Now"}`
    : "All time";

  const apply = () => {
    onChange(localFrom, localTo);
    setOpen(false);
  };

  const clear = () => {
    setLocalFrom("");
    setLocalTo("");
    onChange("", "");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={["relative", className].join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex items-center gap-2 rounded-xl bg-surface px-3.5 py-2.5 text-sm text-left",
          "ring-1 ring-border transition-colors",
          open ? "ring-2 ring-clay/20" : "",
          !hasRange && "text-taupe",
        ].join(" ")}
        aria-label={ariaLabel}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-taupe" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span className="truncate">{display}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-taupe transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-72 rounded-xl bg-surface p-4 shadow-lg ring-1 ring-border/50 animate-fade-in">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-mocha">
            Date Range
          </p>
          <div className="space-y-3">
            <div>
              <label htmlFor="date-from" className="mb-1 block text-xs text-taupe">
                From
              </label>
              <input
                id="date-from"
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-sm text-espresso focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
              />
            </div>
            <div>
              <label htmlFor="date-to" className="mb-1 block text-xs text-taupe">
                To
              </label>
              <input
                id="date-to"
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-sm text-espresso focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={apply}
              className="flex-1 rounded-lg bg-clay px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-clay-deep"
            >
              Apply
            </button>
            {hasRange && (
              <button
                type="button"
                onClick={clear}
                className="rounded-lg px-3 py-2 text-xs text-taupe transition-colors hover:text-espresso"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { DateRangePicker, type DateRangePickerProps };
