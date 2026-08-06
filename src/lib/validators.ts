import { z } from "zod";
import { MAX_QTY } from "@/lib/site-config";

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
  story: z.string().trim().max(2000),
  sizes: z.array(z.string().trim().min(1).max(10)).max(10),
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
  phone: z.string().trim().min(10, "Enter a valid phone number").max(20),
  items: z
    .array(
      z.object({
        slug: z.string().trim().min(1).max(120),
        size: z.string().trim().min(1).max(10),
        qty: z.number().int().min(1).max(MAX_QTY),
      })
    )
    .min(1, "Your bag is empty")
    .max(50),
  address: z.object({
    street: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(100),
    // Ghana has no postal-code requirement — customers may leave it blank.
    postal: z.string().trim().max(20).default(""),
    // The shop ships within Ghana only.
    country: z.literal("Ghana"),
  }),
});

export type OrderInput = z.infer<typeof orderSchema>;
