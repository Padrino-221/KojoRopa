/**
 * Setting key definitions, grouped by section.
 * Each entry maps a DB key to its display label and default value.
 */
export const SETTING_SECTIONS = [
  {
    title: "Brand",
    settings: [
      { key: "siteName", label: "Store name", default: "KojoRopa" },
      { key: "siteTagline", label: "Tagline", default: "Secondhand shirts, one of one." },
      { key: "siteDescription", label: "Meta description", default: "KojoRopa is a curated secondhand shirt shop from Accra. Graphic tees, deadstock blanks and soft-washed classics — one of one, picked at Kantamanto Market." },
      { key: "siteKeywords", label: "Meta keywords (comma-separated)", default: "thrift store,secondhand,vintage shirts,graphic tees,Kantamanto,Accra,Ghana" },
    ],
  },
  {
    title: "Hero",
    settings: [
      { key: "heroEyebrow", label: "Eyebrow text", default: "Curated secondhand · Accra" },
      { key: "heroHeadline", label: "Headline", default: "Transform Your Style with Confidence." },
      { key: "heroDescription", label: "Description", default: "KojoRopa picks one-of-one secondhand shirts from the bales at Kantamanto Market — washed, checked and priced to move." },
      { key: "heroCaption", label: "Caption under image", default: "The pick of the rack — one of one, no restocks" },
      { key: "heroRotationMs", label: "Rotation interval (ms)", default: "21600000", type: "number" },
    ],
  },
  {
    title: "Storefront",
    settings: [
      { key: "storeHeading", label: "Main heading", default: "Popular of the week" },
      { key: "bestSellerHeading", label: "Best seller section", default: "Best Seller" },
      { key: "popularHeading", label: "Popular items section", default: "Popular Items" },
      { key: "emptyHeading", label: "Empty state heading", default: "Nothing on this hanger" },
      { key: "emptyBody", label: "Empty state body", default: "No pieces match those filters right now. Loosen a filter or two — the rack turns over every week." },
    ],
  },
  {
    title: "Home — Story band",
    settings: [
      { key: "storyEyebrow", label: "Eyebrow", default: "Kantamanto-picked, Accra-worn" },
      { key: "storyHeading", label: "Heading", default: "Less than one shirt in ten makes it onto the rack" },
      { key: "storyBody", label: "Body", default: "We dig through the secondhand bales at Kantamanto Market so you don't have to — washing, checking and pricing every piece honestly." },
    ],
  },
  {
    title: "Product detail",
    settings: [
      { key: "productDetailNote", label: "Note under actions", default: "Every piece is washed, checked and one of one. When it's gone, it's gone." },
      { key: "relatedHeading", label: "Related products heading", default: "You might also like" },
    ],
  },
  {
    title: "Cart",
    settings: [
      { key: "cartEmptyHeading", label: "Empty cart heading", default: "Your bag is empty" },
      { key: "cartEmptyBody", label: "Empty cart body", default: "Every piece is one of one — when it's gone, it's gone." },
      { key: "freeShippingText", label: "Free shipping unlocked text", default: "You've unlocked free shipping" },
    ],
  },
  {
    title: "Order confirmation",
    settings: [
      { key: "receiptGreetingSuffix", label: "Greeting suffix", default: "your pieces are being wrapped in tissue as we speak." },
      { key: "receiptCta", label: "CTA button text", default: "Keep browsing the rack" },
      { key: "receiptFooter", label: "Footer text", default: "Demo store — nothing was actually charged." },
    ],
  },
  {
    title: "About page",
    settings: [
      { key: "aboutMetaDescription", label: "Meta description", default: "How KojoRopa became a curated secondhand shirt shop in Accra — and why we'll never restock a single piece." },
      { key: "aboutHeading", label: "Heading", default: "Started with one bale at Kantamanto" },
      { key: "aboutBody", label: "Body", default: "KojoRopa began at Kantamanto Market in Accra — the world's largest secondhand clothing market — with a single bale of imported tees and a stubborn belief: the best shirts are the ones that already lived a little." },
      { key: "aboutCaption", label: "Art caption", default: "The heavyweight blank we're quietly obsessed with" },
    ],
  },
  {
    title: "Footer",
    settings: [
      { key: "footerDescription", label: "Description", default: "Secondhand shirts, one of one. Picked at Kantamanto Market, Accra — washed, checked and priced to move." },
      { key: "footerAddress", label: "Address", default: "Kantamanto Market, Accra" },
      { key: "footerCopyright", label: "Copyright (use {year} for year)", default: "© {year} KojoRopa — a demo storefront. No real orders are placed." },
      { key: "footerTagline", label: "Tagline", default: "Made in Accra" },
    ],
  },
  {
    title: "Admin",
    settings: [
      { key: "adminHeading", label: "Dashboard heading", default: "Manage the rack" },
      { key: "adminDescription", label: "Dashboard description", default: "Changes are saved to the database and update the shop instantly." },
    ],
  },
  {
    title: "Shipping & limits",
    settings: [
      { key: "freeShippingThreshold", label: "Free shipping threshold", default: "300", type: "number" },
      { key: "shippingFee", label: "Shipping fee", default: "30", type: "number" },
      { key: "defaultCountry", label: "Default checkout country", default: "Ghana" },
      { key: "maxProductImages", label: "Max product images", default: "8", type: "number" },
      { key: "maxQty", label: "Max quantity per item", default: "99", type: "number" },
    ],
  },
] as const;
