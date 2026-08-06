import type { Prisma } from "@/generated/prisma/client";
import type { Product, ShirtPattern } from "@/lib/products";
import type { ProductInput } from "@/lib/validators";

/** Flat shape of a Product row as stored in the database. */
export interface DbProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  price: number;
  compareAt: number | null;
  category: string;
  condition: string;
  image: string | null;
  images: string[];
  story: string;
  sizes: string[];
  featured: boolean;
  visible: boolean;
  artBase: string;
  artPattern: string;
  artAccent: string | null;
  artAccent2: string | null;
  artGraphic: string | null;
  artRib: string | null;
}

export type ProductDraft = Omit<Product, "id" | "slug">;

const PATTERNS: readonly ShirtPattern[] = [
  "solid",
  "stripe",
  "tie",
  "graphic",
  "check",
  "fade",
  "raglan",
];

function isOneOf<T extends string>(
  value: string,
  list: readonly T[]
): value is T {
  return (list as readonly string[]).includes(value);
}

export function dbToProduct(row: DbProduct): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    price: row.price,
    compareAt: row.compareAt ?? undefined,
    category: row.category,
    condition: row.condition,
    image: row.image ?? row.images[0] ?? undefined,
    images: row.images,
    story: row.story,
    sizes: row.sizes,
    featured: row.featured,
    visible: row.visible,
    art: {
      base: row.artBase,
      pattern: isOneOf(row.artPattern, PATTERNS) ? row.artPattern : "solid",
      accent: row.artAccent ?? undefined,
      accent2: row.artAccent2 ?? undefined,
      graphic: row.artGraphic ?? undefined,
      rib: row.artRib ?? undefined,
    },
  };
}

/** Maps a domain ProductDraft to the flat column shape Prisma writes. */
export function draftToDbShape(
  draft: ProductDraft
): Omit<
  Prisma.ProductCreateInput,
  "id" | "slug" | "createdAt" | "updatedAt"
> {
  return {
    name: draft.name,
    tagline: draft.tagline,
    price: draft.price,
    compareAt: draft.compareAt ?? null,
    category: draft.category,
    condition: draft.condition,
    image: draft.image ?? draft.images?.[0] ?? null,
    images: draft.images ?? [],
    story: draft.story,
    sizes: draft.sizes,
    featured: draft.featured ?? false,
    visible: draft.visible ?? true,
    artBase: draft.art.base,
    artPattern: draft.art.pattern,
    artAccent: draft.art.accent ?? null,
    artAccent2: draft.art.accent2 ?? null,
    artGraphic: draft.art.graphic ?? null,
    artRib: draft.art.rib ?? null,
  };
}

/** Maps the validated, flattened ProductInput (admin form) to Prisma fields. */
export function productInputToDbShape(
  input: ProductInput
): Omit<
  Prisma.ProductCreateInput,
  "id" | "slug" | "createdAt" | "updatedAt"
> {
  return {
    name: input.name,
    tagline: input.tagline,
    price: input.price,
    compareAt: input.compareAt ?? null,
    category: input.category,
    condition: input.condition,
    image: input.images[0] ?? null,
    images: input.images,
    story: input.story,
    sizes: input.sizes,
    featured: input.featured,
    visible: input.visible,
    artBase: input.artBase,
    artPattern: input.artPattern,
    artAccent: input.artAccent ?? null,
    artAccent2: input.artAccent2 ?? null,
    artGraphic: input.artGraphic ?? null,
    artRib: input.artRib ?? null,
  };
}
