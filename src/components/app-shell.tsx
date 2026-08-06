"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ADMIN_PATH } from "@/lib/site-config";

/**
 * Renders the storefront chrome (navbar, footer, bottom nav, cart) around
 * children, but skips it on the secret admin route so the admin tool gets a
 * focused, chrome-less experience. The chrome components are passed in as
 * server children so they keep their server rendering.
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
  const adminBase = `/${ADMIN_PATH}`;
  const isAdmin =
    pathname === adminBase || pathname.startsWith(`${adminBase}/`);

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
