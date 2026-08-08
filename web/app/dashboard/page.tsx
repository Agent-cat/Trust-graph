"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

interface DashboardStats {
  totalProducts?: number;
  totalOrders?: number;
  totalRevenue?: number;
  totalUsers?: number;
  cartItems?: number;
}

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const role = (user as any)?.role || "customer";
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-black">
          Welcome, {user?.name || "User"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {role === "admin"
            ? "Admin Dashboard"
            : role === "seller"
            ? "Seller Dashboard"
            : "Customer Portal"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {role === "admin" && (
          <>
            <StatCard title="Total Users" value={stats.totalUsers || 0} />
            <StatCard title="Total Orders" value={stats.totalOrders || 0} />
            <StatCard title="Total Products" value={stats.totalProducts || 0} />
            <StatCard title="Revenue" value={stats.totalRevenue || 0} prefix="₹" />
          </>
        )}

        {role === "seller" && (
          <>
            <StatCard title="My Products" value={stats.totalProducts || 0} />
            <StatCard title="Orders" value={stats.totalOrders || 0} />
            <StatCard title="Revenue" value={stats.totalRevenue || 0} prefix="₹" />
            <StatCard title="Rating" value={0} suffix="/5" />
          </>
        )}

        {role === "customer" && (
          <>
            <StatCard title="My Orders" value={stats.totalOrders || 0} />
            <StatCard title="Cart Items" value={stats.cartItems || 0} />
            <StatCard title="Wishlist" value={0} />
            <StatCard title="Points" value={0} />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {role === "admin" && (
          <>
            <a
              href="/dashboard/users"
              className="block p-6 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              <p className="text-lg font-semibold">Manage Users</p>
              <p className="text-gray-400 text-sm mt-1">
                View and manage all users
              </p>
            </a>
            <a
              href="/dashboard/products"
              className="block p-6 border-2 border-black rounded-xl hover:bg-gray-50 transition-colors"
            >
              <p className="text-lg font-semibold text-black">Products</p>
              <p className="text-gray-500 text-sm mt-1">
                Manage product listings
              </p>
            </a>
            <a
              href="/dashboard/orders"
              className="block p-6 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
            >
              <p className="text-lg font-semibold text-black">Orders</p>
              <p className="text-gray-500 text-sm mt-1">View all orders</p>
            </a>
          </>
        )}

        {role === "seller" && (
          <>
            <a
              href="/dashboard/products/new"
              className="block p-6 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              <p className="text-lg font-semibold">Add Product</p>
              <p className="text-gray-400 text-sm mt-1">
                Create a new listing
              </p>
            </a>
            <a
              href="/dashboard/products"
              className="block p-6 border-2 border-black rounded-xl hover:bg-gray-50 transition-colors"
            >
              <p className="text-lg font-semibold text-black">My Products</p>
              <p className="text-gray-500 text-sm mt-1">
                Manage your products
              </p>
            </a>
            <a
              href="/dashboard/orders"
              className="block p-6 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
            >
              <p className="text-lg font-semibold text-black">Orders</p>
              <p className="text-gray-500 text-sm mt-1">
                View customer orders
              </p>
            </a>
          </>
        )}

        {role === "customer" && (
          <>
            <a
              href="/dashboard/products"
              className="block p-6 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              <p className="text-lg font-semibold">Browse Products</p>
              <p className="text-gray-400 text-sm mt-1">
                Discover amazing products
              </p>
            </a>
            <a
              href="/dashboard/cart"
              className="block p-6 border-2 border-black rounded-xl hover:bg-gray-50 transition-colors"
            >
              <p className="text-lg font-semibold text-black">My Cart</p>
              <p className="text-gray-500 text-sm mt-1">
                Review your cart items
              </p>
            </a>
            <a
              href="/dashboard/orders"
              className="block p-6 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
            >
              <p className="text-lg font-semibold text-black">My Orders</p>
              <p className="text-gray-500 text-sm mt-1">
                Track your orders
              </p>
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  prefix = "",
  suffix = "",
}: {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="p-6 border border-gray-200 rounded-xl">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-black mt-2">
        {prefix}
        {value}
        {suffix}
      </p>
    </div>
  );
}
