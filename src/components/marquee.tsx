const DEFAULT_ITEMS = [
  "One of one, no restocks",
  "Kantamanto Market · Accra",
  "Washed & checked",
  "Secondhand, first love",
  "New finds every week",
];

export function Marquee({
  items = DEFAULT_ITEMS,
  className = "",
}: {
  items?: string[];
  className?: string;
}) {
  // 4 copies keep the -50% loop seamless even on ultra-wide screens.
  const row = [...items, ...items, ...items, ...items];
  return (
    <div
      aria-hidden
      className={`marquee-mask overflow-hidden border-y border-border bg-surface ${className}`}
    >
      <div className="flex w-max animate-marquee py-3.5">
        {row.map((item, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center whitespace-nowrap px-6 text-[11px] font-semibold tracking-[0.2em] text-mocha uppercase"
          >
            <span className="pr-6">{item}</span>
            <span className="text-clay">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
