"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Renders the storefront chrome (navbar, footer, bottom nav, cart) around
 * children, but skips it on /admin routes so the admin tool gets a focused,
 * chrome-less experience. The chrome components are passed in as server
 * children so they keep their server rendering.
 */
export function AppShell({
  children,
  navbar,
  footer,
  bottomNav,
  cartDrawer,
}: {
  children: ReactNode;
  navbar: ReactNode;
  footer: ReactNode;
  bottomNav: ReactNode;
  cartDrawer: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      {!isAdmin && navbar}
      <main className={`flex-1 ${isAdmin ? "" : "pb-20 lg:pb-0"}`}>
        {children}
      </main>
      {!isAdmin && footer}
      {!isAdmin && bottomNav}
      {!isAdmin && cartDrawer}
    </>
  );
}
