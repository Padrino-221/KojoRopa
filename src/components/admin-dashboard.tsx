"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import { ShirtArt } from "@/components/shirt-art";
import { AdminSidebar } from "@/components/admin-sidebar";
import { compressImage } from "@/lib/image";
import {
  CONDITIONS,
} from "@/lib/products";
import {
  parseCategories,
  parseSizes,
  DEFAULT_CATEGORIES_RAW,
  DEFAULT_SIZES_RAW,
} from "@/lib/catalog";
import type { Product, ProductCategory, ShirtPattern } from "@/lib/products";
import { formatPrice, formatOrderDate } from "@/lib/format";
import type { ProductInput } from "@/lib/validators";
import {
  createProductAction,
  deleteProductAction,
  setProductSoldAction,
  updateProductAction,
} from "@/lib/actions/products";
import { uploadProductImageAction } from "@/lib/actions/upload";
import { updateOrderStatusAction, type OrderStatus } from "@/lib/actions/orders";
import { ORDER_STATUSES } from "@/lib/order-status";
import { useSiteSetting } from "@/components/site-settings-provider";
import { ChangePassword } from "@/components/admin-change-password";
import {
  getDbSettings,
  saveSettingsAction,
  resetSettingAction,
} from "@/lib/actions/settings";
import { getAuditLogAction } from "@/lib/actions/audit";
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
import { DateRangePicker } from "@/components/ui/date-range-picker";

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
  phone: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  street: string;
  city: string;
  postal: string;
  country: string;
  status: OrderStatus;
  moolreSessionId: string | null;
  moolreTransactionId: string | null;
  items: AdminOrderItem[];
}

interface AdminLogRow {
  id: string;
  event: string;
  detail: string;
  ip: string | null;
  createdAt: Date | string;
}

/* ————— add / edit form ————— */

interface FormState {
  name: string;
  tagline: string;
  price: string;
  compareAt: string;
  category: string;
  condition: string;
  sizes: string[];
  images: string[];
  story: string;
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
    sizes: product.sizes,
    images:
      product.images && product.images.length > 0
        ? product.images
        : product.image
          ? [product.image]
          : [],
    story: product.story,
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
    sizes: [],
    images: [],
    story: "",
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
  const categoriesRaw = useSiteSetting("categories", DEFAULT_CATEGORIES_RAW);
  const sizesRaw = useSiteSetting("sizes", DEFAULT_SIZES_RAW);
  const categoryOptions = useMemo(
    () => parseCategories(categoriesRaw),
    [categoriesRaw]
  );
  const sizeOptions = useMemo(() => parseSizes(sizesRaw), [sizesRaw]);
  const [form, setForm] = useState<FormState>(
    initial
      ? toForm(initial)
      : { ...emptyForm(), category: categoryOptions[0]?.value ?? "tee" }
  );
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (key: "sizes", value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((v) => v !== value)
        : [...f[key], value],
    }));

  const moveImage = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= form.images.length) return;
    set(
      "images",
      form.images.map((src, i, arr) => {
        if (i === index) return arr[target];
        if (i === target) return arr[index];
        return src;
      })
    );
  };

  const price = parseFloat(form.price);
  const valid = form.name.trim().length > 0 && price > 0;
  const saving = uploading > 0;

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
      sizes: form.sizes,
      images: form.images,
      story: form.story.trim(),
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
                {initial ? "Edit piece" : "Add New Piece"}
              </h2>
              <p className="mt-1 text-sm text-mocha">
                {initial ? "Update the details below." : "Fill in the details to list a new piece."}
              </p>
            </div>
            <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-cream">
              <ShirtArt art={previewArt} className="h-full w-full" />
            </div>
          </div>
        </div>

        {/* ——— Scrollable body ——— */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 sm:px-8">

          {/* upload zone */}
          {form.images.length === 0 && (
            <label className="mb-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-sand-deep bg-cream/50 px-6 py-12 text-center transition-colors hover:border-clay/40 hover:bg-clay-light/30 disabled:pointer-events-none disabled:opacity-50">
              {uploading > 0 ? (
                <Spinner className="mb-3 h-10 w-10 text-taupe" />
              ) : (
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-cream">
                  <i className="ph-duotone ph-image h-7 w-7 text-taupe" />
                </div>
              )}
              <p className="text-sm font-semibold text-espresso">
                {uploading > 0 ? "Uploading…" : "Upload photos"}
              </p>
              <p className="mt-1 text-xs text-taupe">JPG, PNG. Max 5MB each</p>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading > 0}
                className="sr-only"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length === 0) return;
                  const remaining = maxProductImages - form.images.length;
                  const toAdd = files.slice(0, remaining);
                  setUploading((n) => n + toAdd.length);
                  setUploadError(null);
                  const fresh: string[] = [];
                  for (const file of toAdd) {
                    try {
                      const dataUrl = await compressImage(file);
                      const res = await uploadProductImageAction(dataUrl);
                      if (res.ok) {
                        fresh.push(res.url);
                      } else {
                        setUploadError(res.error);
                      }
                    } catch {
                      /* skip unreadable files */
                    }
                    setUploading((n) => n - 1);
                  }
                  if (fresh.length > 0)
                    set("images", [...form.images, ...fresh]);
                  e.target.value = "";
                }}
              />
            </label>
          )}

          {/* uploaded photos grid */}
          {form.images.length > 0 && (
            <div className="mb-6">
              <Label>
                Product Photos{" "}
                <span className="font-normal normal-case text-taupe">
                  (first photo is the cover — use the arrows to reorder)
                </span>
              </Label>
              {uploadError && (
                <p role="alert" className="mb-2 w-full text-xs text-sale">
                  {uploadError}
                </p>
              )}
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
                      <i className="ph-duotone ph-x h-3 w-3" />
                    </button>
                    {form.images.length > 1 && (
                      <div className="absolute bottom-1 right-1 flex gap-1">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => moveImage(i, -1)}
                          aria-label="Move photo earlier"
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-espresso/60 text-white transition-colors hover:bg-espresso disabled:pointer-events-none disabled:opacity-40"
                        >
                          <i className="ph-duotone ph-caret-up h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={i === form.images.length - 1}
                          onClick={() => moveImage(i, 1)}
                          aria-label="Move photo later"
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-espresso/60 text-white transition-colors hover:bg-espresso disabled:pointer-events-none disabled:opacity-40"
                        >
                          <i className="ph-duotone ph-caret-down h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {form.images.length < maxProductImages && (
                  <label className="flex h-28 w-28 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-sand-deep bg-cream/50 transition-colors hover:border-clay/40 hover:bg-cream disabled:pointer-events-none disabled:opacity-50">
                    {uploading > 0 ? (
                      <Spinner className="h-7 w-7 text-taupe" />
                    ) : (
                      <i className="ph-duotone ph-image h-8 w-8 text-taupe" />
                    )}
                    <span className="mt-1 text-[10px] font-medium text-taupe">
                      {uploading > 0 ? "Uploading…" : "Add photo"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploading > 0}
                      className="sr-only"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length === 0) return;
                        const remaining = maxProductImages - form.images.length;
                        const toAdd = files.slice(0, remaining);
                        setUploading((n) => n + toAdd.length);
                        setUploadError(null);
                        const fresh: string[] = [];
                        for (const file of toAdd) {
                          try {
                            const dataUrl = await compressImage(file);
                            const res = await uploadProductImageAction(dataUrl);
                            if (res.ok) {
                              fresh.push(res.url);
                            } else {
                              setUploadError(res.error);
                            }
                          } catch {
                            /* skip unreadable files */
                          }
                          setUploading((n) => n - 1);
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
          )}

          <div className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2">
          {/* ——— Left column: identity & classification ——— */}
          <div className="space-y-4">
            <div className="lg:col-span-2">
              <Label htmlFor="f-name" required>Piece name</Label>
              <Input
                id="f-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Hand-dyed Kente Scarf"
              />
            </div>
            <div>
              <Label>Category</Label>
              <CustomSelect
                value={form.category}
                onChange={(v) => set("category", v)}
                options={categoryOptions.map((c) => ({
                  value: c.value,
                  label: c.label,
                }))}
              />
            </div>
            <div>
              <Label>Size</Label>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((s) => (
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

          {/* ——— Right column: pricing, story & options ——— */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="f-price" required>Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-mocha pointer-events-none">GH₵</span>
                <Input
                  id="f-price"
                  type="number"
                  min="1"
                  step="any"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0.00"
                  className="pl-12"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="f-story">Description</Label>
              <Textarea
                id="f-story"
                rows={4}
                value={form.story}
                onChange={(e) => set("story", e.target.value)}
                placeholder="Describe the piece — fabric, origin, story..."
              />
            </div>
            <div>
              <Label htmlFor="f-tagline">Tagline</Label>
              <Input
                id="f-tagline"
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                placeholder="e.g. kente, handmade, unisex (comma separated)"
              />
            </div>
          </div>

          {/* ——— Full width: feature toggle ——— */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between rounded-xl border border-sand bg-white px-4 py-4">
              <div>
                <p className="text-[13px] font-semibold text-espresso">Feature this piece</p>
                <p className="text-xs text-taupe">Display on homepage spotlight</p>
              </div>
              <label className="relative h-6 w-11 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="peer sr-only"
                />
                <span className="absolute inset-0 rounded-full bg-sand-deep transition-colors peer-checked:bg-clay" />
                <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </label>
            </div>
          </div>

          </div>
        </div>

        {/* ——— Fixed footer ——— */}
        <div className="relative z-10 shrink-0 border-t border-sand px-6 py-4 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Save as draft
              </Button>
              <Button type="submit" disabled={!valid || saving}>
                {saving ? "Uploading photos…" : initial ? "Save changes" : "List piece"}
              </Button>
            </div>
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
    sizes: p.sizes,
    images:
      p.images && p.images.length > 0
        ? p.images
        : p.image
          ? [p.image]
          : [],
    story: p.story,
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

function SettingsPanel({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    // Start with the first section open so the page isn't one long scroll.
    const init: Record<string, boolean> = {};
    SETTING_SECTIONS.forEach((sec, i) => {
      init[sec.title] = i !== 0;
    });
    return init;
  });

  useEffect(() => {
    getDbSettings().then((db) => {
      // The password hash is managed by the Security card — keep it out of
      // the bulk save flow entirely.
      const { adminPasswordHash: _omit, ...rest } = db;
      setSettings(rest);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

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
            <button
              type="button"
              onClick={() =>
                setCollapsed((c) => ({ ...c, [section.title]: !c[section.title] }))
              }
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={!collapsed[section.title]}
            >
              <CardTitle>{section.title}</CardTitle>
              <span
                aria-hidden
                className={`text-taupe transition-transform duration-200 ${
                  collapsed[section.title] ? "" : "rotate-180"
                }`}
              >
                <i className="ph-duotone ph-caret-down h-4 w-4" />
              </span>
            </button>
          </CardHeader>
          {!collapsed[section.title] && (
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
                  ) : ("type" in s && s.type === "textarea") ||
                    s.key.includes("Body") ||
                    s.key.includes("Description") ||
                    s.key.includes("Copy") ? (
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
                      <i className="ph-duotone ph-arrow-clockwise h-4 w-4" />
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
          )}
        </Card>
      ))}

      {/* security */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <p className="mt-1 text-sm text-mocha">
            Change the admin dashboard password.
          </p>
        </CardHeader>
        <ChangePassword />
      </Card>
    </div>
  );
}

const statusBadgeVariant: Record<OrderStatus, "muted" | "success" | "danger"> = {
  pending: "muted",
  paid: "success",
  delivered: "success",
  failed: "danger",
};

const statusLabel: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  delivered: "Delivered",
  failed: "Failed",
};

const eventBadgeVariant: Record<string, "muted" | "success" | "danger" | "warning"> = {
  "login.success": "success",
  "login.failed": "danger",
  logout: "muted",
  "order.create": "muted",
  "order.status": "success",
  "order.delete": "danger",
  "order.payment": "warning",
  "product.create": "warning",
  "product.update": "warning",
  "product.delete": "danger",
  "setting.update": "muted",
  "setting.reset": "muted",
  "settings.bulk_update": "muted",
  "webhook.moolre": "muted",
};

/* ————— confirm dialog ————— */

interface ConfirmState {
  title: string;
  body: string;
  confirmLabel: string;
  run: () => Promise<void> | void;
}

function ConfirmDialog({
  confirm,
  busy,
  onConfirm,
  onClose,
}: {
  confirm: ConfirmState;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} size="sm">
      <div className="p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sale/10 text-sale">
          <i className="ph-duotone ph-trash h-5 w-5" />
        </div>
        <h2 className="mt-4 font-display text-xl tracking-tight text-espresso">
          {confirm.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-mocha">
          {confirm.body}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={busy}
            loading={busy}
          >
            {confirm.confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ————— order detail slide-over ————— */

function OrderDrawer({
  order,
  busy,
  onClose,
  onStatusChange,
}: {
  order: AdminOrder | null;
  busy: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!order) return;
    panelRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [order, onClose]);

  if (!order) return null;
  const paymentConfirmed =
    order.status === "paid" || order.status === "delivered";

  // Current position of the red-dot indicator. It advances as the item
  // progresses and stays on "Delivered" once complete so the dot never vanishes.
  const currentStep =
    order.status === "paid" ? 2 : order.status === "delivered" ? 3 : 0;

  return (
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true" aria-label={`Order ${order.id}`}>
      {/* overlay */}
      <button
        type="button"
        aria-label="Close order"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in cursor-default bg-espresso/40 backdrop-blur-sm"
      />

      {/* panel */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-full max-w-[720px] animate-slide-in flex-col border-l border-sand bg-cream focus:outline-none"
      >
        {/* topbar */}
        <div className="flex items-center gap-3 border-b border-sand bg-white px-6 py-3.5">
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Go back">
            <i className="ph-duotone ph-caret-left h-4 w-4" />
          </Button>
          <h2 className="font-display text-[17px] font-bold tracking-tight text-espresso">
            Order #{order.id.slice(-4)}
          </h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            order.status === "paid" ? "bg-green-light text-green" :
            order.status === "delivered" ? "bg-green-light text-green" :
            order.status === "pending" ? "bg-amber-light text-amber" :
            "bg-red-50 text-red-600"
          }`}>
            {statusLabel[order.status]}
          </span>
        </div>

        {/* body — two-column grid */}
        <div className="thin-scroll flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
            {/* left column */}
            <div className="flex flex-col gap-5">
              {/* order details card */}
              <div className="overflow-hidden rounded-xl border border-sand bg-white">
                <div className="border-b border-sand px-5 py-4">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-espresso">Order Details</h3>
                </div>
                <div className="p-5">
                  <div className="flex gap-4">
                    <div className="flex h-[120px] w-[100px] shrink-0 items-center justify-center rounded-xl bg-espresso">
                      {order.items[0] ? (
                        <i className="ph-duotone ph-t-shirt h-10 w-10 text-taupe" />
                      ) : (
                        <i className="ph-duotone ph-package h-10 w-10 text-taupe" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="font-display text-base font-semibold text-espresso">
                        {order.items[0]?.name ?? "Order"}
                      </p>
                      <p className="text-[13px] text-taupe">{order.items[0]?.size ? `Size ${order.items[0].size}` : ""}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-[13px] text-mocha">
                        {order.items[0]?.size && (
                          <span><strong className="font-semibold text-espresso">Size</strong> {order.items[0].size}</span>
                        )}
                      </div>
                      <p className="mt-auto font-display text-xl font-semibold text-clay">
                        {formatPrice(order.total)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* timeline card */}
              <div className="overflow-hidden rounded-xl border border-sand bg-white">
                <div className="border-b border-sand px-5 py-4">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-espresso">Order Timeline</h3>
                </div>
                <div className="p-5">
                  <div className="flex flex-col">
                    {[
                      { label: "Order placed", date: formatOrderDate(order.placedAt) },
                      { label: "Payment confirmed", date: paymentConfirmed ? formatOrderDate(order.placedAt) : "—" },
                      { label: "Preparing for pickup", date: order.status === "paid" ? "In progress" : order.status === "delivered" ? formatOrderDate(order.placedAt) : "—" },
                      { label: "Delivered", date: order.status === "delivered" ? formatOrderDate(order.placedAt) : "—" },
                    ].map((step, i) => {
                      const isCurrent = i === currentStep;
                      const done = i < currentStep;
                      return (
                        <div key={i} className="flex gap-4 pb-6 last:pb-0">
                          <div className="flex flex-col items-center">
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                              isCurrent ? "bg-clay" : done ? "bg-green" : "bg-sand"
                            }`}>
                              {isCurrent ? (
                                <div className="h-2 w-2 rounded-full bg-white" />
                              ) : done ? (
                                <i className="ph-duotone ph-check h-3 w-3 text-white" />
                              ) : null}
                            </div>
                            {i < 3 && <div className={`mt-1 w-0.5 flex-1 ${i < currentStep ? "bg-green" : isCurrent ? "bg-clay" : "bg-sand"}`} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold ${isCurrent ? "text-clay" : done ? "text-espresso" : "text-taupe"}`}>
                              {isCurrent ? <span className="text-clay">{step.label}</span> : step.label}
                            </p>
                            <p className="text-xs text-taupe">{step.date}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* right column */}
            <div className="flex flex-col gap-5">
              {/* customer card */}
              <div className="overflow-hidden rounded-xl border border-sand bg-white">
                <div className="border-b border-sand px-5 py-4">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-espresso">Customer</h3>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-clay-light text-sm font-bold text-clay">
                      {order.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-espresso">{order.name}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[13px] text-mocha">
                    <i className="ph-duotone ph-envelope h-4 w-4 shrink-0 text-taupe" />
                    {order.email}
                  </div>
                  {order.phone && (
                    <div className="mt-1.5 flex items-center gap-2 text-[13px] text-mocha">
                      <i className="ph-duotone ph-phone h-4 w-4 shrink-0 text-taupe" />
                      {order.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* delivery card */}
              <div className="overflow-hidden rounded-xl border border-sand bg-white">
                <div className="border-b border-sand px-5 py-4">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-espresso">Delivery</h3>
                </div>
                <div className="divide-y divide-cream p-5">
                  <div className="flex justify-between py-2">
                    <span className="text-[13px] text-taupe">Type</span>
                    <span className="text-[13px] font-semibold text-espresso">Delivery</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-[13px] text-taupe">Location</span>
                    <span className="text-[13px] font-semibold text-espresso">{order.city}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-[13px] text-taupe">Address</span>
                    <span className="text-right text-[13px] font-semibold text-espresso">
                      {order.street}{order.postal ? `, ${order.postal}` : ""}, {order.country}
                    </span>
                  </div>
                </div>
              </div>

              {/* actions card */}
              <div className="overflow-hidden rounded-xl border border-sand bg-white">
                <div className="border-b border-sand px-5 py-4">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-espresso">Actions</h3>
                </div>
                <div className="flex flex-col gap-2.5 p-5">
                  <Button
                    onClick={() => onStatusChange(order.id, order.status === "paid" ? "delivered" : "paid")}
                    disabled={busy || order.status === "delivered"}
                    className="w-full"
                  >
                    {order.status === "paid" ? "Mark as delivered" : order.status === "pending" ? "Mark as paid" : "Completed"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ————— pagination ————— */

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const items: (number | "…")[] = [];
  let last = 0;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 2) {
      if (p - last > 1) items.push("…");
      items.push(p);
      last = p;
    }
  }

  const arrow =
    "flex h-9 w-9 items-center justify-center rounded-full text-mocha transition-all duration-200 hover:bg-cream hover:text-espresso active:scale-95 disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className={arrow}
      >
        <i className="ph-duotone ph-caret-left h-4 w-4" />
      </button>
      {items.map((item, i) =>
        item === "…" ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-sm text-taupe">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={`h-9 min-w-9 rounded-full px-2.5 text-sm tabular-nums transition-all duration-200 active:scale-95 ${
              item === page
                ? "bg-espresso text-white"
                : "text-mocha hover:bg-cream hover:text-espresso"
            }`}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        className={arrow}
      >
        <i className="ph-duotone ph-caret-right h-4 w-4" />
      </button>
    </nav>
  );
}

/* ————— dashboard ————— */

type AdminView = "dashboard" | "products" | "orders" | "settings" | "activity";

const ORDERS_PAGE_SIZE = 10;
const LOG_PAGE_SIZE = 20;

export function AdminDashboard({
  initialProducts,
  initialOrders,
  initialLog,
  initialLogTotal,
}: {
  initialProducts: Product[];
  initialOrders: AdminOrder[];
  initialLog: AdminLogRow[];
  initialLogTotal: number;
}) {
  // Admin chrome text is fixed — no longer configurable via site settings.
  const adminHeading = "Manage the rack";
  const adminDescription = "Changes are saved to the database and update the shop instantly.";
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [log, setLog] = useState<AdminLogRow[]>(initialLog);
  const [logTotal, setLogTotal] = useState(initialLogTotal);
  const [view, setView] = useState<AdminView>("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<
    { mode: "new" } | { mode: "edit"; product: Product } | null
  >(null);
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [menu, setMenu] = useState<{ slug: string; top: number; left: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [topbarMenu, setTopbarMenu] = useState<"notifications" | "messages" | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const logRequestRef = useRef(0);
  const closeOrder = useCallback(() => setActiveOrder(null), []);

  /* '/' focuses the product search */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (e.key !== "/" || typing || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      setView("products");
      requestAnimationFrame(() => searchRef.current?.focus());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* reset to the first page when order filters change */
  useEffect(() => {
    setOrdersPage(1);
  }, [statusFilter, dateRange.from, dateRange.to]);

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "pending").length,
    [orders]
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
        )
        .slice(0, 6),
    [orders]
  );
  const recentLog = useMemo(() => log.slice(0, 6), [log]);

  const orderStats = useMemo(
    () => ({
      pending: pendingCount,
      paid: orders.filter((o) => o.status === "paid").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      failed: orders.filter((o) => o.status === "failed").length,
      revenue: orders
        .filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + o.total, 0),
    }),
    [orders, pendingCount]
  );

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
        toast("success", res.product.visible ? `"${p.name}" is back on the rack.` : `"${p.name}" hidden.`);
      } else {
        toast("error", res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleSold = async (p: Product) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await setProductSoldAction(p.slug, !p.sold);
      if (res.ok) {
        setProducts((prev) =>
          prev.map((x) => (x.slug === p.slug ? res.product : x))
        );
        toast("success", res.product.sold ? `"${p.name}" marked as sold.` : `"${p.name}" is back on the rack.`);
      } else {
        toast("error", res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const requestDelete = (p: Product) => {
    setConfirm({
      title: `Remove “${p.name}”?`,
      body: "This permanently removes the piece from the catalog. The action is recorded in the audit log and can't be undone.",
      confirmLabel: "Remove piece",
      run: async () => {
        const res = await deleteProductAction(p.slug);
        if (res.ok) {
          setProducts((prev) => prev.filter((x) => x.slug !== p.slug));
          toast("success", `“${p.name}” removed.`);
        } else {
          toast("error", res.error);
        }
      },
    });
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setBusy(true);
    try {
      const res = await updateOrderStatusAction(orderId, status);
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
        setActiveOrder((cur) => (cur && cur.id === orderId ? { ...cur, status } : cur));
        toast("success", `Order ${orderId} marked as ${statusLabel[status]}.`);
      } else {
        toast("error", res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      await confirm.run();
    } catch {
      toast("error", "Something went wrong. Please try again.");
    } finally {
      setConfirmBusy(false);
      setConfirm(null);
    }
  };

  /* warn before closing with unsaved settings */
  useEffect(() => {
    if (!settingsDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [settingsDirty]);

  const handleViewChange = (v: AdminView) => {
    if (v !== "settings" && view === "settings" && settingsDirty) {
      setConfirm({
        title: "Unsaved settings",
        body: "You have unsaved changes in Site settings. They will be lost if you leave this page.",
        confirmLabel: "Leave anyway",
        run: () => {
          setSettingsDirty(false);
          setView(v);
          setSearch("");
        },
      });
      return;
    }
    setView(v);
    setSearch("");
  };

  const stats = useMemo(
    () => ({
      total: products.length,
      visible: products.filter((p) => p.visible !== false).length,
      hidden: products.filter((p) => p.visible === false).length,
      sold: products.filter((p) => p.sold).length,
    }),
    [products]
  );

  const list = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = query
      ? products.filter((p) =>
          [p.name, p.tagline, p.category]
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      : products;
    return [...base].sort(
      (a, b) =>
        Number(b.visible !== false) - Number(a.visible !== false)
    );
  }, [products, search]);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (dateRange.from || dateRange.to) {
      const placed = new Date(o.placedAt);
      if (dateRange.from) {
        const from = new Date(dateRange.from + "T00:00:00");
        if (placed < from) return false;
      }
      if (dateRange.to) {
        const to = new Date(dateRange.to + "T23:59:59");
        if (placed > to) return false;
      }
    }
    return true;
  });

  const ordersTotalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ORDERS_PAGE_SIZE)
  );
  const currentOrdersPage = Math.min(ordersPage, ordersTotalPages);
  const pagedOrders = filteredOrders.slice(
    (currentOrdersPage - 1) * ORDERS_PAGE_SIZE,
    currentOrdersPage * ORDERS_PAGE_SIZE
  );

  const logTotalPages = Math.max(1, Math.ceil(logTotal / LOG_PAGE_SIZE));
  const currentLogPage = Math.min(logPage, logTotalPages);
  const logStart = log.length === 0 ? 0 : (currentLogPage - 1) * LOG_PAGE_SIZE + 1;
  const logEnd = Math.min(logTotal, currentLogPage * LOG_PAGE_SIZE);

  const ordersStart =
    pagedOrders.length === 0 ? 0 : (currentOrdersPage - 1) * ORDERS_PAGE_SIZE + 1;
  const ordersEnd = Math.min(
    filteredOrders.length,
    currentOrdersPage * ORDERS_PAGE_SIZE
  );

  /* ————— bulk selection ————— */
  const allSelected = list.length > 0 && list.every((p) => selected.has(p.id));
  const toggleSelect = (id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const toggleSelectAll = (on: boolean) =>
    setSelected(on ? new Set(list.map((p) => p.id)) : new Set());
  const clearSelected = () => setSelected(new Set());

  const bulkSetVisible = async (show: boolean) => {
    if (busy || selected.size === 0) return;
    setBusy(true);
    const targets = products.filter((p) => selected.has(p.id));
    try {
      const results = await Promise.all(
        targets.map(async (p) => {
          const res = await updateProductAction(p.slug, {
            ...productToInput(p),
            visible: show,
          });
          return { p, ok: res.ok };
        })
      );
      const okIds = new Set(
        results.filter((r) => r.ok).map((r) => r.p.id)
      );
      const failed = results.length - okIds.size;
      setProducts((prev) =>
        prev.map((p) => (okIds.has(p.id) ? { ...p, visible: show } : p))
      );
      if (failed > 0) {
        toast(
          "error",
          `${failed} ${failed === 1 ? "piece" : "pieces"} could not be updated.`
        );
      } else {
        toast(
          "success",
          `${selected.size} ${selected.size === 1 ? "piece" : "pieces"} ${show ? "shown" : "hidden"}.`
        );
      }
      clearSelected();
    } finally {
      setBusy(false);
    }
  };

  const requestBulkDelete = () => {
    const count = selected.size;
    setConfirm({
      title: `Remove ${count} ${count === 1 ? "piece" : "pieces"}?`,
      body: "This permanently removes every selected piece from the catalog. The action is recorded in the audit log and can't be undone.",
      confirmLabel: `Remove ${count}`,
      run: async () => {
        const targets = products.filter((p) => selected.has(p.id));
        const results = await Promise.all(
          targets.map(async (p) => {
            const res = await deleteProductAction(p.slug);
            return { p, ok: res.ok };
          })
        );
        const okIds = new Set(
          results.filter((r) => r.ok).map((r) => r.p.id)
        );
        const failed = results.length - okIds.size;
        setProducts((prev) => prev.filter((p) => !okIds.has(p.id)));
        if (failed > 0) {
          toast(
            "error",
            `${failed} ${failed === 1 ? "piece" : "pieces"} could not be removed.`
          );
        } else {
          toast(
            "success",
            `${count} ${count === 1 ? "piece" : "pieces"} removed.`
          );
        }
        clearSelected();
      },
    });
  };

  const loadLogPage = useCallback(async (page: number) => {
    const requestId = ++logRequestRef.current;
    setLogLoading(true);
    try {
      const { rows, total } = await getAuditLogAction(page, LOG_PAGE_SIZE);
      if (requestId !== logRequestRef.current) return; // stale response
      setLog(rows);
      setLogTotal(total);
      setLogPage(page);
    } finally {
      if (requestId === logRequestRef.current) setLogLoading(false);
    }
  }, []);

  const headerCopy =
    view === "dashboard"
      ? adminDescription
      : view === "products"
        ? adminDescription
        : view === "orders"
          ? `${orders.length} order${orders.length === 1 ? "" : "s"} placed · ${pendingCount} pending`
          : view === "activity"
            ? "Every admin action, recorded."
            : "Changes take effect after saving. Some changes reload the page.";

  return (
    <div className="flex h-dvh overflow-hidden bg-cream">
      {/* sidebar */}
      <AdminSidebar
        activeView={view}
        onViewChange={handleViewChange}
        productCount={products.length}
        pendingOrderCount={pendingCount}
      />

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-[240px]">
        {/* topbar */}
        <div className="sticky top-0 z-[90] flex items-center justify-between border-b border-sand bg-white px-6 py-3.5 lg:px-8">
          <div className="flex items-center gap-4 pl-12 lg:pl-0">
            <h1 className="font-display text-[17px] font-bold tracking-tight text-espresso lg:text-xl">
              {view === "dashboard" ? "Dashboard" : view === "products" ? adminHeading : view === "orders" ? "Orders" : view === "activity" ? "Activity" : "Site settings"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* search — always visible */}
            <div className="relative hidden sm:block">
              <i className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-taupe ph-duotone ph-magnifying-glass" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                aria-label="Search"
                className="h-9 w-[220px] rounded-full bg-cream py-2 pr-3 pl-9 text-[13px] text-espresso outline-none transition-all placeholder:text-taupe focus:w-[280px] focus:bg-white focus:ring-1 focus:ring-sand-deep"
              />
            </div>
            {/* notification bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setTopbarMenu(topbarMenu === "notifications" ? null : "notifications")}
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                  topbarMenu === "notifications"
                    ? "border-clay bg-clay-light"
                    : "border-sand bg-white hover:border-clay"
                }`}
                aria-label="Notifications"
                aria-haspopup="true"
                aria-expanded={topbarMenu === "notifications"}
              >
                <i className="ph-duotone ph-bell h-[18px] w-[18px] text-mocha" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border-[1.5px] border-white bg-clay px-1 text-[10px] font-bold text-white">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </button>

              {topbarMenu === "notifications" && (
                <div className="absolute top-[calc(100%+8px)] right-0 z-[120] w-[320px] overflow-hidden rounded-xl border border-sand bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-sand px-4 py-3">
                    <p className="text-sm font-semibold text-espresso">Notifications</p>
                    <button type="button" onClick={() => setTopbarMenu(null)} className="text-taupe transition-colors hover:text-espresso" aria-label="Close notifications">
                      <i className="ph-duotone ph-x h-4 w-4" />
                    </button>
                  </div>
                  <div className="thin-scroll max-h-80 overflow-y-auto">
                    {recentOrders.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-taupe">No orders yet.</div>
                    ) : (
                      <ul>
                        {recentOrders.map((o) => (
                          <li key={o.id}>
                            <button
                              type="button"
                              onClick={() => { setActiveOrder(o); setTopbarMenu(null); }}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-cream"
                            >
                              <span className={`h-2 w-2 shrink-0 rounded-full ${o.status === "pending" ? "bg-amber" : o.status === "delivered" ? "bg-green" : "bg-clay"}`} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold text-espresso">New order · {o.name}</p>
                                <p className="text-[11px] text-taupe">#{o.id.slice(-4)} · {statusLabel[o.status]} · {formatOrderDate(o.placedAt)}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="border-t border-sand p-2">
                    <button type="button" onClick={() => { handleViewChange("orders"); setTopbarMenu(null); }} className="w-full rounded-lg py-2 text-center text-xs font-semibold text-clay transition-colors hover:bg-clay-light">
                      View all orders
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* messages */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setTopbarMenu(topbarMenu === "messages" ? null : "messages")}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                  topbarMenu === "messages"
                    ? "border-clay bg-clay-light"
                    : "border-sand bg-white hover:border-clay"
                }`}
                aria-label="Activities"
                aria-haspopup="true"
                aria-expanded={topbarMenu === "messages"}
              >
                <i className="ph-duotone ph-envelope h-[18px] w-[18px] text-mocha" />
              </button>

              {topbarMenu === "messages" && (
                <div className="absolute top-[calc(100%+8px)] right-0 z-[120] w-[320px] overflow-hidden rounded-xl border border-sand bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-sand px-4 py-3">
                    <p className="text-sm font-semibold text-espresso">Activities</p>
                    <button type="button" onClick={() => setTopbarMenu(null)} className="text-taupe transition-colors hover:text-espresso" aria-label="Close activities">
                      <i className="ph-duotone ph-x h-4 w-4" />
                    </button>
                  </div>
                  <div className="thin-scroll max-h-80 overflow-y-auto">
                    {recentLog.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-taupe">No activity yet.</div>
                    ) : (
                      <ul>
                        {recentLog.map((entry) => (
                          <li key={entry.id}>
                            <button
                              type="button"
                              onClick={() => { handleViewChange("activity"); setTopbarMenu(null); }}
                              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-cream"
                            >
                              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${eventBadgeVariant[entry.event] === "danger" ? "bg-sale" : eventBadgeVariant[entry.event] === "success" ? "bg-espresso" : "bg-taupe"}`} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold text-espresso">{entry.event}</p>
                                <p className="line-clamp-2 text-[11px] text-taupe">{entry.detail}</p>
                                <p className="mt-0.5 text-[10px] text-taupe">{formatOrderDate(entry.createdAt)}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="border-t border-sand p-2">
                    <button type="button" onClick={() => { handleViewChange("activity"); setTopbarMenu(null); }} className="w-full rounded-lg py-2 text-center text-xs font-semibold text-clay transition-colors hover:bg-clay-light">
                      View activity log
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* click-away backdrop when a topbar menu is open */}
            {topbarMenu && (
              <div className="fixed inset-0 z-[110]" onClick={() => setTopbarMenu(null)} aria-hidden />
            )}
            {view === "products" && (
              <Button
                onClick={() => setEditor({ mode: "new" })}
                disabled={busy}
                size="sm"
              >
                <i className="ph-duotone ph-plus h-4 w-4" />
                Add piece
              </Button>
            )}
          </div>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto">
          <div key={view} className="animate-fade-in p-6 lg:p-8">

        {/* ──── DASHBOARD VIEW ──── */}
        {view === "dashboard" && (
          <>
            {/* stats */}
            <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Revenue", value: formatPrice(orderStats.revenue), icon: "ph-duotone ph-currency-circle-dollar", color: "bg-green-light text-green", sub: "+12.5% from last month", subColor: "text-green" },
                { label: "Claimed", value: orderStats.delivered + orderStats.paid, icon: "ph-duotone ph-package", color: "bg-clay-light text-clay", sub: "pieces sold this month", subColor: "text-taupe" },
                { label: "Products", value: stats.total, icon: "ph-duotone ph-t-shirt", color: "bg-amber-light text-amber", sub: "unique pieces available", subColor: "text-taupe" },
                { label: "Avg. Price", value: stats.total > 0 ? formatPrice(Math.round(orderStats.revenue / (orderStats.delivered + orderStats.paid || 1))) : "GH₵ 0", icon: "ph-duotone ph-chart-line", color: "bg-blue-50 text-blue-600", sub: "+3.1% from last month", subColor: "text-green" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-sand bg-white p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-taupe">{s.label}</span>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>
                      <i className={`${s.icon} h-[18px] w-[18px]`} />
                    </div>
                  </div>
                  <p className="font-display text-[28px] font-bold tracking-tight text-espresso">{s.value}</p>
                  <p className={`mt-1 text-[11px] font-medium ${s.subColor}`}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* two-column: orders table + sidebar */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
              {/* recent orders */}
              <div className="overflow-hidden rounded-xl border border-sand bg-white">
                <div className="flex items-center justify-between border-b border-sand px-5 py-4">
                  <h2 className="font-display text-sm font-semibold text-espresso">Recent Orders</h2>
                  <button type="button" onClick={() => handleViewChange("orders")} className="text-xs font-medium text-clay hover:underline">
                    View all
                  </button>
                </div>
                {orders.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-taupe">No orders yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-sand text-left text-[11px] font-semibold uppercase tracking-wide text-taupe">
                          <th className="px-5 py-3">Order</th>
                          <th className="px-5 py-3">Customer</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Piece</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map((order) => (
                          <tr
                            key={order.id}
                            className="cursor-pointer border-b border-cream transition-colors last:border-0 hover:bg-cream/50"
                            onClick={() => setActiveOrder(order)}
                          >
                            <td className="px-5 py-3 font-semibold text-espresso">#{order.id.slice(-4)}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand text-[10px] font-bold text-mocha">
                                  {order.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-mocha">{order.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <Badge variant={statusBadgeVariant[order.status]} size="sm">
                                {statusLabel[order.status]}
                              </Badge>
                            </td>
                            <td className="px-5 py-3 font-semibold text-espresso">
                              {order.items[0]?.name ?? "—"}{order.items[0]?.size ? ` — ${order.items[0].size}` : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* right column: quick actions + almost gone */}
              <div className="flex flex-col gap-5">
                {/* quick actions */}
                <div className="overflow-hidden rounded-xl border border-sand bg-white">
                  <div className="border-b border-sand px-5 py-4">
                    <h2 className="font-display text-sm font-semibold text-espresso">Quick Actions</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 p-5">
                    {[
                      { label: "Add Piece", icon: "ph-duotone ph-plus", action: () => setEditor({ mode: "new" }) },
                      { label: "View Orders", icon: "ph-duotone ph-package", action: () => handleViewChange("orders") },
                      { label: "Pieces", icon: "ph-duotone ph-t-shirt", action: () => handleViewChange("products") },
                    ].map((a) => (
                      <button
                        key={a.label}
                        type="button"
                        onClick={a.action}
                        className="group flex flex-col items-center gap-2 rounded-xl border border-sand bg-white p-5 transition-all hover:border-clay hover:bg-clay-light"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cream transition-colors group-hover:bg-clay group-hover:text-white">
                          <i className={`${a.icon} h-5 w-5 text-mocha transition-colors group-hover:text-white`} />
                        </div>
                        <span className="text-xs font-semibold text-espresso">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* almost gone */}
                <div className="overflow-hidden rounded-xl border border-sand bg-white">
                  <div className="flex items-center justify-between border-b border-sand px-5 py-4">
                    <h2 className="font-display text-sm font-semibold text-espresso">Almost Gone</h2>
                    <button type="button" onClick={() => handleViewChange("products")} className="text-xs font-medium text-clay hover:underline">
                      View all
                    </button>
                  </div>
                  <div className="divide-y divide-cream">
                    {products.filter((p) => !p.sold && p.visible !== false).slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-cream">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <ShirtArt art={p.art} className="h-full w-full" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-espresso">{p.name}</p>
                          <p className="text-[11px] text-taupe">{p.category} · {p.sizes.join("/") || "One size"}</p>
                        </div>
                        <span className="shrink-0 text-[11px] font-medium text-amber">1 left</span>
                      </div>
                    ))}
                    {products.filter((p) => !p.sold && p.visible !== false).length === 0 && (
                      <div className="px-5 py-6 text-center text-sm text-taupe">No products yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ──── PRODUCTS VIEW ──── */}
        {view === "products" && (
          <>
            {/* stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total", value: stats.total, icon: "ph-duotone ph-t-shirt", color: "bg-cream text-mocha" },
                { label: "Visible", value: stats.visible, icon: "ph-duotone ph-eye", color: "bg-green-light text-green" },
                { label: "Hidden", value: stats.hidden, icon: "ph-duotone ph-eye-slash", color: "bg-amber-light text-amber" },
                { label: "Sold", value: stats.sold, icon: "ph-duotone ph-tag", color: "bg-clay-light text-clay" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-sand bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>
                      <i className={`${s.icon} h-[18px] w-[18px]`} />
                    </div>
                    <div>
                      <p className="font-display text-xl font-bold text-espresso">{s.value}</p>
                      <p className="text-[11px] text-taupe">{s.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* bulk selection bar */}
            {selected.size > 0 && (
              <div className="mb-4 flex animate-fade-in flex-wrap items-center justify-between gap-3 rounded-xl border border-clay bg-clay-light px-4 py-3">
                <p className="text-sm font-medium text-clay">
                  <i className="ph-duotone ph-check-circle mr-1.5 h-4 w-4" />
                  {selected.size} {selected.size === 1 ? "piece" : "pieces"} selected
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bulkSetVisible(true)}
                    disabled={busy}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-espresso transition-colors hover:bg-cream disabled:opacity-50"
                  >
                    <i className="ph-duotone ph-eye mr-1 h-3.5 w-3.5" />
                    Show
                  </button>
                  <button
                    type="button"
                    onClick={() => bulkSetVisible(false)}
                    disabled={busy}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-espresso transition-colors hover:bg-cream disabled:opacity-50"
                  >
                    <i className="ph-duotone ph-eye-slash mr-1 h-3.5 w-3.5" />
                    Hide
                  </button>
                  <button
                    type="button"
                    onClick={requestBulkDelete}
                    disabled={busy}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-sale transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <i className="ph-duotone ph-trash mr-1 h-3.5 w-3.5" />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={clearSelected}
                    className="rounded-lg px-3 py-1.5 text-xs text-clay transition-colors hover:bg-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* product table */}
            {list.length === 0 ? (
              <div className="rounded-xl border border-sand bg-white py-16">
                <EmptyState
                  icon={
                    <i className="ph-duotone ph-magnifying-glass h-7 w-7 text-taupe" aria-hidden />
                  }
                  title="The rack is empty"
                  description="Add your first piece and it will appear on the shop immediately."
                  action={
                    <Button
                      onClick={() => setEditor({ mode: "new" })}
                      size="sm"
                      className="mt-2"
                    >
                      <i className="ph-duotone ph-plus h-4 w-4" />
                      Add piece
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-sand bg-white">
                {/* table header */}
                <div className="hidden items-center gap-4 border-b border-sand bg-cream/50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-taupe sm:flex">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    aria-label="Select all pieces"
                    className="h-4 w-4 rounded accent-clay"
                  />
                  <span className="flex-1">Piece</span>
                  <span className="w-24 text-right">Category</span>
                  <span className="w-20 text-right">Price</span>
                  <span className="w-28 text-right">Actions</span>
                </div>

                {/* table rows */}
                <div className="divide-y divide-cream">
                  {list.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-cream/30 sm:py-4"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={(e) => toggleSelect(p.id, e.target.checked)}
                        aria-label={`Select ${p.name}`}
                        className="h-4 w-4 shrink-0 rounded accent-clay"
                      />
                      <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-cream sm:h-14 sm:w-11">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <ShirtArt art={p.art} className="h-full w-full" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[13px] font-semibold text-espresso">
                            {p.name}
                          </p>
                          {p.visible === false && (
                            <span className="rounded-full bg-amber-light px-1.5 py-0.5 text-[10px] font-semibold text-amber">Hidden</span>
                          )}
                          {p.sold && (
                            <span className="rounded-full bg-clay-light px-1.5 py-0.5 text-[10px] font-semibold text-clay">Sold</span>
                          )}
                          {p.featured && (
                            <span className="rounded-full bg-green-light px-1.5 py-0.5 text-[10px] font-semibold text-green">Featured</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-taupe">
                          {p.tagline || `${p.category} · ${p.sizes.join("/") || "One size"}`}
                        </p>
                      </div>
                      <span className="hidden w-24 shrink-0 text-right text-xs text-mocha sm:block">
                        {p.category}
                      </span>
                      <div className="w-20 shrink-0 text-right">
                        <p className="text-[13px] font-semibold tabular-nums text-espresso">
                          {formatPrice(p.price)}
                        </p>
                        {p.compareAt && (
                          <p className="text-[10px] text-taupe line-through tabular-nums">
                            {formatPrice(p.compareAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex w-28 shrink-0 items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditor({ mode: "edit", product: p })}
                          aria-label={`Edit ${p.name}`}
                          title="Edit"
                        >
                          <i className="ph-duotone ph-pencil-simple h-4 w-4" />
                        </Button>
                        <a
                          href={`/product/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-mocha transition-colors hover:bg-cream hover:text-espresso"
                          aria-label={`View ${p.name} on the rack`}
                          title="View on rack"
                        >
                          <i className="ph-duotone ph-arrow-square-out h-4 w-4" />
                        </a>
                        {/* overflow menu */}
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              if (menu?.slug === p.slug) {
                                setMenu(null);
                                return;
                              }
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              setMenu({
                                slug: p.slug,
                                top: rect.bottom + 4,
                                left: Math.max(8, rect.right - 176),
                              });
                            }}
                            aria-label={`More actions for ${p.name}`}
                            aria-expanded={menu?.slug === p.slug}
                            title="More actions"
                          >
                            <i className="ph-duotone ph-dots-three h-4 w-4" />
                          </Button>
                          {menu?.slug === p.slug && (
                            <>
                              <div
                                className="fixed inset-0 z-[150]"
                                onClick={() => setMenu(null)}
                              />
                              <div
                                className="fixed z-[160] w-48 animate-fade-in overflow-hidden rounded-xl border border-sand bg-white py-1 shadow-lg"
                                style={{ top: menu.top, left: menu.left }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenu(null);
                                    toggleVisible(p);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-espresso transition-colors hover:bg-cream"
                                >
                                  <i className="ph-duotone ph-eye h-4 w-4 text-mocha" />
                                  {p.visible === false ? "Show on rack" : "Hide from rack"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenu(null);
                                    toggleSold(p);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-espresso transition-colors hover:bg-cream"
                                >
                                  <i className="ph-duotone ph-tag h-4 w-4 text-mocha" />
                                  {p.sold ? "Back on the rack" : "Mark as sold"}
                                </button>
                                <div className="my-1 border-t border-cream" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenu(null);
                                    requestDelete(p);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-sale transition-colors hover:bg-red-50"
                                >
                                  <i className="ph-duotone ph-trash h-4 w-4" />
                                  Delete piece
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-xs text-taupe">
              {list.length} {list.length === 1 ? "piece" : "pieces"} · Changes are saved to the database.
            </p>
          </>
        )}

        {view === "orders" && (
          <>
            {orders.length === 0 ? (
              <div className="mt-10">
                <EmptyState
                  icon={
                    <i className="ph-duotone ph-package h-7 w-7 text-taupe" aria-hidden />
                  }
                  title="No orders yet"
                  description="Orders will appear here as customers check out."
                />
              </div>
            ) : (
              <>
                {/* summary strip */}
                <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
                  {[
                    { label: "Pending", value: orderStats.pending, accent: true },
                    { label: "Paid", value: orderStats.paid, accent: false },
                    { label: "Delivered", value: orderStats.delivered, accent: false },
                    { label: "Failed", value: orderStats.failed, accent: false },
                    { label: "Revenue", value: formatPrice(orderStats.revenue), accent: false },
                  ].map((s) => (
                    <Card key={s.label} padding="sm" className="text-center sm:p-5">
                      <p className={`font-display text-xl tabular-nums text-espresso sm:text-3xl ${s.accent ? "text-clay" : ""}`}>
                        {s.value}
                      </p>
                      <p className="mt-1 text-[10px] tracking-wide text-mocha sm:text-xs">{s.label}</p>
                    </Card>
                  ))}
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="mt-10">
                    <EmptyState
                      icon={
                    <i className="ph-duotone ph-magnifying-glass h-7 w-7 text-taupe" aria-hidden />
                      }
                      title="No orders match these filters"
                      description="Try a different status or a wider date range."
                      action={
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter("all");
                            setDateRange({ from: "", to: "" });
                          }}
                          className="mt-2 rounded-xl bg-clay px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-clay-deep"
                        >
                          Clear filters
                        </button>
                      }
                    />
                  </div>
                ) : (
                  <>
                <ul className="mt-6 space-y-3">
                  {pagedOrders.map((order) => (
                    <li
                      key={order.id}
                      className="cursor-pointer rounded-2xl border border-sand bg-surface p-4 transition-all duration-200 hover:border-sand-deep sm:p-5"
                      onClick={() => setActiveOrder(order)}
                    >
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
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums text-espresso">
                              {formatPrice(order.total)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-taupe">
                              {formatOrderDate(order.placedAt)}
                            </p>
                          </div>
                          <i className="ph-duotone ph-caret-right h-4 w-4 text-taupe" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <Pagination
                  page={currentOrdersPage}
                  totalPages={ordersTotalPages}
                  onChange={setOrdersPage}
                />
                <p className="mt-3 text-center text-xs text-taupe">
                  Click an order to view details and update its status.
                </p>
                <p className="mt-4 text-center text-xs text-taupe">
                  Showing {ordersStart}–{ordersEnd} of {filteredOrders.length} orders
                </p>
                  </>
                )}
              </>
            )}
          </>
        )}

        {view === "activity" && (
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-mocha">
                {logTotal} {logTotal === 1 ? "entry" : "entries"} — every admin action is recorded.
              </p>
              <Button variant="secondary" size="sm" onClick={() => loadLogPage(1)} loading={logLoading}>
                <i className="ph-duotone ph-arrow-clockwise h-4 w-4" />
                Refresh
              </Button>
            </div>
            {log.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  icon={
                    <i className="ph-duotone ph-clock h-7 w-7 text-taupe" aria-hidden />
                  }
                  title="Nothing recorded yet"
                  description="Sign-ins, product changes and order updates will appear here."
                />
              </div>
            ) : (
              <ul className="mt-6 space-y-2">
                {log.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start gap-4 rounded-2xl border border-sand bg-surface p-4 transition-colors hover:border-sand-deep"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream">
                      <span
                        aria-hidden
                        className={`h-2 w-2 rounded-full ${
                          eventBadgeVariant[entry.event] === "danger"
                            ? "bg-sale"
                            : eventBadgeVariant[entry.event] === "success"
                              ? "bg-espresso"
                              : "bg-taupe"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={eventBadgeVariant[entry.event] ?? "muted"} size="sm">
                          {entry.event}
                        </Badge>
                        <span className="text-[11px] text-taupe">
                          {formatOrderDate(entry.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 break-words text-sm text-espresso">
                        {entry.detail}
                      </p>
                      {entry.ip && (
                        <p className="mt-0.5 text-[11px] text-taupe">IP {entry.ip}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Pagination
              page={currentLogPage}
              totalPages={logTotalPages}
              onChange={loadLogPage}
            />
            <p className="mt-4 text-center text-xs text-taupe">
              Showing {logStart}–{logEnd} of {logTotal} entries
            </p>
          </div>
        )}

        {view === "settings" && (
          <SettingsPanel onDirtyChange={setSettingsDirty} />
        )}
          </div>{/* close animate-fade-in p-6 lg:p-8 */}
        </div>{/* close flex-1 overflow-y-auto */}
      </div>{/* close flex min-w-0 flex-1 flex-col lg:ml-[240px] */}

      {/* order detail slide-over */}
      {activeOrder && (
        <OrderDrawer
          order={activeOrder}
          busy={busy}
          onClose={closeOrder}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* confirm dialog */}
      {confirm && (
        <ConfirmDialog
          confirm={confirm}
          busy={confirmBusy}
          onConfirm={handleConfirm}
          onClose={() => setConfirm(null)}
        />
      )}

      {/* editor modal */}
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
