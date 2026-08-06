import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLogin } from "@/components/admin-login";
import { isAdmin } from "@/lib/auth";
import { getAdminProducts, getAdminOrders, getAdminLog } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Admin",
  description: "KojoRopa admin dashboard — manage the rack.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
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
