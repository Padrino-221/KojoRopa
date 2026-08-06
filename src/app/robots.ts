import type { MetadataRoute } from "next";
import { ADMIN_PATH } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [`/${ADMIN_PATH}`, "/checkout", "/confirmation", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
