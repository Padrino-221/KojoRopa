"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart-provider";

export function BottomNav() {
  const pathname = usePathname();
  const { count, isHydrated, openCart } = useCart();

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      label: "Search",
      href: "/#shop",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      ),
    },
    {
      label: "Cart",
      href: "#",
      onClick: openCart,
      icon: (
        <div className="relative">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 7h12l1 13H5L6 7Z" />
            <path d="M9 7V6a3 3 0 0 1 6 0v1" />
          </svg>
          {isHydrated && count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-clay px-1 text-[9px] font-semibold text-white">
              {count}
            </span>
          )}
        </div>
      ),
    },

  ];

  return (
    <nav className="bottom-nav fixed bottom-4 left-1/2 z-50 -translate-x-1/2 lg:hidden">
      <div className="flex items-center gap-1 rounded-full border border-border bg-surface/95 px-2 py-1.5 backdrop-blur">
        {navItems.map((item) => {
          const isActive = item.href === "/" && pathname === "/";
          const isCart = item.label === "Cart";

          if (isCart) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex h-11 w-11 items-center justify-center rounded-full text-mocha transition-all hover:bg-cream hover:text-clay active:scale-90"
              >
                {item.icon}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-90 ${
                isActive
                  ? "bg-clay text-white"
                  : "text-mocha hover:bg-cream hover:text-clay"
              }`}
            >
              {item.icon}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
