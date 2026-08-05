import { NextResponse } from "next/server";
import { getPublicProducts } from "@/lib/queries";

export async function GET() {
  const products = await getPublicProducts();
  return NextResponse.json(products, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
