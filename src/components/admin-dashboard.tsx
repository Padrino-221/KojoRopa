"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { ShirtArt } from "@/components/shirt-art";
import { compressImage } from "@/lib/image";
import {
  CATEGORIES,
  CONDITIONS,
  SIZES,
  TAG_OPTIONS,
} from "@/lib/products";
import type { Product, ProductCategory, ShirtPattern } from "@/lib/products";
import { formatPrice, formatOrderDate } from "@/lib/format";
import type { ProductInput } from "@/lib/validators";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/lib/actions/products";
import { logoutAction } from "@/lib/actions/auth";

/* ————— order types (serialised from Prisma) ————— */

interface AdminOrderItem {
  id: string;
  slug: string;
  name: string;
  size: string;
  price: number;
  qty: number;
}

interface AdminOrder {
  id: string;
  placedAt: Date | string;
  email: string;
  name: string;
  subtotal: number;
  shipping: number;
  total: number;
  street: string;
  city: string;
  postal: string;
  country: string;
  items: AdminOrderItem[];
}

const inputClass =
  "w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-espresso ring-1 ring-border placeholder:text-taupe focus:border-clay focus:ring-2 focus:ring-clay/20 focus:outline-none";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold tracking-wide uppercase text-mocha";

/* ————— add / edit form ————— */

interface FormState {
  name: string;
  tagline: string;
  price: string;
  compareAt: string;
  category: string;
  condition: string;
  era: string;
  year: string;
  sizes: string[];
  tags: string[];
  fitNote: string;
  images: string[];
  story: string;
  inventory: string;
  featured: boolean;
  visible: boolean;
  artBase: string;
  artPattern: string;
  artAccent: string;
  artAccent2: string;
  artGraphic: string;
  artRib: string;
}

function toForm(product: Product): FormState {
  return {
    name: product.name,
    tagline: product.tagline,
    price: String(product.price),
    compareAt: product.compareAt ? String(product.compareAt) : "",
    category: product.category,
    condition: product.condition,
    era: product.era,
    year: String(product.year),
    sizes: product.sizes,
    tags: product.tags,
    fitNote: product.fitNote ?? "",
    images:
      product.images && product.images.length > 0
        ? product.images
        : product.image
          ? [product.image]
          : [],
    story: product.story,
    inventory: product.inventory ? String(product.inventory) : "",
    featured: !!product.featured,
    visible: product.visible !== false,
    artBase: product.art.base,
    artPattern: product.art.pattern,
    artAccent: product.art.accent ?? "#B5653F",
    artAccent2: product.art.accent2 ?? "#6B4F5E",
    artGraphic: product.art.graphic ?? "#2B231B",
    artRib: product.art.rib ?? "",
  };
}

function emptyForm(): FormState {
  return {
    name: "",
    tagline: "",
    price: "",
    compareAt: "",
    category: "tee",
    condition: "Excellent",
    era: "00s",
    year: String(new Date().getFullYear()),
    sizes: [],
    tags: [],
    fitNote: "",
    images: [],
    story: "",
    inventory: "",
    featured: false,
    visible: true,
    artBase: "#F1E9DC",
    artPattern: "solid",
    artAccent: "#B5653F",
    artAccent2: "#6B4F5E",
    artGraphic: "#2B231B",
    artRib: "",
  };
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? "bg-clay text-white"
          : "bg-surface text-mocha ring-1 ring-border hover:ring-clay/40"
      }`}
    >
      {children}
    </button>
  );
}

function ProductForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Product | null;
  onSave: (input: ProductInput) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial ? toForm(initial) : emptyForm()
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (key: "sizes" | "tags", value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((v) => v !== value)
        : [...f[key], value],
    }));

  const price = parseFloat(form.price);
  const valid = form.name.trim().length > 0 && price > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave({
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      price: Math.round(price),
      compareAt: form.compareAt ? Math.round(parseFloat(form.compareAt)) : null,
      category: form.category as ProductCategory,
      condition: form.condition,
      era: form.era.trim() || "New",
      year: parseInt(form.year, 10) || new Date().getFullYear(),
      sizes: form.sizes,
      tags: form.tags,
      fitNote: form.fitNote.trim() || null,
      images: form.images,
      story: form.story.trim(),
      inventory: form.inventory ? parseInt(form.inventory, 10) : null,
      featured: form.featured,
      visible: form.visible,
      artBase: form.artBase,
      artPattern: form.artPattern as ShirtPattern,
      artAccent: form.artAccent,
      artAccent2: form.artAccent2,
      artGraphic: form.artGraphic,
      artRib: form.artRib || null,
    });
  };

  const previewArt = {
    base: form.artBase,
    pattern: form.artPattern as ShirtPattern,
    accent: form.artAccent,
    accent2: form.artAccent2,
    graphic: form.artGraphic,
    rib: form.artRib || undefined,
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 animate-fade-in bg-espresso/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative mx-auto my-8 w-full max-w-2xl animate-pop rounded-3xl bg-linen p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl tracking-tight text-espresso">
              {initial ? "Edit piece" : "Add a piece"}
            </h2>
            <p className="mt-1 text-sm text-mocha">
              Changes update the rack immediately.
            </p>
          </div>
          <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-cream">
            <ShirtArt art={previewArt} className="h-full w-full" />
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="f-name" className={labelClass}>
                Name *
              </label>
              <input
                id="f-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Vintage Tour Tee"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="f-price" className={labelClass}>
                Price (GH₵) *
              </label>
              <input
                id="f-price"
                type="number"
                min="1"
                step="any"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="e.g. 85"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="f-tagline" className={labelClass}>
                Tagline
              </label>
              <input
                id="f-tagline"
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                placeholder="One honest line that sells the story"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="f-compare" className={labelClass}>
                Compare-at price (GH₵)
              </label>
              <input
                id="f-compare"
                type="number"
                min="0"
                step="any"
                value={form.compareAt}
                onChange={(e) => set("compareAt", e.target.value)}
                placeholder="Original retail, optional"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="f-inventory" className={labelClass}>
                Inventory
              </label>
              <input
                id="f-inventory"
                type="number"
                min="0"
                value={form.inventory}
                onChange={(e) => set("inventory", e.target.value)}
                placeholder='Leave blank for "one of one"'
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="f-category" className={labelClass}>
                Category
              </label>
              <select
                id="f-category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-condition" className={labelClass}>
                Condition
              </label>
              <select
                id="f-condition"
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
                className={inputClass}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-era" className={labelClass}>
                Era
              </label>
              <input
                id="f-era"
                value={form.era}
                onChange={(e) => set("era", e.target.value)}
                placeholder="e.g. 90s"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="f-year" className={labelClass}>
                Year
              </label>
              <input
                id="f-year"
                type="number"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <p className={labelClass}>Sizes</p>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <Chip
                  key={s}
                  active={form.sizes.includes(s)}
                  onClick={() => toggle("sizes", s)}
                >
                  {s}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className={labelClass}>Tags (power the style filters)</p>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <Chip
                  key={t}
                  active={form.tags.includes(t)}
                  onClick={() => toggle("tags", t)}
                >
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          {/* image upload */}
          <div>
            <p className={labelClass}>
              Product Photos{" "}
              <span className="font-normal normal-case text-taupe">
                (first photo is the cover)
              </span>
            </p>
            <div className="flex flex-wrap gap-3">
              {form.images.map((src, i) => (
                <div
                  key={i}
                  className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-cream ring-1 ring-border/50"
                >
                  <img
                    src={src}
                    alt={`Product photo ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-espresso/70 px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase text-white">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "images",
                        form.images.filter((_, idx) => idx !== i)
                      )
                    }
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-espresso/60 text-white transition-colors hover:bg-espresso"
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              ))}
              {form.images.length < 8 && (
                <label className="flex h-28 w-28 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-sand-deep bg-cream/50 transition-colors hover:border-clay/40 hover:bg-cream">
                  <svg viewBox="0 0 24 24" className="h-8 w-8 text-taupe" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span className="mt-1 text-[10px] font-medium text-taupe">
                    Add photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length === 0) return;
                      const fresh: string[] = [];
                      for (const file of files) {
                        try {
                          fresh.push(await compressImage(file));
                        } catch {
                          /* skip unreadable files */
                        }
                        if (form.images.length + fresh.length >= 8) break;
                      }
                      if (fresh.length > 0)
                        set("images", [...form.images, ...fresh]);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="f-fit" className={labelClass}>
                Fit note
              </label>
              <input
                id="f-fit"
                value={form.fitNote}
                onChange={(e) => set("fitNote", e.target.value)}
                placeholder="e.g. Runs small, tag says L fits M"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="f-story" className={labelClass}>
                Story
              </label>
              <textarea
                id="f-story"
                rows={3}
                value={form.story}
                onChange={(e) => set("story", e.target.value)}
                placeholder="Where it came from, what it's been through"
                className={inputClass}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-cream/50 p-4">
            <p className={labelClass}>Artwork</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="f-pattern" className={labelClass}>
                  Pattern
                </label>
                <select
                  id="f-pattern"
                  value={form.artPattern}
                  onChange={(e) => set("artPattern", e.target.value)}
                  className={inputClass}
                >
                  <option value="solid">Solid</option>
                  <option value="stripe">Stripes</option>
                  <option value="tie">Tie-dye</option>
                  <option value="graphic">Graphic</option>
                  <option value="check">Plaid</option>
                  <option value="fade">Garment-dye</option>
                  <option value="raglan">Raglan</option>
                </select>
              </div>
              <div>
                <label htmlFor="f-base" className={labelClass}>
                  Base colour
                </label>
                <input
                  id="f-base"
                  type="color"
                  value={form.artBase}
                  onChange={(e) => set("artBase", e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-xl bg-surface ring-1 ring-border p-1"
                />
              </div>
              <div>
                <label htmlFor="f-accent" className={labelClass}>
                  Accent
                </label>
                <input
                  id="f-accent"
                  type="color"
                  value={form.artAccent}
                  onChange={(e) => set("artAccent", e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-xl bg-surface ring-1 ring-border p-1"
                />
              </div>
              <div>
                <label htmlFor="f-accent2" className={labelClass}>
                  Second accent
                </label>
                <input
                  id="f-accent2"
                  type="color"
                  value={form.artAccent2}
                  onChange={(e) => set("artAccent2", e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-xl bg-surface ring-1 ring-border p-1"
                />
              </div>
              <div>
                <label htmlFor="f-graphic" className={labelClass}>
                  Graphic badge
                </label>
                <input
                  id="f-graphic"
                  type="color"
                  value={form.artGraphic}
                  onChange={(e) => set("artGraphic", e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-xl bg-surface ring-1 ring-border p-1"
                />
              </div>
              <div>
                <label htmlFor="f-rib" className={labelClass}>
                  Rib
                </label>
                <input
                  id="f-rib"
                  type="color"
                  value={form.artRib || "#000000"}
                  onChange={(e) => set("artRib", e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-xl bg-surface ring-1 ring-border p-1"
                />
                <button
                  type="button"
                  onClick={() => set("artRib", "")}
                  className="mt-1 text-[11px] font-medium text-clay hover:underline"
                >
                  {form.artRib ? "Auto rib" : "Auto (darkened base)"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-espresso">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set("featured", e.target.checked)}
                className="h-4 w-4 accent-clay"
              />
              Featured
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-espresso">
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(e) => set("visible", e.target.checked)}
                className="h-4 w-4 accent-clay"
              />
              Visible on the rack
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-surface px-5 py-2.5 text-sm font-medium text-mocha ring-1 ring-border transition-colors hover:text-espresso"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="rounded-full bg-clay px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-clay-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              {initial ? "Save changes" : "Add to the rack"}
            </button>
          </div>
          {!valid && (
            <p className="text-xs text-sale">
              A name and a price above 0 are required.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

/* ————— dashboard ————— */

function productToInput(p: Product): ProductInput {
  return {
    name: p.name,
    tagline: p.tagline,
    price: p.price,
    compareAt: p.compareAt ?? null,
    category: p.category,
    condition: p.condition,
    era: p.era,
    year: p.year,
    sizes: p.sizes,
    tags: p.tags,
    fitNote: p.fitNote ?? null,
    images:
      p.images && p.images.length > 0
        ? p.images
        : p.image
          ? [p.image]
          : [],
    story: p.story,
    inventory: p.inventory ?? null,
    featured: p.featured ?? false,
    visible: p.visible !== false,
    artBase: p.art.base,
    artPattern: p.art.pattern,
    artAccent: p.art.accent ?? null,
    artAccent2: p.art.accent2 ?? null,
    artGraphic: p.art.graphic ?? null,
    artRib: p.art.rib ?? null,
  };
}

type Notice = { kind: "error" | "success"; text: string } | null;

export function AdminDashboard({
  initialProducts,
  initialOrders,
}: {
  initialProducts: Product[];
  initialOrders: AdminOrder[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders] = useState<AdminOrder[]>(initialOrders);
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<
    { mode: "new" } | { mode: "edit"; product: Product } | null
  >(null);

  const flash = (kind: "error" | "success", text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 4000);
  };

  const handleSave = async (input: ProductInput) => {
    if (busy) return;
    setBusy(true);
    try {
      if (editor?.mode === "edit") {
        const res = await updateProductAction(editor.product.slug, input);
        if (res.ok) {
          setProducts((prev) =>
            prev.map((p) => (p.slug === editor.product.slug ? res.product : p))
          );
          flash("success", `"${res.product.name}" updated.`);
          setEditor(null);
        } else {
          flash("error", res.error);
        }
      } else {
        const res = await createProductAction(input);
        if (res.ok) {
          setProducts((prev) => [res.product, ...prev]);
          flash("success", `"${res.product.name}" added to the rack.`);
          setEditor(null);
        } else {
          flash("error", res.error);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleVisible = async (p: Product) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await updateProductAction(p.slug, {
        ...productToInput(p),
        visible: p.visible === false,
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((x) => (x.slug === p.slug ? res.product : x))
        );
      } else {
        flash("error", res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Remove "${p.name}" from the catalog?`)) return;
    setBusy(true);
    try {
      const res = await deleteProductAction(p.slug);
      if (res.ok) {
        setProducts((prev) => prev.filter((x) => x.slug !== p.slug));
        flash("success", `"${p.name}" removed.`);
      } else {
        flash("error", res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const stats = useMemo(
    () => ({
      total: products.length,
      visible: products.filter((p) => p.visible !== false).length,
      hidden: products.filter((p) => p.visible === false).length,
    }),
    [products]
  );

  const list = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = query
      ? products.filter((p) =>
          [p.name, p.tagline, p.era, p.category, ...p.tags]
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      : products;
    return [...base].sort(
      (a, b) =>
        Number(b.visible !== false) - Number(a.visible !== false) ||
        b.year - a.year
    );
  }, [products, search]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase text-clay">
            KojoRopa admin
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-tight text-espresso sm:text-4xl">
            {tab === "products" ? "Manage the rack" : "Orders"}
          </h1>
          <p className="mt-1 text-sm text-mocha">
            {tab === "products"
              ? "Changes are saved to the database and update the shop instantly."
              : `${orders.length} order${orders.length === 1 ? "" : "s"} placed so far.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-full bg-surface px-4 py-2.5 text-sm font-medium text-mocha ring-1 ring-border transition-colors hover:text-espresso"
            >
              Sign out
            </button>
          </form>
          {tab === "products" && (
            <button
              type="button"
              onClick={() => setEditor({ mode: "new" })}
              disabled={busy}
              className="rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-clay-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              + Add item
            </button>
          )}
        </div>
      </div>

      {/* tabs */}
      <div className="mt-6 flex gap-1 rounded-full bg-surface p-1 ring-1 ring-border/50 w-fit">
        {(["products", "orders"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setSearch("");
            }}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              tab === t
                ? "bg-espresso text-white shadow-sm"
                : "text-mocha hover:text-espresso"
            }`}
          >
            {t === "products" ? "Products" : "Orders"}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <>
          {notice && (
            <p
              role="status"
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                notice.kind === "error"
                  ? "bg-sale/10 text-sale"
                  : "bg-olive/10 text-olive"
              }`}
            >
              {notice.text}
            </p>
          )}

          {/* stats */}
          <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "Total", value: stats.total },
              { label: "Visible", value: stats.visible },
              { label: "Hidden", value: stats.hidden },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-surface p-3 sm:p-5 text-center ring-1 ring-border/50"
              >
                <p className="font-display text-2xl sm:text-3xl text-espresso">{s.value}</p>
                <p className="mt-1 text-[10px] sm:text-xs tracking-wide text-mocha">{s.label}</p>
              </div>
            ))}
          </div>

          {/* search */}
          <div className="relative mt-8 max-w-sm">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-taupe"
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items"
              aria-label="Search admin items"
              className="w-full rounded-full bg-surface py-2.5 pr-4 pl-10 text-sm text-espresso ring-1 ring-border placeholder:text-taupe focus:border-clay focus:outline-none"
            />
          </div>

          {/* list */}
          {list.length === 0 ? (
            <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-sand-deep bg-cream/50 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sand text-3xl">
                🔍
              </div>
              <p className="font-display text-2xl text-espresso">
                The rack is empty
              </p>
              <p className="max-w-sm text-sm text-mocha">
                Add your first piece and it will appear on the shop immediately.
              </p>
              <button
                type="button"
                onClick={() => setEditor({ mode: "new" })}
                className="mt-2 rounded-full bg-clay px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-clay-deep"
              >
                + Add item
              </button>
            </div>
          ) : (
            <ul className="mt-6 space-y-2 rounded-2xl bg-surface ring-1 ring-border/50">
              {list.map((p) => (
                <li key={p.id} className="flex items-center gap-3 sm:gap-4 border-b border-border/50 p-3 sm:p-4 last:border-0">
                  <div className="h-14 w-10 sm:h-16 sm:w-12 shrink-0 overflow-hidden rounded-xl bg-cream">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <ShirtArt art={p.art} className="h-full w-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-espresso">
                        {p.name}
                      </p>
                      {p.visible === false && (
                        <span className="shrink-0 rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase text-mocha">
                          Hidden
                        </span>
                      )}
                      {p.featured && (
                        <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase text-gold">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-mocha">
                      {p.tagline}
                    </p>
                    <p className="mt-1 text-xs text-taupe">
                      {p.era} · {p.category} · {p.sizes.join("/") || "no sizes"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-espresso">
                      {formatPrice(p.price)}
                    </p>
                    {p.compareAt && (
                      <p className="text-[11px] text-taupe line-through tabular-nums">
                        {formatPrice(p.compareAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditor({ mode: "edit", product: p })}
                      aria-label={`Edit ${p.name}`}
                      title="Edit"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-mocha transition-colors hover:bg-cream hover:text-espresso"
                    >
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleVisible(p)}
                      aria-label={p.visible === false ? "Show on rack" : "Hide from rack"}
                      title={p.visible === false ? "Show" : "Hide"}
                      className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-mocha transition-colors hover:bg-cream hover:text-espresso"
                    >
                      {p.visible === false ? (
                        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                          <path d="M2 2l20 20" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      aria-label={`Delete ${p.name}`}
                      title="Delete"
                      className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-mocha transition-colors hover:bg-sale/10 hover:text-sale"
                    >
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-8 text-center text-xs text-taupe">
            Admin — changes are saved to the database.
          </p>
        </>
      )}

      {tab === "orders" && (
        <>
          {orders.length === 0 ? (
            <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-sand-deep bg-cream/50 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sand text-3xl">
                📦
              </div>
              <p className="font-display text-2xl text-espresso">
                No orders yet
              </p>
              <p className="max-w-sm text-sm text-mocha">
                Orders will appear here as customers check out.
              </p>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-2xl bg-surface ring-1 ring-border/50 p-4 sm:p-5"
                >
                  {/* order header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-espresso">
                        {order.name}
                      </p>
                      <p className="mt-0.5 text-xs text-mocha">{order.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-espresso">
                        {formatPrice(order.total)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-taupe">
                        {formatOrderDate(order.placedAt)}
                      </p>
                    </div>
                  </div>

                  {/* items */}
                  <ul className="mt-3 divide-y divide-border/50 border-t border-border/50 pt-3">
                    {order.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between py-2 text-xs"
                      >
                        <span className="text-mocha">
                          {item.name}{" "}
                          <span className="text-taupe">×{item.qty}</span>
                          {item.size && (
                            <span className="text-taupe"> · {item.size}</span>
                          )}
                        </span>
                        <span className="tabular-nums text-espresso">
                          {formatPrice(item.price * item.qty)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* shipping address */}
                  <div className="mt-3 border-t border-border/50 pt-3 text-[11px] text-taupe">
                    {order.street}, {order.city} {order.postal}, {order.country}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {editor && (
        <ProductForm
          initial={editor.mode === "edit" ? editor.product : null}
          onSave={handleSave}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
