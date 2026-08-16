"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { useSiteSetting } from "@/components/site-settings-provider";
import { Brand } from "@/components/brand";

export function Navbar() {
  const { count, isHydrated, openCart } = useCart();
  const siteName = useSiteSetting("siteName", "Kojosropa");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  // Keep the topbar search in sync with the current URL query — render-phase
  // adjustment, since the URL is the source of truth after navigation.
  const urlQ = searchParams.get("q") ?? "";
  if (urlQ !== search) setSearch(urlQ);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const query = search.trim();
    router.push(query ? `/?q=${encodeURIComponent(query)}` : "/");
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 max-lg:justify-between sm:px-6 lg:px-8">
        {/* logo */}
        <Brand
          href="/"
          name={siteName}
          className="shrink-0 md:flex-none"
        />

        {/* mobile menu toggle — right edge on mobile, hidden on desktop */}
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-espresso transition-colors hover:bg-cream md:hidden"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <i
            className={`ph-duotone h-5 w-5 ${
              menuOpen ? "ph-x" : "ph-list"
            }`}
          />
        </button>

        {/* search — desktop only, like the prototype topbar */}
        <form
          onSubmit={submitSearch}
          className="ml-1 hidden md:block"
          role="search"
        >
          <div className="relative flex items-center gap-2 rounded-full bg-cream px-3.5">
            <i className="ph-duotone ph-magnifying-glass h-[18px] w-[18px] shrink-0 text-taupe" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              aria-label="Search pieces"
              className="w-36 bg-transparent py-2 text-[13px] text-espresso outline-none placeholder:text-taupe lg:w-44"
            />
          </div>
        </form>

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

        {/* cart — hidden on mobile where the bottom nav has one */}
        <button
          type="button"
          onClick={openCart}
          className="relative hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-espresso transition-colors hover:bg-cream lg:flex"
          aria-label={`Open bag, ${isHydrated ? count : 0} items`}
        >
          <i className="ph-duotone ph-shopping-bag h-5 w-5" />
          {isHydrated && count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold text-white">
              {count}
            </span>
          )}
        </button>
      </div>

      {/* mobile menu */}
      {menuOpen && (
        <nav className="animate-fade-in border-t border-sand bg-white px-4 py-3 md:hidden">
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
