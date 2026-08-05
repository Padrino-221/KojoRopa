import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CartDrawer } from "@/components/cart-drawer";
import { BottomNav } from "@/components/bottom-nav";

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
    default: "KojoRopa — Secondhand Shirts, One of One",
    template: "%s · KojoRopa",
  },
  description:
    "KojoRopa is a curated secondhand shirt shop from Accra. Graphic tees, deadstock blanks and soft-washed classics — one of one, picked at Kantamanto Market.",
  keywords: [
    "thrift store",
    "secondhand",
    "vintage shirts",
    "graphic tees",
    "Kantamanto",
    "Accra",
    "Ghana",
  ],
};

export default function RootLayout(props: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-linen">
        <CartProvider>
          <Navbar />
          <main className="flex-1 pb-20 lg:pb-0">{props.children}</main>
          <Footer />
          <BottomNav />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
