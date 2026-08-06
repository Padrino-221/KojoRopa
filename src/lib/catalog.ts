/**
 * Admin-configurable catalog options (categories & sizes).
 * Stored in site settings as strings; parsed here for the storefront,
 * the home page and the admin product form.
 */

export interface CategoryOption {
  value: string;
  label: string;
}

export const DEFAULT_CATEGORIES_RAW =
  "tee:Tees,button-up:Button-ups,polo:Polos,overshirt:Overshirts";
export const DEFAULT_SIZES_RAW = "XS,S,M,L,XL,XXL";

/**
 * Parses the categories setting — `value:Label,value2:Label2` pairs
 * (bare values are also accepted, using the value as the label).
 */
export function parseCategories(raw: string): CategoryOption[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(":");
      if (idx === -1) return { value: part, label: part };
      const value = part.slice(0, idx).trim();
      const label = part.slice(idx + 1).trim();
      return { value, label: label || value };
    })
    .filter((c) => c.value.length > 0);
}

/** Parses the sizes setting — a plain comma-separated list. */
export function parseSizes(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
