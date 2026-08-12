"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import { ShirtArt } from "@/components/shirt-art";
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
import { logoutAction } from "@/lib/actions/auth";
import { useSiteSetting } from "@/components/site-settings-provider";
import { ChangePassword } from "@/components/admin-change-password";
import { Brand } from "@/components/brand";
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
                  options={categoryOptions.map((c) => ({
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
              <Label>Sizes</Label>
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
                (first photo is the cover — use the arrows to reorder)
              </span>
            </Label>
            <div className="flex flex-wrap gap-3">
              {uploadError && (
                <p role="alert" className="w-full text-xs text-sale">
                  {uploadError}
                </p>
              )}
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
                  {form.images.length > 1 && (
                    <div className="absolute bottom-1 right-1 flex gap-1">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => moveImage(i, -1)}
                        aria-label="Move photo earlier"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-espresso/60 text-white transition-colors hover:bg-espresso disabled:pointer-events-none disabled:opacity-40"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 15l-6-6-6 6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        disabled={i === form.images.length - 1}
                        onClick={() => moveImage(i, 1)}
                        aria-label="Move photo later"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-espresso/60 text-white transition-colors hover:bg-espresso disabled:pointer-events-none disabled:opacity-40"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
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
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-taupe" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
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

          </div>
        </div>

        {/* ——— Fixed footer ——— */}
        <div className="relative z-10 shrink-0 border-t border-border px-6 py-4 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving ? "Uploading photos…" : initial ? "Save changes" : "Add to the rack"}
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
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
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
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
          </svg>
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
  const paymentInitiated = Boolean(
    order.moolreSessionId || order.moolreTransactionId
  );

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Order ${order.id}`}>
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
        className="absolute right-0 top-0 flex h-full w-full max-w-md animate-slide-in flex-col border-l border-border bg-linen focus:outline-none"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-xl tracking-tight text-espresso">
              Order
            </h2>
            <p className="mt-0.5 text-xs tabular-nums text-taupe">{order.id}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Button>
        </div>

        {/* body */}
        <div className="thin-scroll flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* customer */}
          <section>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-taupe uppercase">
              Customer
            </p>
            <p className="mt-2 text-sm font-medium text-espresso">{order.name}</p>
            <p className="mt-0.5 text-sm text-mocha">{order.email}</p>
            {order.phone && (
              <p className="mt-0.5 text-sm text-mocha">{order.phone}</p>
            )}
            <p className="mt-1 text-xs text-taupe">{formatOrderDate(order.placedAt)}</p>
          </section>

          {/* status + payment */}
          <section>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-taupe uppercase">
              Status
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={statusBadgeVariant[order.status]}>
                {statusLabel[order.status]}
              </Badge>
              <Badge variant={paymentInitiated ? "muted" : "warning"}>
                {paymentInitiated ? "Payment initiated" : "No payment session"}
              </Badge>
            </div>
          </section>

          {/* items */}
          <section>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-taupe uppercase">
              Items
            </p>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-espresso">
                    {item.name}
                    <span className="text-taupe">
                      {" "}×{item.qty}
                      {item.size ? ` · ${item.size}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-espresso">
                    {formatPrice(item.price * item.qty)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* delivery */}
          <section>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-taupe uppercase">
              Delivery to
            </p>
            <p className="mt-2 rounded-xl bg-cream p-3 text-sm leading-relaxed text-mocha">
              {order.street}, {order.city}
              {order.postal ? ` ${order.postal}` : ""}, {order.country}
            </p>
          </section>

          {/* totals */}
          <dl className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-mocha">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-mocha">
              <dt>Delivery</dt>
              <dd className="tabular-nums">{formatPrice(order.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-espresso">
              <dt>Total</dt>
              <dd className="font-display text-xl tabular-nums">
                {formatPrice(order.total)}
              </dd>
            </div>
          </dl>
        </div>

        {/* footer: status controls */}
        <div className="shrink-0 border-t border-border px-6 py-5">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-taupe uppercase">
            Update status
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {ORDER_STATUSES.map((s) => (
              <Button
                key={s}
                variant={order.status === s ? "primary" : "secondary"}
                size="sm"
                onClick={() => onStatusChange(order.id, s)}
                disabled={busy || order.status === s}
                className="px-2"
              >
                {statusLabel[s]}
              </Button>
            ))}
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
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
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
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </nav>
  );
}

/* ————— dashboard ————— */

type AdminTab = "products" | "orders" | "settings" | "activity";

const ORDERS_PAGE_SIZE = 10;
const LOG_PAGE_SIZE = 20;
const TABS: { value: AdminTab; label: string }[] = [
  { value: "products", label: "Products" },
  { value: "orders", label: "Orders" },
  { value: "activity", label: "Activity" },
  { value: "settings", label: "Settings" },
];

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
  const adminHeading = useSiteSetting("adminHeading", "Manage the rack");
  const adminDescription = useSiteSetting("adminDescription", "Changes are saved to the database and update the shop instantly.");
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [log, setLog] = useState<AdminLogRow[]>(initialLog);
  const [logTotal, setLogTotal] = useState(initialLogTotal);
  const [tab, setTab] = useState<AdminTab>("products");
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
      setTab("products");
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

  /* warn before closing the tab with unsaved settings */
  useEffect(() => {
    if (!settingsDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [settingsDirty]);

  const handleTabClick = (t: AdminTab) => {
    if (t !== "settings" && tab === "settings" && settingsDirty) {
      setConfirm({
        title: "Unsaved settings",
        body: "You have unsaved changes in Site settings. They will be lost if you leave this tab.",
        confirmLabel: "Leave anyway",
        run: () => {
          setSettingsDirty(false);
          setTab(t);
          setSearch("");
        },
      });
      return;
    }
    setTab(t);
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
    tab === "products"
      ? adminDescription
      : tab === "orders"
        ? `${orders.length} order${orders.length === 1 ? "" : "s"} placed · ${pendingCount} pending`
        : tab === "activity"
          ? "Every admin action, recorded."
          : "Changes take effect after saving. Some changes reload the page.";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Brand
            name={`${useSiteSetting("siteName", "Kojosropa")} admin`}
            logoClassName="h-4 w-auto"
            nameClassName="text-xs font-semibold tracking-wide uppercase"
          />
          <h1 className="mt-2 font-display text-3xl tracking-tight text-espresso sm:text-4xl">
            {tab === "products" ? adminHeading : tab === "orders" ? "Orders" : tab === "activity" ? "Activity" : "Site settings"}
          </h1>
          <p className="mt-1 text-sm text-mocha">{headerCopy}</p>
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
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add item
            </Button>
          )}
        </div>
      </div>

      {/* tabs + filters */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit gap-1 rounded-full bg-surface p-1 ring-1 ring-border/50">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTabClick(t.value)}
              className={`inline-flex items-center rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
                tab === t.value
                  ? "bg-espresso text-white"
                  : "text-mocha hover:text-espresso"
              }`}
            >
              {t.label}
              {t.value === "products" && products.length > 0 && (
                <span
                  className={`ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                    tab === t.value ? "bg-white/20 text-white" : "bg-sand text-espresso"
                  }`}
                  aria-label={`${products.length} products`}
                >
                  {products.length}
                </span>
              )}
              {t.value === "orders" && pendingCount > 0 && (
                <span
                  className={`ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                    tab === t.value ? "bg-white/20 text-white" : "bg-clay text-white"
                  }`}
                  aria-label={`${pendingCount} pending orders`}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        {tab === "orders" && orders.length > 0 && (
          <div className="flex items-center gap-2">
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All statuses" },
                { value: "pending", label: "Pending" },
                { value: "paid", label: "Paid" },
                { value: "delivered", label: "Delivered" },
                { value: "failed", label: "Failed" },
              ]}
              aria-label="Filter by status"
              className="w-auto"
            />
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onChange={(from, to) => setDateRange({ from, to })}
              aria-label="Filter by date range"
              className="w-auto"
            />
            {(statusFilter !== "all" || dateRange.from || dateRange.to) && (
              <button
                type="button"
                onClick={() => { setStatusFilter("all"); setDateRange({ from: "", to: "" }); }}
                className="text-xs text-clay hover:text-clay-deep"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* tab content */}
      <div key={tab} className="animate-fade-in">
        {tab === "products" && (
          <>
            {/* stats */}
            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {[
                { label: "Total", value: stats.total },
                { label: "Visible", value: stats.visible },
                { label: "Hidden", value: stats.hidden },
                { label: "Sold", value: stats.sold },
              ].map((s) => (
                <Card key={s.label} padding="sm" className="text-center sm:p-5">
                  <p className="font-display text-2xl text-espresso sm:text-3xl">{s.value}</p>
                  <p className="mt-1 text-[10px] tracking-wide text-mocha sm:text-xs">{s.label}</p>
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
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items  ( / )"
                aria-label="Search admin items"
                className="rounded-full bg-surface py-2.5 pr-4 pl-10"
              />
            </div>

            {/* bulk selection bar */}
            {selected.size > 0 && (
              <div className="mt-4 flex animate-fade-in flex-wrap items-center justify-between gap-3 rounded-2xl bg-espresso px-4 py-3 text-white">
                <p className="text-sm font-medium">
                  {selected.size} {selected.size === 1 ? "piece" : "pieces"} selected
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bulkSetVisible(true)}
                    disabled={busy}
                    className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-white/20 disabled:opacity-50"
                  >
                    Show
                  </button>
                  <button
                    type="button"
                    onClick={() => bulkSetVisible(false)}
                    disabled={busy}
                    className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-white/20 disabled:opacity-50"
                  >
                    Hide
                  </button>
                  <button
                    type="button"
                    onClick={requestBulkDelete}
                    disabled={busy}
                    className="rounded-full bg-sale/30 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-sale/50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={clearSelected}
                    className="rounded-full px-3 py-1.5 text-xs text-white/70 transition-colors hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* list */}
            {list.length === 0 ? (
              <div className="mt-10">
                <EmptyState
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      className="h-7 w-7 text-taupe"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                  }
                  title="The rack is empty"
                  description="Add your first piece and it will appear on the shop immediately."
                  action={
                    <Button
                      onClick={() => setEditor({ mode: "new" })}
                      size="sm"
                      className="mt-2"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Add item
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="mt-6 space-y-2 overflow-hidden rounded-2xl bg-surface ring-1 ring-border/50">
                <li className="hidden items-center gap-3 border-b border-border/50 px-3 py-2 text-[11px] font-semibold tracking-wider text-taupe uppercase sm:flex sm:gap-4 sm:px-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    aria-label="Select all pieces"
                    className="h-4 w-4 rounded accent-clay"
                  />
                  <span className="flex-1">Piece</span>
                  <span className="w-20 shrink-0 text-right">Price</span>
                  <span className="w-28 shrink-0 text-right">Actions</span>
                </li>
                {list.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 border-b border-border/50 p-3 transition-colors last:border-0 hover:bg-cream/40 sm:gap-4 sm:p-4">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={(e) => toggleSelect(p.id, e.target.checked)}
                      aria-label={`Select ${p.name}`}
                      className="h-4 w-4 shrink-0 rounded accent-clay"
                    />
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-xl bg-cream sm:h-16 sm:w-12">
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
                        {p.sold && (
                          <Badge variant="danger" size="sm">Sold</Badge>
                        )}
                        {p.featured && (
                          <Badge variant="warning" size="sm">Featured</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-mocha">
                        {p.tagline}
                      </p>
                      <p className="mt-1 text-xs text-taupe">
                        {p.category} · {p.sizes.join("/") || "no sizes"}
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
                      <a
                        href={`/product/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hidden h-9 w-9 items-center justify-center rounded-full text-mocha transition-colors hover:bg-cream hover:text-espresso sm:flex"
                        aria-label={`View ${p.name} on the rack`}
                        title="View on rack"
                      >
                        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 4h6v6" />
                          <path d="M20 4l-9 9" />
                          <path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
                        </svg>
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
                          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
                            <circle cx="5" cy="12" r="1.6" />
                            <circle cx="12" cy="12" r="1.6" />
                            <circle cx="19" cy="12" r="1.6" />
                          </svg>
                        </Button>
                        {menu?.slug === p.slug && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setMenu(null)}
                            />
                            <div
                              className="fixed z-50 w-44 animate-fade-in overflow-hidden rounded-xl bg-surface py-1 ring-1 ring-border"
                              style={{ top: menu.top, left: menu.left }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setMenu(null);
                                  toggleVisible(p);
                                }}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-espresso transition-colors hover:bg-cream"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4 text-mocha" fill="none" stroke="currentColor" strokeWidth="1.7">
                                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                {p.visible === false ? "Show on rack" : "Hide from rack"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMenu(null);
                                  toggleSold(p);
                                }}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-espresso transition-colors hover:bg-cream"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4 text-mocha" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M4 7h16M10 12h4" />
                                  <path d="M6 7l1 12h10l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                                </svg>
                                {p.sold ? "Back on the rack" : "Mark as sold"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMenu(null);
                                  requestDelete(p);
                                }}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-sale transition-colors hover:bg-sale/10"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                                </svg>
                                Delete piece
                              </button>
                            </div>
                          </>
                        )}
                      </div>
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
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      className="h-7 w-7 text-taupe"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
                      <path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" />
                    </svg>
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
                        <svg
                          viewBox="0 0 24 24"
                          className="h-7 w-7 text-taupe"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          aria-hidden
                        >
                          <circle cx="11" cy="11" r="7" />
                          <path d="m20 20-3.5-3.5" />
                        </svg>
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
                          className="mt-2 rounded-full bg-clay px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-clay-deep"
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
                      className="cursor-pointer rounded-2xl bg-surface p-4 ring-1 ring-border/40 transition-all duration-200 hover:ring-clay/25 sm:p-5"
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
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4 text-taupe"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 6l6 6-6 6" />
                          </svg>
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

        {tab === "activity" && (
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-mocha">
                {logTotal} {logTotal === 1 ? "entry" : "entries"} — every admin action is recorded.
              </p>
              <Button variant="secondary" size="sm" onClick={() => loadLogPage(1)} loading={logLoading}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Refresh
              </Button>
            </div>
            {log.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      className="h-7 w-7 text-taupe"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M12 8v4l3 3" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
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
                    className="flex items-start gap-4 rounded-2xl bg-surface p-4 ring-1 ring-border/40 transition-colors hover:ring-clay/20"
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

        {tab === "settings" && (
          <SettingsPanel onDirtyChange={setSettingsDirty} />
        )}
      </div>

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
