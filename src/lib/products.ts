export type ShirtPattern =
  | "solid"
  | "stripe"
  | "tie"
  | "graphic"
  | "check"
  | "fade"
  | "raglan";

export interface ShirtArt {
  /** main fabric colour (hex) */
  base: string;
  pattern: ShirtPattern;
  /** pattern accent / stripes / tie blobs */
  accent?: string;
  /** second accent (tie-dye, plaid) */
  accent2?: string;
  /** badge fill for the graphic pattern */
  graphic?: string;
  /** collar & hem rib colour (defaults to a darkened base) */
  rib?: string;
}

export type ProductCategory = "tee" | "button-up" | "polo" | "overshirt";

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  price: number; // GHS
  compareAt?: number; // original retail, for "savings" chips
  category: string;
  sizes: string[];
  condition: string;
  /** uploaded product photo as base64 data URL */
  image?: string;
  /** all uploaded photos; image is images[0] when present */
  images?: string[];
  story: string;
  art: ShirtArt;
  featured?: boolean;
  /** hidden pieces stay out of the public rack (admin-managed) */
  visible?: boolean;
  /** sold pieces are retired from the rack once payment is confirmed */
  sold?: boolean;
}

export const products: Product[] = [
  {
    id: "p01",
    slug: "sunset-fade-tee",
    name: "Sunset Fade Tee",
    tagline: "Hand-dyed gradient, like a market evening in Accra",
    price: 80,
    compareAt: 145,
    category: "tee",
    sizes: ["M", "L", "XL"],
    condition: "Excellent",
    story:
      "Garment-dyed in tiny batches at a studio in Nima, so no two come out the same. This one caught the dye a little heavier at the hem — that's the one you want.",
    art: { base: "#F1E0C4", pattern: "fade", accent: "#C4713F" },
    featured: true,
  },
  {
    id: "p02",
    slug: "black-stars-94-tee",
    name: "Black Stars '94 Tee",
    tagline: "A supporter's tee from the years the Stars were rising",
    price: 95,
    compareAt: 210,
    category: "tee",
    sizes: ["S", "M", "L"],
    condition: "Excellent",
    story:
      "Pulled from a bale in Accra. The badge print has that perfect road-worn fade, and the collar is still remarkably intact for a tee that cheered every match.",
    art: { base: "#E7D9C4", pattern: "graphic", accent: "#C9A227", graphic: "#F5EDDF" },
    featured: true,
  },
  {
    id: "p03",
    slug: "heavyweight-box-tee",
    name: "Heavyweight Box Tee",
    tagline: "A deadstock blank from a factory that closed in 2019",
    price: 70,
    compareAt: 150,
    category: "tee",
    sizes: ["XL", "XXL"],
    condition: "Deadstock",
    story:
      "Never worn, never unfolded — a whole carton of them turned up in a warehouse in Tema. Thick, structured cotton with a 3-finger collar.",
    art: { base: "#2B231B", pattern: "solid", rib: "#F1E9DC" },
  },
  {
    id: "p04",
    slug: "breton-striped-tee",
    name: "Breton Striped Tee",
    tagline: "Classic sailor stripes, soft as a cloud",
    price: 60,
    category: "tee",
    sizes: ["XS", "S", "M", "L"],
    condition: "Like new",
    story:
      "A proper breton that crossed the sea inside a bale. The stripes have softened with honest wear, and the ribbing shows barely any life at all.",
    art: { base: "#F4EAD8", pattern: "stripe", accent: "#3F4E5A" },
    featured: true,
  },
  {
    id: "p05",
    slug: "campus-radio-graphic",
    name: "Campus Radio Graphic Tee",
    tagline: "A college radio station that signed off in 1999",
    price: 75,
    compareAt: 135,
    category: "tee",
    sizes: ["S", "M"],
    condition: "Good",
    story:
      "On-air since 1972, off-air since 1999 — this tee is the last thing that station ever printed. There's a coffee ring on the back that we decided to leave exactly where it is.",
    art: { base: "#F1E9DC", pattern: "graphic", accent: "#B5653F", graphic: "#2B231B" },
  },
  {
    id: "p06",
    slug: "tie-dye-ringer",
    name: "Tie-Dye Ringer Tee",
    tagline: "Hand-tied in a backyard, rinsed in a river",
    price: 90,
    compareAt: 180,
    category: "tee",
    sizes: ["M", "L"],
    condition: "Excellent",
    story:
      "A true backyard special from a bale of American surplus — the swirls are tight and even, which means whoever tied it had done this before. Ringer collar in faded plum.",
    art: {
      base: "#EAD9C3",
      pattern: "tie",
      accent: "#6B4F5E",
      accent2: "#4E6E6B",
    },
    featured: true,
  },
  {
    id: "p07",
    slug: "chambray-workshirt",
    name: "Chambray Workshirt",
    tagline: "Broken-in workwear with a century of grace",
    price: 130,
    compareAt: 280,
    category: "button-up",
    sizes: ["S", "M", "L", "XL"],
    condition: "Excellent",
    story:
      "Japanese mill chambray with that soft, lived-in hand straight out of the store. Double chest pockets, corozo buttons — the kind of shirt tailors in Makola stop you to ask about.",
    art: { base: "#7C93A3", pattern: "solid" },
  },
  {
    id: "p08",
    slug: "camp-collar-flannel",
    name: "Camp Collar Flannel",
    tagline: "Blanket-weight plaid for the last day of summer",
    price: 110,
    compareAt: 220,
    category: "overshirt",
    sizes: ["M", "L", "XL"],
    condition: "Good",
    story:
      "Brushed on both sides, heavier than it looks. Wear it open over a tee now — and as a jacket when the harmattan winds come in December.",
    art: { base: "#EFE3CD", pattern: "check", accent: "#96502F", accent2: "#C9A227" },
    featured: true,
  },
  {
    id: "p09",
    slug: "midnight-roses-tee",
    name: "Midnight Roses Graphic Tee",
    tagline: "Archive band merch, printed blind on black",
    price: 85,
    category: "tee",
    sizes: ["S", "M"],
    condition: "Good",
    story:
      "The band is long gone and so is the label, but the print — roses over the band name — survived the decade. Black tees fade, but this one faded with style.",
    art: { base: "#241E18", pattern: "graphic", accent: "#C08A7E", graphic: "#F1E9DC" },
  },
  {
    id: "p10",
    slug: "moto-club-pocket",
    name: "Moto Club Pocket Tee",
    tagline: "A chest pocket from a mechanic's uniform",
    price: 65,
    compareAt: 130,
    category: "tee",
    sizes: ["L", "XL", "XXL"],
    condition: "Like new",
    story:
      "Thick, sun-faded olive with a single chest pocket — the universal uniform of people who fix things. The kind of tee that gets better the more you wear it.",
    art: { base: "#5F6B52", pattern: "solid", rib: "#EFE3CD" },
  },
  {
    id: "p11",
    slug: "vintage-tennis-polo",
    name: "Vintage Tennis Polo",
    tagline: "A two-button collar from the clubhouse rack",
    price: 55,
    category: "polo",
    sizes: ["XS", "S", "M"],
    condition: "Excellent",
    story:
      "Found in a pile labelled 'keep the collars' — and rightly so. A quiet sage piqué polo with the crisp two-button placket tennis clubs used to insist on.",
    art: { base: "#7E8B6F", pattern: "solid" },
  },
  {
    id: "p12",
    slug: "candy-stripe-tee",
    name: "Candy Stripe Tee",
    tagline: "Sun-faded stripes in pale sherbet",
    price: 70,
    category: "tee",
    sizes: ["S", "M", "L"],
    condition: "Good",
    story:
      "Candy stripes in faded pink and cream — technically a beach souvenir, emotionally a whole summer. The fabric has gone whisper-soft from years of sun and salt air.",
    art: { base: "#F4E8DA", pattern: "stripe", accent: "#C08A7E" },
  },
  {
    id: "p13",
    slug: "deadstock-concert-03",
    name: "Deadstock Concert Tee '03",
    tagline: "Never worn, tags intact, back print intact",
    price: 100,
    compareAt: 250,
    category: "tee",
    sizes: ["L", "XL"],
    condition: "Deadstock",
    story:
      "A whole box of these sat unopened for twenty years, then crossed the Atlantic twice to end up in Accra. This one is still creased from the factory fold — a time capsule.",
    art: { base: "#E2D6C2", pattern: "graphic", accent: "#A34A2F", graphic: "#2B231B" },
    featured: true,
  },
  {
    id: "p14",
    slug: "indigo-raglan",
    name: "Indigo Raglan Tee",
    tagline: "A two-tone baseball tee in faded indigo",
    price: 80,
    compareAt: 155,
    category: "tee",
    sizes: ["S", "M", "L"],
    condition: "Excellent",
    story:
      "The raglan cut means the sleeves were sewn in before the body — a dying construction detail. Indigo sleeves against a faded ecru body, and a collar that still snaps back.",
    art: { base: "#DCE4E0", pattern: "raglan", accent: "#3F4E5A" },
  },
];

export const CONDITIONS = [
  "Deadstock",
  "Like new",
  "Excellent",
  "Good",
  "Light wear",
];

export { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from "@/lib/site-config";

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateProductId(): string {
  return `p-${Date.now().toString(36)}${Math.floor(Math.random() * 1296)
    .toString(36)
    .padStart(2, "0")}`;
}


