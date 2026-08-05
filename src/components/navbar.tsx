"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";

export function Navbar() {
  const { count, isHydrated, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/?q=${encodeURIComponent(q)}#shop`);
    } else {
      router.push("/#shop");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-md">
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

        {/* logo */}
        <Link
          href="/"
          className="shrink-0 font-display text-[22px] leading-none tracking-tight text-espresso transition-opacity hover:opacity-70"
        >
          Kojo<span className="text-clay">Ropa</span>
        </Link>

        {/* search bar — desktop */}
        <form
          onSubmit={handleSearch}
          className="hidden max-w-xs flex-1 md:block lg:max-w-sm"
        >
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-taupe"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shirts, styles, eras..."
              aria-label="Search products"
              className="w-full rounded-full bg-white py-2.5 pr-4 pl-10 text-sm text-espresso ring-1 ring-border placeholder:text-taupe focus:border-clay focus:ring-2 focus:ring-clay/20 focus:outline-none"
            />
          </div>
        </form>

        {/* desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/#shop"
            className="rounded-full px-4 py-2 text-[13px] font-medium text-mocha transition-colors hover:bg-cream hover:text-espresso"
          >
            Shop
          </Link>
          <Link
            href="/about"
            className="rounded-full px-4 py-2 text-[13px] font-medium text-mocha transition-colors hover:bg-cream hover:text-espresso"
          >
            About
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
          {/* mobile search */}
          <form
            onSubmit={(e) => {
              handleSearch(e);
              setMenuOpen(false);
            }}
            className="mt-3"
          >
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-taupe"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shirts, styles, eras..."
                aria-label="Search products"
                className="w-full rounded-full bg-white py-2.5 pr-4 pl-10 text-sm text-espresso ring-1 ring-border placeholder:text-taupe focus:border-clay focus:ring-2 focus:ring-clay/20 focus:outline-none"
              />
            </div>
          </form>
        </nav>
      )}
    </header>
  );
}
