import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CartDrawer } from "@/components/cart-drawer";
import { BottomNav } from "@/components/bottom-nav";
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

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kojoropa.example"
  ),
  title: {
    default: `${SITE_NAME} — Secondhand Shirts, One of One`,
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
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-linen">
        <SiteSettingsProvider settings={settings}>
          <ToastProvider>
            <CartProvider>
              <Navbar />
              <main className="flex-1 pb-20 lg:pb-0">{props.children}</main>
              <Footer />
              <BottomNav />
              <CartDrawer />
            </CartProvider>
          </ToastProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
