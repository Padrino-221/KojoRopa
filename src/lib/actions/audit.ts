"use server";

import { prisma } from "@/lib/db";

/** A page of admin audit trail entries plus the total count — for the Activity tab. */
export async function getAuditLogAction(page = 1, pageSize = 20) {
  const [rows, total] = await Promise.all([
    prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.adminLog.count(),
  ]);
  return { rows, total };
}
