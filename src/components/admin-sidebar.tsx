"use client";

import { useEffect, useState } from "react";
import { logoutAction } from "@/lib/actions/auth";

type AdminView = "dashboard" | "products" | "orders" | "settings" | "activity";

interface AdminSidebarProps {
  activeView: AdminView;
  onViewChange: (view: AdminView) => void;
  productCount: number;
  pendingOrderCount: number;
}

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { view: "dashboard" as AdminView, label: "Dashboard", icon: "ph-duotone ph-squares-four" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { view: "products" as AdminView, label: "Pieces", icon: "ph-duotone ph-t-shirt", countKey: "products" as const },
    ],
  },
  {
    label: "Sales",
    items: [
      { view: "orders" as AdminView, label: "Orders", icon: "ph-duotone ph-package", countKey: "orders" as const },
    ],
  },
  {
    label: "Settings",
    items: [
      { view: "settings" as AdminView, label: "Settings", icon: "ph-duotone ph-gear-six" },
    ],
  },
];

export function AdminSidebar({
  activeView,
  onViewChange,
  productCount,
  pendingOrderCount,
}: AdminSidebarProps) {
  const [open, setOpen] = useState(false);

  const counts: Record<string, number> = {
    products: productCount,
    orders: pendingOrderCount,
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* mobile toggle */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-3.5 left-3.5 z-[200] flex h-10 w-10 items-center justify-center rounded-lg border border-sand bg-white lg:hidden"
        aria-label="Open menu"
      >
        <i className="ph-duotone ph-list h-5 w-5 text-espresso" />
      </button>

      {/* overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-espresso/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* sidebar */}
      <aside
        className={`fixed top-0 left-0 z-[100] flex h-dvh w-[240px] flex-col border-r border-espresso bg-espresso text-white transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* brand */}
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Kojos<span className="text-clay">ropa</span>
            </span>
            <span className="rounded-full bg-clay px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Admin
            </span>
          </div>
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-white/40">
                {section.label}
              </p>
              {section.items.map((item, i) => {
                const isActive = activeView === item.view;
                const count = "countKey" in item && item.countKey ? counts[item.countKey] : undefined;
                return (
                  <button
                    key={`${item.view}-${item.label}-${i}`}
                    type="button"
                    onClick={() => {
                      onViewChange(item.view);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                      isActive
                        ? "bg-clay text-white font-semibold"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <i className={`${item.icon} h-[18px] w-[18px] shrink-0`} />
                    {item.label}
                    {count !== undefined && count > 0 && (
                      <span
                        className={`ml-auto rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-white/10 text-white/60"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* footer — sign out */}
        <div className="border-t border-white/10 p-3">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <i className="ph-duotone ph-sign-out h-[18px] w-[18px] shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
