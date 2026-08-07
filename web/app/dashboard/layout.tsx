"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Demo", href: "/dashboard/demo" },
  { name: "Cases", href: "/dashboard/cases" },
  { name: "Graph", href: "/dashboard/graph" },
  { name: "Appeals", href: "/dashboard/appeals" },
  { name: "Audit Logs", href: "/dashboard/audit" },
  { name: "Sellers", href: "/dashboard/sellers" },
  { name: "Transactions", href: "/dashboard/transactions" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-black text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-lg font-bold tracking-tight">Trust Graph</h1>
          <p className="text-xs text-gray-400 mt-1">Fraud Detection System</p>
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
          <p className="text-xs text-gray-500">v1.0.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
