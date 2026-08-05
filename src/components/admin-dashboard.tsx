"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

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
import { updateOrderStatusAction, type OrderStatus } from "@/lib/actions/orders";
import { ORDER_STATUSES } from "@/lib/order-status";
import { logoutAction } from "@/lib/actions/auth";
import { useSiteSetting } from "@/components/site-settings-provider";
import {
  getDbSettings,
  saveSettingsAction,
  resetSettingAction,
} from "@/lib/actions/settings";
import { SETTING_SECTIONS } from "@/lib/settings-defs";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomSelect } from "@/components/ui/custom-select";

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
  status: OrderStatus;
  items: AdminOrderItem[];
}

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

function ProductForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Product | null;
  onSave: (input: ProductInput) => void;
  onClose: () => void;
}) {
  const maxProductImages = parseInt(useSiteSetting("maxProductImages", "8"), 10) || 8;
  const [form, setForm] = useState<FormState>(
    initial ? toForm(initial) : emptyForm()
  );

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
    <Modal open onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col max-h-[inherit]">
        {/* ——— Fixed header ——— */}
        <div className="relative z-10 shrink-0 px-6 pt-6 sm:px-8 sm:pt-8">
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
        </div>

        {/* ——— Scrollable body ——— */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2">
          {/* ——— Left column: identity & classification ——— */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="f-name" required>Name</Label>
              <Input
                id="f-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Vintage Tour Tee"
              />
            </div>
            <div>
              <Label htmlFor="f-tagline">Tagline</Label>
              <Input
                id="f-tagline"
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                placeholder="One honest line that sells the story"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <CustomSelect
                  value={form.category}
                  onChange={(v) => set("category", v)}
                  options={CATEGORIES.filter((c) => c.value !== "all").map((c) => ({
                    value: c.value,
                    label: c.label,
                  }))}
                />
              </div>
              <div>
                <Label>Condition</Label>
                <CustomSelect
                  value={form.condition}
                  onChange={(v) => set("condition", v)}
                  options={CONDITIONS.map((c) => ({
                    value: c,
                    label: c,
                  }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="f-era">Era</Label>
                <Input
                  id="f-era"
                  value={form.era}
                  onChange={(e) => set("era", e.target.value)}
                  placeholder="e.g. 90s"
                />
              </div>
              <div>
                <Label htmlFor="f-year">Year</Label>
                <Input
                  id="f-year"
                  type="number"
                  value={form.year}
                  onChange={(e) => set("year", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="f-inventory">Inventory</Label>
              <Input
                id="f-inventory"
                type="number"
                min="0"
                value={form.inventory}
                onChange={(e) => set("inventory", e.target.value)}
                placeholder='Leave blank for "one of one"'
              />
            </div>
            <div>
              <Label htmlFor="f-fit">Fit note</Label>
              <Input
                id="f-fit"
                value={form.fitNote}
                onChange={(e) => set("fitNote", e.target.value)}
                placeholder="e.g. Runs small, tag says L fits M"
              />
            </div>
          </div>

          {/* ——— Right column: pricing, story & options ——— */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="f-price" required>Price</Label>
                <Input
                  id="f-price"
                  type="number"
                  min="1"
                  step="any"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="e.g. 85"
                />
              </div>
              <div>
                <Label htmlFor="f-compare">Compare-at</Label>
                <Input
                  id="f-compare"
                  type="number"
                  min="0"
                  step="any"
                  value={form.compareAt}
                  onChange={(e) => set("compareAt", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="f-story">Story</Label>
              <Textarea
                id="f-story"
                rows={3}
                value={form.story}
                onChange={(e) => set("story", e.target.value)}
                placeholder="Where it came from, what it's been through"
              />
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((t) => (
                  <Badge
                    key={t}
                    variant={form.tags.includes(t) ? "primary" : "default"}
                    size="md"
                    className="cursor-pointer select-none"
                    onClick={() => toggle("tags", t)}
                    role="button"
                    aria-pressed={form.tags.includes(t)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Sizes</Label>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <Badge
                    key={s}
                    variant={form.sizes.includes(s) ? "primary" : "default"}
                    size="md"
                    className="cursor-pointer select-none"
                    onClick={() => toggle("sizes", s)}
                    role="button"
                    aria-pressed={form.sizes.includes(s)}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <Checkbox
                label="Featured"
                checked={form.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
              <Checkbox
                label="Visible on the rack"
                checked={form.visible}
                onChange={(e) => set("visible", e.target.checked)}
              />
            </div>
          </div>

          {/* ——— Full width: photos ——— */}
          <div className="lg:col-span-2">
            <Label>
              Product Photos{" "}
              <span className="font-normal normal-case text-taupe">
                (first photo is the cover)
              </span>
            </Label>
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
                    <Badge
                      variant="primary"
                      size="sm"
                      className="absolute bottom-1 left-1 bg-espresso/70 normal-case"
                    >
                      Cover
                    </Badge>
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
              {form.images.length < maxProductImages && (
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
                        if (form.images.length + fresh.length >= maxProductImages) break;
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

          </div>
        </div>

        {/* ——— Fixed footer ——— */}
        <div className="relative z-10 shrink-0 border-t border-border px-6 py-4 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              {initial ? "Save changes" : "Add to the rack"}
            </Button>
          </div>
          {!valid && (
            <p className="mt-2 text-xs text-sale">
              A name and a price above 0 are required.
            </p>
          )}
        </div>
      </form>
    </Modal>
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

/* ————— settings panel ————— */

function SettingsPanel() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    getDbSettings().then((db) => {
      setSettings(db);
      setLoading(false);
    });
  }, []);

  const getSettingValue = (key: string, defaultValue: string) =>
    settings[key] ?? defaultValue;

  const setSettingValue = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveSettingsAction(settings);
      if (res.ok) {
        toast("success", "Settings saved.");
        setDirty(false);
        window.location.reload();
      } else {
        toast("error", res.error ?? "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key: string) => {
    const res = await resetSettingAction(key);
    if (res.ok) {
      setSettings((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast("success", `Reset "${key}" to default.`);
    } else {
      toast("error", res.error ?? "Failed to reset");
    }
  };

  if (loading) {
    return (
      <div className="mt-8 flex items-center gap-3 text-sm text-mocha">
        <Spinner size="sm" />
        Loading settings…
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl tracking-tight text-espresso">
            Site settings
          </h2>
          <p className="mt-1 text-sm text-mocha">
            Changes take effect after saving. Some changes reload the page.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          loading={saving}
        >
          {saving ? "Saving…" : "Save all"}
        </Button>
      </div>

      {SETTING_SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {section.settings.map((s) => (
              <div key={s.key}>
                <Label htmlFor={`setting-${s.key}`}>{s.label}</Label>
                <div className="flex items-center gap-2">
                  {"type" in s && s.type === "number" ? (
                    <Input
                      id={`setting-${s.key}`}
                      type="number"
                      value={getSettingValue(s.key, s.default)}
                      onChange={(e) =>
                        setSettingValue(s.key, e.target.value)
                      }
                      className="flex-1 bg-linen"
                    />
                  ) : s.key.includes("Body") || s.key.includes("Description") || s.key.includes("Copy") ? (
                    <Textarea
                      id={`setting-${s.key}`}
                      rows={3}
                      value={getSettingValue(s.key, s.default)}
                      onChange={(e) =>
                        setSettingValue(s.key, e.target.value)
                      }
                      className="flex-1 bg-linen"
                    />
                  ) : (
                    <Input
                      id={`setting-${s.key}`}
                      type="text"
                      value={getSettingValue(s.key, s.default)}
                      onChange={(e) =>
                        setSettingValue(s.key, e.target.value)
                      }
                      className="flex-1 bg-linen"
                    />
                  )}
                  {settings[s.key] !== undefined && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleReset(s.key)}
                      title="Reset to default"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                    </Button>
                  )}
                </div>
                {settings[s.key] === undefined && (
                  <p className="mt-1 text-[11px] text-taupe">
                    Using default: {s.default.length > 60 ? s.default.slice(0, 60) + "…" : s.default}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

const statusBadgeVariant: Record<OrderStatus, "muted" | "success" | "danger"> = {
  pending: "muted",
  delivered: "success",
  failed: "danger",
};

const statusLabel: Record<OrderStatus, string> = {
  pending: "Pending",
  delivered: "Delivered",
  failed: "Failed",
};

export function AdminDashboard({
  initialProducts,
  initialOrders,
}: {
  initialProducts: Product[];
  initialOrders: AdminOrder[];
}) {
  const adminHeading = useSiteSetting("adminHeading", "Manage the rack");
  const adminDescription = useSiteSetting("adminDescription", "Changes are saved to the database and update the shop instantly.");
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [tab, setTab] = useState<"products" | "orders" | "settings">("products");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<
    { mode: "new" } | { mode: "edit"; product: Product } | null
  >(null);

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
          toast("success", `"${res.product.name}" updated.`);
          setEditor(null);
        } else {
          toast("error", res.error);
        }
      } else {
        const res = await createProductAction(input);
        if (res.ok) {
          setProducts((prev) => [res.product, ...prev]);
          toast("success", `"${res.product.name}" added to the rack.`);
          setEditor(null);
        } else {
          toast("error", res.error);
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
        toast("error", res.error);
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
        toast("success", `"${p.name}" removed.`);
      } else {
        toast("error", res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setBusy(true);
    try {
      const res = await updateOrderStatusAction(orderId, status);
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
        toast("success", `Order ${orderId} marked as ${statusLabel[status]}.`);
      } else {
        toast("error", res.error);
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
            {useSiteSetting("siteName", "KojoRopa")} admin
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-tight text-espresso sm:text-4xl">
            {tab === "products" ? adminHeading : "Orders"}
          </h1>
          <p className="mt-1 text-sm text-mocha">
            {tab === "products"
              ? adminDescription
              : `${orders.length} order${orders.length === 1 ? "" : "s"} placed so far.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={logoutAction}>
            <Button type="submit" variant="secondary" size="sm">
              Sign out
            </Button>
          </form>
          {tab === "products" && (
            <Button
              onClick={() => setEditor({ mode: "new" })}
              disabled={busy}
              size="sm"
            >
              + Add item
            </Button>
          )}
        </div>
      </div>

      {/* tabs */}
      <div className="mt-6 flex gap-1 rounded-full bg-surface p-1 ring-1 ring-border/50 w-fit">
        {(["products", "orders", "settings"] as const).map((t) => (
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
            {t === "products" ? "Products" : t === "orders" ? "Orders" : "Settings"}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <>
          {/* stats */}
          <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "Total", value: stats.total },
              { label: "Visible", value: stats.visible },
              { label: "Hidden", value: stats.hidden },
            ].map((s) => (
              <Card key={s.label} padding="sm" className="text-center sm:p-5">
                <p className="font-display text-2xl sm:text-3xl text-espresso">{s.value}</p>
                <p className="mt-1 text-[10px] sm:text-xs tracking-wide text-mocha">{s.label}</p>
              </Card>
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
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items"
              aria-label="Search admin items"
              className="rounded-full bg-surface py-2.5 pr-4 pl-10"
            />
          </div>

          {/* list */}
          {list.length === 0 ? (
            <div className="mt-10">
              <EmptyState
                icon="🔍"
                title="The rack is empty"
                description="Add your first piece and it will appear on the shop immediately."
                action={
                  <Button
                    onClick={() => setEditor({ mode: "new" })}
                    size="sm"
                    className="mt-2"
                  >
                    + Add item
                  </Button>
                }
              />
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
                        <Badge variant="muted" size="sm">Hidden</Badge>
                      )}
                      {p.featured && (
                        <Badge variant="warning" size="sm">Featured</Badge>
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
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditor({ mode: "edit", product: p })}
                      aria-label={`Edit ${p.name}`}
                      title="Edit"
                    >
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleVisible(p)}
                      aria-label={p.visible === false ? "Show on rack" : "Hide from rack"}
                      title={p.visible === false ? "Show" : "Hide"}
                      className="hidden sm:flex"
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
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(p)}
                      aria-label={`Delete ${p.name}`}
                      title="Delete"
                      className="hidden sm:flex text-mocha hover:bg-sale/10 hover:text-sale"
                    >
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                      </svg>
                    </Button>
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
            <div className="mt-10">
              <EmptyState
                icon="📦"
                title="No orders yet"
                description="Orders will appear here as customers check out."
              />
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-espresso">
                          {order.name}
                        </p>
                        <Badge variant={statusBadgeVariant[order.status]} size="sm">
                          {statusLabel[order.status]}
                        </Badge>
                      </div>
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

                  {/* status controls */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                    <span className="text-[11px] font-medium text-mocha">Status:</span>
                    {ORDER_STATUSES.map((s) => (
                      <Button
                        key={s}
                        variant={order.status === s ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => handleStatusChange(order.id, s)}
                        disabled={busy || order.status === s}
                        className="text-[11px] px-3 py-1"
                      >
                        {statusLabel[s]}
                      </Button>
                    ))}
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

      {tab === "settings" && (
        <SettingsPanel />
      )}
    </div>
  );
}
