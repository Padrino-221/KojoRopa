import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: "ok",
      ts: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, db: "error", ts: Date.now() },
      { status: 503 }
    );
  }
}
