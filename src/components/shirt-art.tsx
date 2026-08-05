import { useId } from "react";
import type { ShirtArt as ShirtArtConfig } from "@/lib/products";

/* Flat-lay tee silhouette (body + sleeves in one path) */
const TEE_PATH =
  "M150 114Q200 146 250 114C262 102 296 102 310 116L352 144C362 152 362 176 350 184L296 194C298 240 298 280 294 316Q200 336 106 316C102 280 102 240 104 194L50 184C38 176 38 152 48 144L90 116C104 102 138 102 150 114Z";

/* Ribbed collar band that follows the neckline */
const COLLAR_PATH = "M150 114Q200 146 250 114L254 130Q200 162 146 130Z";

/* Raglan sleeve overlays */
const LEFT_SLEEVE =
  "M90 116L48 144C38 152 38 176 50 184L104 194C106 168 104 138 90 116Z";
const RIGHT_SLEEVE =
  "M310 116L352 144C362 152 362 176 350 184L296 194C294 168 296 138 310 116Z";

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function shade(hex: string, amt: number): string {
  const [r, g, b] = parseHex(hex);
  const clamp = (v: number) => Math.min(255, Math.max(0, v));
  return `rgb(${clamp(r + amt)},${clamp(g + amt)},${clamp(b + amt)})`;
}

function isDark(hex: string): boolean {
  const [r, g, b] = parseHex(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export function ShirtArt({
  art,
  className = "",
}: {
  art: ShirtArtConfig;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const base = art.base;
  const accent = art.accent ?? shade(base, -24);
  const accent2 = art.accent2 ?? accent;
  const rib = art.rib ?? shade(base, -46);
  const seam = shade(base, isDark(base) ? 42 : -42);
  const onDark = isDark(base);

  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={`tee-${uid}`}>
          <path d={TEE_PATH} />
        </clipPath>

        {/* soft paper-light from top-left, ink shadow bottom-right */}
        <linearGradient id={`sheen-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#2b231b" stopOpacity="0.12" />
        </linearGradient>

        {/* garment-dye / sunset fade */}
        <linearGradient id={`fade-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={base} />
          <stop offset="0.5" stopColor={base} />
          <stop offset="1" stopColor={accent} />
        </linearGradient>

        {/* tie-dye blobs */}
        <radialGradient id={`blob1-${uid}`}>
          <stop offset="0" stopColor={accent} stopOpacity="0.9" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`blob2-${uid}`}>
          <stop offset="0" stopColor={accent2} stopOpacity="0.9" />
          <stop offset="1" stopColor={accent2} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`blob3-${uid}`}>
          <stop offset="0" stopColor={shade(accent, -30)} stopOpacity="0.75" />
          <stop offset="1" stopColor={shade(accent, -30)} stopOpacity="0" />
        </radialGradient>

        {/* plaid */}
        <pattern
          id={`plaid-${uid}`}
          width="30"
          height="30"
          patternUnits="userSpaceOnUse"
        >
          <rect width="30" height="30" fill={base} />
          <rect width="30" height="11" fill={accent} opacity="0.5" />
          <rect width="11" height="30" fill={accent2} opacity="0.5" />
          <rect
            width="30"
            height="30"
            fill="none"
            stroke={shade(base, -30)}
            strokeWidth="1"
            opacity="0.35"
          />
        </pattern>

        {/* fabric grain */}
        <filter id={`grain-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.16 0.16 0.16 0 -0.09"
          />
        </filter>
      </defs>

      {/* ground shadow */}
      <path d={TEE_PATH} transform="translate(0 12)" fill="#2b231b" opacity="0.07" />

      <g clipPath={`url(#tee-${uid})`}>
        <rect width="400" height="400" fill={base} />

        {/* pattern layers */}
        {art.pattern === "stripe" && (
          <g fill={accent} opacity="0.92">
            {Array.from({ length: 9 }, (_, i) => (
              <rect key={i} x="-30" y={138 + i * 24} width="460" height="11" />
            ))}
          </g>
        )}

        {art.pattern === "check" && (
          <rect width="400" height="400" fill={`url(#plaid-${uid})`} />
        )}

        {art.pattern === "tie" && (
          <g>
            <circle cx="136" cy="188" r="80" fill={`url(#blob1-${uid})`} />
            <circle cx="258" cy="240" r="100" fill={`url(#blob2-${uid})`} />
            <circle cx="196" cy="312" r="72" fill={`url(#blob3-${uid})`} />
            <circle cx="168" cy="140" r="46" fill="#ffffff" opacity="0.1" />
          </g>
        )}

        {art.pattern === "fade" && (
          <g>
            <rect width="400" height="400" fill={`url(#fade-${uid})`} />
            {/* lighter sun-band */}
            <rect y="150" width="400" height="64" fill="#ffffff" opacity="0.08" />
          </g>
        )}

        {art.pattern === "graphic" && (
          <g>
            {/* vintage badge */}
            <circle cx="200" cy="205" r="44" fill={art.graphic ?? "#F5EDDF"} />
            <circle
              cx="200"
              cy="205"
              r="37"
              fill="none"
              stroke={shade(art.graphic ?? "#F5EDDF", -70)}
              strokeWidth="2"
              opacity="0.5"
            />
            <circle cx="200" cy="205" r="29" fill={accent} />
            {[0, 90, 180, 270].map((angle) => (
              <circle
                key={angle}
                cx={200 + 54 * Math.cos((angle * Math.PI) / 180)}
                cy={205 + 54 * Math.sin((angle * Math.PI) / 180)}
                r="3"
                fill={accent}
              />
            ))}
            {/* print text lines */}
            <g
              stroke={onDark ? "#F5EDDF" : shade(base, -60)}
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.75"
            >
              <path d="M186 264h28" />
              <path d="M193 276h14" />
            </g>
          </g>
        )}

        {art.pattern === "raglan" && (
          <g>
            <path d={LEFT_SLEEVE} fill={accent} />
            <path d={RIGHT_SLEEVE} fill={accent} />
            <path
              d="M90 116L104 194M310 116L296 194"
              stroke={shade(accent, -30)}
              strokeWidth="2"
              strokeDasharray="3 4"
              opacity="0.7"
            />
          </g>
        )}

        {/* drape sheen */}
        <rect width="400" height="400" fill={`url(#sheen-${uid})`} />

        {/* neck shadow */}
        <path
          d="M150 116Q200 148 250 116"
          fill="none"
          stroke="#2b231b"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.1"
        />

        {/* grain */}
        <rect width="400" height="400" filter={`url(#grain-${uid})`} opacity="0.6" />
      </g>

      {/* collar band */}
      <path d={COLLAR_PATH} fill={rib} />
      <path
        d="M150 114Q200 146 250 114"
        fill="none"
        stroke={shade(rib, isDark(rib) ? 38 : -30)}
        strokeWidth="1.5"
        strokeDasharray="1.5 3.5"
        opacity="0.7"
      />
      <path
        d="M152 124Q200 154 248 124"
        fill="none"
        stroke={shade(rib, -18)}
        strokeWidth="1.5"
        strokeDasharray="1.5 3.5"
        opacity="0.5"
      />

      {/* sleeve cuffs */}
      <path d="M46 152L42 176" stroke={rib} strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      <path d="M354 152L358 176" stroke={rib} strokeWidth="4" strokeLinecap="round" opacity="0.9" />

      {/* hem rib */}
      <path
        d="M112 320Q200 335 288 320"
        fill="none"
        stroke={rib}
        strokeWidth="3"
        opacity="0.85"
      />

      {/* topstitching */}
      <g
        stroke={seam}
        strokeWidth="1.5"
        strokeDasharray="1.5 3.5"
        opacity="0.55"
        fill="none"
      >
        <path d="M156 116L92 120" />
        <path d="M244 116L308 120" />
        <path d="M104 200L100 312" />
        <path d="M296 200L300 312" />
      </g>
    </svg>
  );
}
