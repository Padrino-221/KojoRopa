/**
 * Centralised site configuration — every user-facing string and tunable
 * number lives here so operators can override them via environment variables
 * without touching source code.
 */

/* ——— env helpers ——— */

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}
function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/* ——— brand ——— */

export const SITE_NAME = env("NEXT_PUBLIC_SITE_NAME", "Kojosropa");
export const SITE_TAGLINE = env(
  "NEXT_PUBLIC_SITE_TAGLINE",
  "Curated shirts, one of one."
);
export const SITE_DESCRIPTION = env(
  "NEXT_PUBLIC_SITE_DESCRIPTION",
  "Kojosropa is a curated shirt shop from Accra. Graphic tees, deadstock blanks and soft-worn classics — one of one, and never restocked."
);
export const SITE_KEYWORDS = env(
  "NEXT_PUBLIC_SITE_KEYWORDS",
  "vintage shirts,graphic tees,curated shirts,one of one,Accra,Ghana"
).split(",");

/* ——— hero ——— */

export const HERO_EYEBROW = env(
  "NEXT_PUBLIC_HERO_EYEBROW",
  "Curated shirts · Accra"
);
export const HERO_HEADLINE = env(
  "NEXT_PUBLIC_HERO_HEADLINE",
  "Transform Your Style with Confidence."
);
export const HERO_DESCRIPTION = env(
  "NEXT_PUBLIC_HERO_DESCRIPTION",
  "Kojosropa picks one-of-one shirts from the bales in Accra — checked and priced to move."
);
export const HERO_CAPTION = env(
  "NEXT_PUBLIC_HERO_CAPTION",
  "The pick of the rack — one of one, no restocks"
);
export const HERO_ROTATION_MS = envInt(
  "NEXT_PUBLIC_HERO_ROTATION_MS",
  6 * 60 * 60 * 1000
);

/* ——— storefront headings ——— */

export const STORE_HEADING = env(
  "NEXT_PUBLIC_STORE_HEADING",
  "Popular of the week"
);
export const BEST_SELLER_HEADING = env(
  "NEXT_PUBLIC_BEST_SELLER_HEADING",
  "Best Seller"
);
export const POPULAR_HEADING = env(
  "NEXT_PUBLIC_POPULAR_HEADING",
  "Popular Items"
);
export const EMPTY_HEADING = env(
  "NEXT_PUBLIC_EMPTY_HEADING",
  "Nothing on this hanger"
);
export const EMPTY_BODY = env(
  "NEXT_PUBLIC_EMPTY_BODY",
  "No pieces match those filters right now. Loosen a filter or two — the rack turns over every week."
);

/* ——— story band (home page) ——— */

export const STORY_EYEBROW = env(
  "NEXT_PUBLIC_STORY_EYEBROW",
  "Hand-picked, Accra-worn"
);
export const STORY_HEADING = env(
  "NEXT_PUBLIC_STORY_HEADING",
  "Less than one shirt in ten makes it onto the rack"
);
export const STORY_BODY = env(
  "NEXT_PUBLIC_STORY_BODY",
  "We dig through the bales in Accra so you don’t have to — checking and pricing every piece honestly."
);

/* ——— product detail ——— */

export const PRODUCT_DETAIL_NOTE = env(
  "NEXT_PUBLIC_PRODUCT_DETAIL_NOTE",
  "Every piece is checked and one of one. When it’s gone, it’s gone."
);
export const RELATED_HEADING = env(
  "NEXT_PUBLIC_RELATED_HEADING",
  "You might also like"
);

/* ——— cart ——— */

export const CART_EMPTY_HEADING = env(
  "NEXT_PUBLIC_CART_EMPTY_HEADING",
  "Your bag is empty"
);
export const CART_EMPTY_BODY = env(
  "NEXT_PUBLIC_CART_EMPTY_BODY",
  "Every piece is one of one — when it’s gone, it’s gone."
);
export const FREE_DELIVERY_TEXT = env(
  "NEXT_PUBLIC_FREE_DELIVERY_TEXT",
  "You’ve unlocked free delivery"
);

/* ——— receipt / order confirmation ——— */

export const RECEIPT_GREETING_SUFFIX = env(
  "NEXT_PUBLIC_RECEIPT_GREETING_SUFFIX",
  "your pieces are being packaged as we speak."
);
export const RECEIPT_CTA = env(
  "NEXT_PUBLIC_RECEIPT_CTA",
  "Keep browsing the rack"
);
export const RECEIPT_FOOTER = env(
  "NEXT_PUBLIC_RECEIPT_FOOTER",
  "Thank you for shopping with Kojosropa."
);

/* ——— about page ——— */

export const ABOUT_META_DESCRIPTION = env(
  "NEXT_PUBLIC_ABOUT_META_DESCRIPTION",
  "How Kojosropa became a curated shirt shop in Accra — and why we’ll never restock a single piece."
);
export const ABOUT_HEADING = env(
  "NEXT_PUBLIC_ABOUT_HEADING",
  "Started with one bale in Accra"
);
export const ABOUT_BODY = env(
  "NEXT_PUBLIC_ABOUT_BODY",
  "Kojosropa began in Accra with a single bale of imported tees and a stubborn belief: the best shirts are the ones that already lived a little."
);
export const ABOUT_CAPTION = env(
  "NEXT_PUBLIC_ABOUT_CAPTION",
  "The heavyweight blank we’re quietly obsessed with"
);
export const VALUES = [
  {
    title: env("NEXT_PUBLIC_VALUE_1_TITLE", "Curated, not dumped"),
    copy: env(
      "NEXT_PUBLIC_VALUE_1_COPY",
      "We buy the way we shop for ourselves — slowly, suspiciously, and only for the good stuff. Less than one shirt in ten makes it onto the rack."
    ),
  },
  {
    title: env("NEXT_PUBLIC_VALUE_2_TITLE", "Honest labels"),
    copy: env(
      "NEXT_PUBLIC_VALUE_2_COPY",
      "Condition, era, fit and every honest flaw are written on the page. A limp collar is a feature when we tell you about it first."
    ),
  },
  {
    title: env("NEXT_PUBLIC_VALUE_3_TITLE", "No restocks, ever"),
    copy: env(
      "NEXT_PUBLIC_VALUE_3_COPY",
      "One of one is the whole point. When a piece sells, its story ends on someone’s shoulders — not in a warehouse."
    ),
  },
];

/* ——— footer ——— */

export const FOOTER_DESCRIPTION = env(
  "NEXT_PUBLIC_FOOTER_DESCRIPTION",
  "Curated shirts, one of one. Picked in Accra — checked and priced to move."
);
export const FOOTER_ADDRESS = env(
  "NEXT_PUBLIC_FOOTER_ADDRESS",
  "Accra, Ghana"
);
export const FOOTER_COPYRIGHT = env(
  "NEXT_PUBLIC_FOOTER_COPYRIGHT",
  "© {year} Kojosropa"
);
export const FOOTER_TAGLINE = env(
  "NEXT_PUBLIC_FOOTER_TAGLINE",
  "Made in Accra"
);

/* ——— admin ——— */

/**
 * Secret path segment for the admin dashboard. Set NEXT_PUBLIC_ADMIN_PATH to
 * something hard to guess (e.g. a random word pair) — the admin then lives at
 * /<your-secret> instead of the guessable /admin.
 */
export const ADMIN_PATH = env("NEXT_PUBLIC_ADMIN_PATH", "manage-rack");

export const ADMIN_HEADING = env(
  "NEXT_PUBLIC_ADMIN_HEADING",
  "Manage the rack"
);
export const ADMIN_DESCRIPTION = env(
  "NEXT_PUBLIC_ADMIN_DESCRIPTION",
  "Changes are saved to the database and update the shop instantly."
);

/* ——— product limits ——— */

export const MAX_PRODUCT_IMAGES = envInt("NEXT_PUBLIC_MAX_PRODUCT_IMAGES", 8);
export const MAX_QTY = envInt("NEXT_PUBLIC_MAX_QTY", 99);

/* ——— delivery ——— */

export const FREE_DELIVERY_THRESHOLD = envInt(
  "NEXT_PUBLIC_FREE_DELIVERY_THRESHOLD",
  300
);
export const DELIVERY_FEE = envInt("NEXT_PUBLIC_DELIVERY_FEE", 30);

/* ——— checkout ——— */

export const DEFAULT_COUNTRY = env(
  "NEXT_PUBLIC_DEFAULT_COUNTRY",
  "Ghana"
);
