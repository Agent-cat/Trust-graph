"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const adminNavigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Fraud Graph", href: "/dashboard/graph" },
  { name: "Users", href: "/dashboard/users" },
  { name: "Sellers", href: "/dashboard/sellers" },
  { name: "Orders", href: "/dashboard/orders" },
  { name: "Products", href: "/dashboard/products" },
  { name: "Audit Logs", href: "/dashboard/audit" },
];

const sellerNavigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "My Products", href: "/dashboard/products" },
  { name: "Orders", href: "/dashboard/orders" },
  { name: "Analytics", href: "/dashboard/analytics" },
];

const customerNavigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Products", href: "/dashboard/products" },
  { name: "My Orders", href: "/dashboard/orders" },
  { name: "Cart", href: "/dashboard/cart" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const role = (user as any)?.role || "customer";

  const navigation =
    role === "admin"
      ? adminNavigation
      : role === "seller"
      ? sellerNavigation
      : customerNavigation;

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/sign-in";
        },
      },
    });
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-black text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-lg font-bold tracking-tight">Trust Graph</h1>
          <p className="text-xs text-gray-400 mt-1">
            {role === "admin"
              ? "Admin Panel"
              : role === "seller"
              ? "Seller Dashboard"
              : "Customer Portal"}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-white text-black"
                    : "text-gray-300 hover:bg-gray-900 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          {user && (
            <div className="mb-3">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-900 rounded-lg transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
