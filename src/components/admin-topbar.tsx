"use client";

import { Button } from "@/components/ui/button";

type AdminView = "dashboard" | "products" | "orders" | "settings" | "activity";

interface AdminTopbarProps {
  view: AdminView;
  onAddProduct?: () => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
  search?: string;
  onSearchChange?: (value: string) => void;
}

const VIEW_TITLES: Record<AdminView, string> = {
  dashboard: "Dashboard",
  products: "Pieces",
  orders: "Orders",
  settings: "Settings",
  activity: "Activity",
};

export function AdminTopbar({
  view,
  onAddProduct,
  searchRef,
  search,
  onSearchChange,
}: AdminTopbarProps) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-sand bg-white px-6 py-3.5 lg:px-8">
      <div className="flex items-center gap-4 pl-12 lg:pl-0">
        <h1 className="font-display text-[17px] font-bold tracking-tight text-espresso lg:text-xl">
          {VIEW_TITLES[view]}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {view === "products" && (
          <>
            <div className="relative hidden sm:block">
              <i className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-taupe ph-duotone ph-magnifying-glass" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Search pieces..."
                aria-label="Search pieces"
                className="h-9 w-[200px] rounded-full bg-cream py-2 pr-3 pl-9 text-[13px] text-espresso outline-none transition-colors placeholder:text-taupe focus:w-[260px] focus:bg-white focus:ring-1 focus:ring-sand-deep"
              />
            </div>
            <Button onClick={onAddProduct} size="sm">
              <i className="ph-duotone ph-plus h-4 w-4" />
              Add piece
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
