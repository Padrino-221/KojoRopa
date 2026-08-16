/**
 * Setting key definitions, grouped by section.
 * Each entry maps a DB key to its display label and default value.
 */
export const SETTING_SECTIONS = [
  {
    title: "Brand & About",
    settings: [
      { key: "siteName", label: "Store name", default: "Kojosropa" },
      { key: "aboutMetaDescription", label: "About — meta description", default: "How Kojosropa became a curated shirt shop in Accra — and why we'll never restock a single piece." },
      { key: "aboutHeading", label: "About — heading", default: "Started with one bale in Accra" },
      { key: "aboutBody", label: "About — body", default: "Kojosropa began in Accra with a single bale of imported tees and a stubborn belief: the best shirts are the ones that already lived a little." },
    ],
  },
  {
    title: "Storefront",
    settings: [
      { key: "emptyHeading", label: "Empty state heading", default: "Nothing on this hanger" },
      { key: "emptyBody", label: "Empty state body", default: "No pieces match those filters right now. Loosen a filter or two — the rack turns over every week." },
      { key: "productDetailNote", label: "Product page — note under actions", default: "Every piece is checked and one of one. When it's gone, it's gone." },
      { key: "relatedHeading", label: "Product page — related heading", default: "You might also like" },
    ],
  },
  {
    title: "Catalog",
    settings: [
      { key: "categories", label: "Categories (value:Label, comma-separated)", default: "tee:Tees,button-up:Button-ups,polo:Polos,overshirt:Overshirts", type: "textarea" },
      { key: "sizes", label: "Sizes (comma-separated)", default: "XS,S,M,L,XL,XXL", type: "textarea" },
      { key: "maxProductImages", label: "Max product images", default: "8", type: "number" },
    ],
  },
  {
    title: "Cart & Checkout",
    settings: [
      { key: "cartEmptyHeading", label: "Cart — empty heading", default: "Your bag is empty" },
      { key: "cartEmptyBody", label: "Cart — empty body", default: "Every piece is one of one — when it's gone, it's gone." },
      { key: "deliveryFee", label: "Delivery — fee", default: "30", type: "number" },
      { key: "receiptGreetingSuffix", label: "Confirmation — greeting suffix", default: "your pieces are being wrapped in tissue as we speak." },
      { key: "receiptCta", label: "Confirmation — CTA button text", default: "Keep browsing the rack" },
      { key: "receiptFooter", label: "Confirmation — footer text", default: "Thank you for shopping with Kojosropa." },
    ],
  },
  {
    title: "Footer & Social",
    settings: [
      { key: "footerDescription", label: "Footer — description", default: "Curated shirts, one of one. Picked in Accra — checked and priced to move." },
      { key: "footerAddress", label: "Footer — address", default: "Accra, Ghana" },
      { key: "footerCopyright", label: "Footer — copyright (use {year} for year)", default: "© {year} Kojosropa" },
      { key: "footerTagline", label: "Footer — tagline", default: "Made in Accra" },
      { key: "instagramHandle", label: "Social — Instagram handle", default: "@kojosropa" },
      { key: "facebookHandle", label: "Social — Facebook page", default: "Kojosropa" },
      { key: "whatsappNumber", label: "Social — WhatsApp number", default: "0209401655" },
      { key: "tiktokHandle", label: "Social — TikTok handle", default: "Kojosropa" },
      { key: "snapchatHandle", label: "Social — Snapchat username", default: "Kojosropa" },
    ],
  },
] as const;
