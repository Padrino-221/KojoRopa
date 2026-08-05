import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex colour like #c8102e");

export const loginSchema = z.object({
  password: z.string().min(1).max(200),
  code: z.string().max(6).optional(),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  tagline: z.string().trim().max(160),
  price: z.number().int().positive().max(100_000),
  compareAt: z.number().int().positive().max(1_000_000).optional().nullable(),
  category: z.enum(["tee", "button-up", "polo", "overshirt"]),
  condition: z.string().trim().min(1).max(40),
  era: z.string().trim().min(1).max(20),
  year: z.number().int().min(1950).max(2100),
  fitNote: z.string().trim().max(120).optional().nullable(),
  story: z.string().trim().max(2000),
  tags: z.array(z.string().trim().min(1).max(30)).max(20),
  sizes: z.array(z.string().trim().min(1).max(10)).max(10),
  inventory: z.number().int().min(0).max(10_000).optional().nullable(),
  image: z.string().max(2_500_000).optional().nullable(),
  images: z.array(z.string().max(2_500_000)).max(8).default([]),
  featured: z.boolean(),
  visible: z.boolean(),
  artBase: hexColor,
  artPattern: z.enum(["solid", "stripe", "tie", "graphic", "check", "fade", "raglan"]),
  artAccent: hexColor.optional().nullable(),
  artAccent2: hexColor.optional().nullable(),
  artGraphic: hexColor.optional().nullable(),
  artRib: hexColor.optional().nullable(),
});

export type ProductInput = z.infer<typeof productSchema>;

export const orderSchema = z.object({
  email: z.email("Enter a valid email").max(200),
  name: z.string().trim().min(1).max(120),
  items: z
    .array(
      z.object({
        slug: z.string().trim().min(1).max(120),
        size: z.string().trim().min(1).max(10),
        qty: z.number().int().min(1).max(99),
      })
    )
    .min(1, "Your bag is empty")
    .max(50),
  address: z.object({
    street: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(100),
    postal: z.string().trim().min(1).max(20),
    country: z.string().trim().min(1).max(60),
  }),
});

export type OrderInput = z.infer<typeof orderSchema>;
