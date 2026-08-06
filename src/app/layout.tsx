import type { Metadata } from "next";
import Script from "next/script";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CartDrawer } from "@/components/cart-drawer";
import { BottomNav } from "@/components/bottom-nav";
import { AppShell } from "@/components/app-shell";
import { SiteSettingsProvider } from "@/components/site-settings-provider";
import { ToastProvider } from "@/components/ui/toast";
import { getAllSettings } from "@/lib/actions/settings";
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
} from "@/lib/site-config";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// The whole site is DB-driven (products, site settings, delivery fee). Render
// on demand so builds never require a reachable database — and so content is
// always fresh instead of baked in at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kojosropa.example"
  ),
  title: {
    default: `${SITE_NAME} — Curated Shirts, One of One`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
};

export default async function RootLayout(props: LayoutProps<"/">) {
  const settings = await getAllSettings();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`no-js ${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Marks JS as available so scroll-reveals can hide content; without
            JS everything stays visible. Injected into the initial HTML before
            hydration (avoids React's inline-script hydration warning). */}
        <Script
          id="remove-no-js"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.remove('no-js');",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-linen">
        <SiteSettingsProvider settings={settings}>
          <ToastProvider>
            <CartProvider>
              <AppShell
                navbar={<Navbar />}
                footer={<Footer />}
                bottomNav={<BottomNav />}
                cartDrawer={<CartDrawer />}
              >
                {props.children}
              </AppShell>
            </CartProvider>
          </ToastProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
