"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className = "",
  "aria-label": ariaLabel,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder;

  const highlightIdx = open ? (highlighted >= 0 ? highlighted : options.findIndex((o) => o.value === value)) : -1;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !listRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const select = (idx: number) => {
    onChange(options[idx].value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (highlightIdx >= 0) select(highlightIdx);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div className={["relative", className].join(" ")}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-controls={open ? "listbox-options" : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
        className={[
          "flex w-full items-center justify-between gap-2 rounded-xl bg-surface px-3.5 py-2.5 text-sm text-left",
          "ring-1 ring-border transition-colors",
          open ? "ring-2 ring-clay/20" : "",
          !selected && "text-taupe",
        ].join(" ")}
      >
        <span className="truncate">{display}</span>
        <svg
          viewBox="0 0 24 24"
          className={[
            "h-4 w-4 shrink-0 text-taupe transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
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
        <ul
          ref={listRef}
          id="listbox-options"
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-surface py-1 ring-2 ring-border animate-fade-in"
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => select(i)}
              onMouseEnter={() => setHighlighted(i)}
              className={[
                "cursor-pointer px-3.5 py-2 text-sm transition-colors",
                opt.value === value
                  ? "bg-clay/10 font-medium text-clay"
                  : highlightIdx === i
                    ? "bg-cream text-espresso"
                    : "text-espresso hover:bg-cream",
              ].join(" ")}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { CustomSelect, type CustomSelectProps };
