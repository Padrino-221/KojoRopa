import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/auth";
import { getAdminProducts, getAdminOrders, getAdminLog } from "@/lib/queries";
import { ADMIN_PATH } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Admin",
  description: "Kojosropa admin dashboard — manage the rack.",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  params,
}: {
  params: Promise<{ adminSlug: string }>;
}) {
  const { adminSlug } = await params;
  // Only the configured secret path opens the dashboard — every other slug 404s.
  if (adminSlug !== ADMIN_PATH) notFound();

  const authed = await isAdmin();
  if (!authed) return <AdminLogin />;

  const [products, orders, log] = await Promise.all([
    getAdminProducts(),
    getAdminOrders(),
    getAdminLog(1, 20),
  ]);
  return (
    <AdminDashboard
      initialProducts={products}
      initialOrders={orders}
      initialLog={log.rows}
      initialLogTotal={log.total}
    />
  );
}
