"use server";

import { v2 as cloudinary } from "cloudinary";
import { isAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/request";
import { rateLimit, rateLimitGlobal } from "@/lib/rate-limit";

function cloudConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
  }
  return { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret };
}

export type UploadImageResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Admin-only: uploads a compressed image data URL to Cloudinary and returns
 * the secure URL to store on the product. The API secret never leaves the
 * server — the client only ever sends the compressed image itself.
 */
export async function uploadProductImageAction(
  dataUrl: string
): Promise<UploadImageResult> {
  const ip = await getClientIp();
  if (
    !rateLimit(`upload:${ip}`, 30, 60_000) ||
    !rateLimitGlobal("upload", 120, 60_000)
  ) {
    return { ok: false, error: "Too many uploads from this connection." };
  }

  if (!(await isAdmin())) {
    return { ok: false, error: "You need to sign in again." };
  }

  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return { ok: false, error: "That doesn't look like an image." };
  }
  if (dataUrl.length > 1_000_000) {
    return { ok: false, error: "Image is too large — please upload a smaller one." };
  }

  try {
    cloudinary.config(cloudConfig());
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: "kojoropa/products",
      resource_type: "image",
      transformation: [
        {
          width: 1600,
          crop: "limit",
          quality: "auto:good",
          fetch_format: "auto",
        },
      ],
    });
    return { ok: true, url: result.secure_url };
  } catch (err) {
    console.error("[cloudinary] upload error:", err);
    return { ok: false, error: "Upload to Cloudinary failed — try again." };
  }
}
