import "server-only";
import { prisma } from "@/lib/db";

/**
 * Appends a row to the immutable admin audit trail. Never throws — auditing
 * must not break the primary action it accompanies.
 */
export async function logAudit(
  event: string,
  detail: string,
  ip?: string | null
): Promise<void> {
  try {
    await prisma.adminLog.create({
      data: { event, detail: String(detail).slice(0, 2000), ip: ip ?? null },
    });
  } catch {
    /* swallow — audit failures must not fail requests */
  }
}
