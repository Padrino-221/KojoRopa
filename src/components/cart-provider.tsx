"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/products";
import type { Product, ShirtArt } from "@/lib/products";
import { MAX_QTY } from "@/lib/site-config";

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  size: string;
  price: number;
  qty: number;
  art: ShirtArt;
  image?: string;
}

interface CartContextValue {
  items: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  isHydrated: boolean;
  shipping: number;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, size: string, qty?: number) => void;
  removeItem: (productId: string, size: string) => void;
  setQty: (productId: string, size: string, qty: number) => void;
  clearCart: () => void;
}

const STORAGE_KEY = "kojoropa-cart-v2";

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  /* load once on mount (client only) — deferred so hydration renders match */
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CartLine[];
          if (Array.isArray(parsed)) setItems(parsed);
        }
      } catch {
        /* corrupted storage — start fresh */
      }
      setIsHydrated(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  /* persist */
  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items, isHydrated]);

  /* lock body scroll while drawer is open */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const addItem = useCallback(
    (product: Product, size: string, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find(
          (l) => l.productId === product.id && l.size === size
        );
        if (existing) {
          return prev.map((l) =>
            l.productId === product.id && l.size === size
              ? { ...l, qty: Math.min(l.qty + qty, MAX_QTY) }
              : l
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            size,
            price: product.price,
            qty,
            art: { ...product.art },
            image: product.image,
          },
        ];
      });
      setIsOpen(true);
    },
    []
  );

  const removeItem = useCallback((productId: string, size: string) => {
    setItems((prev) =>
      prev.filter((l) => !(l.productId === productId && l.size === size))
    );
  }, []);

  const setQty = useCallback(
    (productId: string, size: string, qty: number) => {
      setItems((prev) =>
        qty <= 0
          ? prev.filter((l) => !(l.productId === productId && l.size === size))
          : prev.map((l) =>
              l.productId === productId && l.size === size
                ? { ...l, qty: Math.min(qty, MAX_QTY) }
                : l
            )
      );
    },
    []
  );

  const clearCart = useCallback(() => setItems([]), []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const { count, subtotal } = useMemo(() => {
    return items.reduce(
      (acc, l) => ({
        count: acc.count + l.qty,
        subtotal: acc.subtotal + l.qty * l.price,
      }),
      { count: 0, subtotal: 0 }
    );
  }, [items]);

  const shipping =
    subtotal >= FREE_SHIPPING_THRESHOLD || items.length === 0 ? 0 : SHIPPING_FEE;

  const value = useMemo(
    () => ({
      items,
      count,
      subtotal,
      shipping,
      isOpen,
      isHydrated,
      openCart,
      closeCart,
      addItem,
      removeItem,
      setQty,
      clearCart,
    }),
    [
      items,
      count,
      subtotal,
      shipping,
      isOpen,
      isHydrated,
      openCart,
      closeCart,
      addItem,
      removeItem,
      setQty,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
