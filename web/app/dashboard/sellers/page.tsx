"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Seller {
  id: string;
  name: string;
  email: string;
  accountAgeDays: number;
  refundRate: number;
  totalOrders: number;
  totalRevenue: number;
  isFlagged: boolean;
  _count: {
    orders: number;
    fraudCases: number;
  };
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    async function fetchSellers() {
      try {
        const url =
          filter === "flagged"
            ? "http://localhost:4000/api/sellers?flagged=true"
            : "http://localhost:4000/api/sellers";

        const res = await fetch(url);
        const data = await res.json();
        setSellers(data.data || []);
      } catch (error) {
        console.error("Failed to fetch sellers:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSellers();
  }, [filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading sellers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Sellers</h1>
          <p className="text-gray-500 text-sm mt-1">
            {sellers.length} total sellers
          </p>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All Sellers</option>
          <option value="flagged">Flagged Only</option>
        </select>
      </div>

      {/* Sellers Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Seller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account Age
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Refund Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orders
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cases
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sellers.map((seller) => (
              <tr
                key={seller.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/sellers/${seller.id}`}
                    className="text-black font-medium hover:underline"
                  >
                    <div>
                      <p className="font-medium">{seller.name}</p>
                      <p className="text-xs text-gray-500">{seller.email}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {seller.accountAgeDays}d
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          seller.refundRate > 0.5
                            ? "bg-red-500"
                            : seller.refundRate > 0.3
                              ? "bg-orange-500"
                              : "bg-black"
                        }`}
                        style={{ width: `${seller.refundRate * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {(seller.refundRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {seller._count.orders}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  ₹{seller.totalRevenue.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      seller._count.fraudCases > 0
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {seller._count.fraudCases}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {seller.isFlagged ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-black text-white">
                      Flagged
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
