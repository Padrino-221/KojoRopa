"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  className?: string;
  "aria-label"?: string;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function CalendarMonth({
  year,
  month,
  selectedFrom,
  selectedTo,
  onSelect,
}: {
  year: number;
  month: number;
  selectedFrom: string | null;
  selectedTo: string | null;
  onSelect: (dateStr: string) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toDateString(new Date());

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toDateString(new Date(year, month, d)));
  }

  const isInRange = (dateStr: string) => {
    if (!selectedFrom || !selectedTo) return false;
    return dateStr >= selectedFrom && dateStr <= selectedTo;
  };

  return (
    <div className="select-none">
      <div className="mb-2 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-taupe">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((dateStr, i) => {
          if (!dateStr) {
            return <div key={`empty-${i}`} className="h-8" />;
          }
          const isSelected = dateStr === selectedFrom || dateStr === selectedTo;
          const inRange = isInRange(dateStr);
          const isToday = dateStr === today;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelect(dateStr)}
              className={[
                "relative h-8 w-full rounded-lg text-xs font-medium transition-colors",
                isSelected
                  ? "bg-clay text-white"
                  : inRange
                    ? "bg-clay/10 text-clay"
                    : isToday
                      ? "bg-cream text-espresso font-semibold"
                      : "text-espresso hover:bg-cream",
              ].join(" ")}
            >
              {new Date(dateStr + "T00:00:00").getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
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
  const [selecting, setSelecting] = useState<"from" | "to">("from");
  const containerRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

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

  const handleDaySelect = (dateStr: string) => {
    if (selecting === "from") {
      setLocalFrom(dateStr);
      if (localTo && dateStr > localTo) {
        setLocalTo("");
      }
      setSelecting("to");
    } else {
      if (dateStr < localFrom) {
        setLocalTo(localFrom);
        setLocalFrom(dateStr);
      } else {
        setLocalTo(dateStr);
      }
      setSelecting("from");
    }
  };

  const apply = () => {
    onChange(localFrom, localTo);
    setOpen(false);
  };

  const clear = () => {
    setLocalFrom("");
    setLocalTo("");
    onChange("", "");
    setSelecting("from");
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const t = new Date();
    setViewMonth(t.getMonth());
    setViewYear(t.getFullYear());
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
          {/* selection indicator */}
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className={`rounded-md px-2 py-1 ${selecting === "from" ? "bg-clay/10 font-medium text-clay" : "text-taupe"}`}>
              {localFrom ? formatDateDisplay(localFrom) : "From"}
            </span>
            <span className="text-taupe">→</span>
            <span className={`rounded-md px-2 py-1 ${selecting === "to" ? "bg-clay/10 font-medium text-clay" : "text-taupe"}`}>
              {localTo ? formatDateDisplay(localTo) : "To"}
            </span>
          </div>

          {/* month nav */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg p-1.5 text-taupe transition-colors hover:bg-cream hover:text-espresso"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goToday}
              className="text-xs font-medium text-espresso hover:text-clay"
            >
              {MONTHS[viewMonth]} {viewYear}
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg p-1.5 text-taupe transition-colors hover:bg-cream hover:text-espresso"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <CalendarMonth
            year={viewYear}
            month={viewMonth}
            selectedFrom={localFrom || null}
            selectedTo={localTo || null}
            onSelect={handleDaySelect}
          />

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
