"use server";

import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { SETTING_SECTIONS } from "@/lib/settings-defs";

export type SettingKey = (typeof SETTING_SECTIONS)[number]["settings"][number]["key"];

/** Returns all settings as a key→value record (DB values override defaults). */
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.siteSetting.findMany();
  const db = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const result: Record<string, string> = {};
  for (const section of SETTING_SECTIONS) {
    for (const s of section.settings) {
      result[s.key] = db[s.key] ?? s.default;
    }
  }
  return result;
}

/** Returns only the DB-stored values (for the admin form). */
export async function getDbSettings(): Promise<Record<string, string>> {
  const rows = await prisma.siteSetting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Upserts a single setting. Only admin can call this. */
export async function saveSettingAction(
  key: string,
  value: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Unauthorized" };
  try {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    const ip = await getClientIp().catch(() => null);
    await logAudit("setting.update", `${key} = ${value.slice(0, 100)}`, ip);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Bulk upsert settings. Only admin can call this. */
export async function saveSettingsAction(
  settings: Record<string, string>
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Unauthorized" };
  try {
    await prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );
    const ip = await getClientIp().catch(() => null);
    await logAudit("settings.bulk_update", `${Object.keys(settings).length} settings`, ip);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Resets a setting to its default value. */
export async function resetSettingAction(
  key: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Unauthorized" };
  try {
    await prisma.siteSetting.deleteMany({ where: { key } });
    const ip = await getClientIp().catch(() => null);
    await logAudit("setting.reset", key, ip);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
