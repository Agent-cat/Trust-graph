"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  _count?: { orderItems: number };
}

interface Order {
  id: string;
  total: number;
  status: string;
  items: { productId: string; quantity: number }[];
}

export default function AnalyticsPage() {
  const { data: session } = authClient.useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        if (!session?.user) return;
        const [productsRes, ordersRes] = await Promise.all([
          fetch(`/api/products?sellerId=${session.user.id}`),
          fetch("/api/orders"),
        ]);

        const [productsData, ordersData] = await Promise.all([
          productsRes.json(),
          ordersRes.json(),
        ]);

        setProducts(productsData.data || []);
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Seller performance overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Products" value={products.length} />
        <StatCard
          title="Total Stock"
          value={products.reduce((sum, p) => sum + p.stock, 0)}
        />
        <StatCard
          title="Inventory Value"
          value={products.reduce((sum, p) => sum + p.price * p.stock, 0)}
          prefix="₹"
        />
      </div>

      {/* Product Performance */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-medium text-black text-sm">Product Performance</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                  No products yet. Add products to see analytics.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-black">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    ₹{product.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {product.stock}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        product.stock > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {product.stock > 0 ? "In stock" : "Out of stock"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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