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

export const SITE_NAME = env("NEXT_PUBLIC_SITE_NAME", "KojoRopa");
export const SITE_TAGLINE = env(
  "NEXT_PUBLIC_SITE_TAGLINE",
  "Secondhand shirts, one of one."
);
export const SITE_DESCRIPTION = env(
  "NEXT_PUBLIC_SITE_DESCRIPTION",
  "KojoRopa is a curated secondhand shirt shop from Accra. Graphic tees, deadstock blanks and soft-washed classics — one of one, picked at Kantamanto Market."
);
export const SITE_KEYWORDS = env(
  "NEXT_PUBLIC_SITE_KEYWORDS",
  "thrift store,secondhand,vintage shirts,graphic tees,Kantamanto,Accra,Ghana"
).split(",");

/* ——— hero ——— */

export const HERO_EYEBROW = env(
  "NEXT_PUBLIC_HERO_EYEBROW",
  "Curated secondhand · Accra"
);
export const HERO_HEADLINE = env(
  "NEXT_PUBLIC_HERO_HEADLINE",
  "Transform Your Style with Confidence."
);
export const HERO_DESCRIPTION = env(
  "NEXT_PUBLIC_HERO_DESCRIPTION",
  "KojoRopa picks one-of-one secondhand shirts from the bales at Kantamanto Market — washed, checked and priced to move."
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
  "Kantamanto-picked, Accra-worn"
);
export const STORY_HEADING = env(
  "NEXT_PUBLIC_STORY_HEADING",
  "Less than one shirt in ten makes it onto the rack"
);
export const STORY_BODY = env(
  "NEXT_PUBLIC_STORY_BODY",
  "We dig through the secondhand bales at Kantamanto Market so you don\u2019t have to \u2014 washing, checking and pricing every piece honestly."
);

/* ——— product detail ——— */

export const PRODUCT_DETAIL_NOTE = env(
  "NEXT_PUBLIC_PRODUCT_DETAIL_NOTE",
  "Every piece is washed, checked and one of one. When it\u2019s gone, it\u2019s gone."
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
  "Every piece is one of one \u2014 when it\u2019s gone, it\u2019s gone."
);
export const FREE_SHIPPING_TEXT = env(
  "NEXT_PUBLIC_FREE_SHIPPING_TEXT",
  "You\u2019ve unlocked free shipping"
);

/* ——— receipt / order confirmation ——— */

export const RECEIPT_GREETING_SUFFIX = env(
  "NEXT_PUBLIC_RECEIPT_GREETING_SUFFIX",
  "your pieces are being wrapped in tissue as we speak."
);
export const RECEIPT_CTA = env(
  "NEXT_PUBLIC_RECEIPT_CTA",
  "Keep browsing the rack"
);
export const RECEIPT_FOOTER = env(
  "NEXT_PUBLIC_RECEIPT_FOOTER",
  "Demo store \u2014 nothing was actually charged."
);

/* ——— about page ——— */

export const ABOUT_META_DESCRIPTION = env(
  "NEXT_PUBLIC_ABOUT_META_DESCRIPTION",
  "How KojoRopa became a curated secondhand shirt shop in Accra \u2014 and why we\u2019ll never restock a single piece."
);
export const ABOUT_HEADING = env(
  "NEXT_PUBLIC_ABOUT_HEADING",
  "Started with one bale at Kantamanto"
);
export const ABOUT_BODY = env(
  "NEXT_PUBLIC_ABOUT_BODY",
  "KojoRopa began at Kantamanto Market in Accra \u2014 the world\u2019s largest secondhand clothing market \u2014 with a single bale of imported tees and a stubborn belief: the best shirts are the ones that already lived a little."
);
export const ABOUT_CAPTION = env(
  "NEXT_PUBLIC_ABOUT_CAPTION",
  "The heavyweight blank we\u2019re quietly obsessed with"
);
export const VALUES = [
  {
    title: env("NEXT_PUBLIC_VALUE_1_TITLE", "Curated, not dumped"),
    copy: env(
      "NEXT_PUBLIC_VALUE_1_COPY",
      "We buy the way we would thrift ourselves \u2014 slowly, suspiciously, and only for the good stuff. Less than one shirt in ten makes it onto the rack."
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
      "One of one is the whole point. When a piece sells, its story ends on someone\u2019s shoulders \u2014 not in a warehouse."
    ),
  },
];

/* ——— footer ——— */

export const FOOTER_DESCRIPTION = env(
  "NEXT_PUBLIC_FOOTER_DESCRIPTION",
  "Secondhand shirts, one of one. Picked at Kantamanto Market, Accra \u2014 washed, checked and priced to move."
);
export const FOOTER_ADDRESS = env(
  "NEXT_PUBLIC_FOOTER_ADDRESS",
  "Kantamanto Market, Accra"
);
export const FOOTER_COPYRIGHT = env(
  "NEXT_PUBLIC_FOOTER_COPYRIGHT",
  "\u00a9 {year} KojoRopa \u2014 a demo storefront. No real orders are placed."
);
export const FOOTER_TAGLINE = env(
  "NEXT_PUBLIC_FOOTER_TAGLINE",
  "Made in Accra \U00011E73"
);

/* ——— admin ——— */

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

/* ——— shipping ——— */

export const FREE_SHIPPING_THRESHOLD = envInt(
  "NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD",
  300
);
export const SHIPPING_FEE = envInt("NEXT_PUBLIC_SHIPPING_FEE", 30);

/* ——— checkout ——— */

export const DEFAULT_COUNTRY = env(
  "NEXT_PUBLIC_DEFAULT_COUNTRY",
  "Ghana"
);
