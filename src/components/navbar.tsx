"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { useSiteSetting } from "@/components/site-settings-provider";
import { Brand } from "@/components/brand";

export function Navbar() {
  const { count, isHydrated, openCart } = useCart();
  const siteName = useSiteSetting("siteName", "KojoRopa");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors duration-300 ${
        scrolled ? "border-border bg-surface/95" : "border-transparent bg-surface/80"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* mobile menu toggle */}
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-espresso transition-colors hover:bg-cream md:hidden"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h10" />
            )}
          </svg>
        </button>

        {/* logo — centered on mobile, left-aligned on desktop */}
        <Brand
          href="/"
          name={siteName}
          className="flex-1 justify-center md:flex-none md:justify-start"
        />

        {/* desktop nav */}
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          <Link
            href="/#shop"
            className={`relative rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
              pathname === "/" ? "text-espresso" : "text-mocha hover:text-espresso"
            }`}
          >
            Shop
            {pathname === "/" && (
              <span
                aria-hidden
                className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-clay"
              />
            )}
          </Link>
          <Link
            href="/about"
            className={`relative rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
              pathname.startsWith("/about")
                ? "text-espresso"
                : "text-mocha hover:text-espresso"
            }`}
          >
            About
            {pathname.startsWith("/about") && (
              <span
                aria-hidden
                className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-clay"
              />
            )}
          </Link>
        </nav>

        {/* cart */}
        <button
          type="button"
          onClick={openCart}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-espresso transition-colors hover:bg-cream"
          aria-label={`Open bag, ${isHydrated ? count : 0} items`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 7h12l1 13H5L6 7Z" />
            <path d="M9 7V6a3 3 0 0 1 6 0v1" />
          </svg>
          {isHydrated && count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold text-white">
              {count}
            </span>
          )}
        </button>
      </div>

      {/* mobile menu */}
      {menuOpen && (
        <nav className="animate-fade-in border-t border-border bg-surface px-4 py-3 md:hidden">
          <div className="flex flex-col gap-0.5">
            <Link
              href="/#shop"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-[15px] font-medium text-mocha transition-colors hover:bg-cream hover:text-espresso"
            >
              Shop
            </Link>
            <Link
              href="/about"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-[15px] font-medium text-mocha transition-colors hover:bg-cream hover:text-espresso"
            >
              About
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
