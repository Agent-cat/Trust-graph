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
        const url = filter === "flagged"
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
        <div className="text-gray-500">Loading sellers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sellers</h1>
          <p className="text-gray-500">{sellers.length} total sellers</p>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="">All Sellers</option>
          <option value="flagged">Flagged Only</option>
        </select>
      </div>

      {/* Sellers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Seller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Account Age
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Refund Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Orders
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Fraud Cases
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sellers.map((seller) => (
              <tr key={seller.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/sellers/${seller.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{seller.name}</p>
                      <p className="text-sm text-gray-500">{seller.email}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {seller.accountAgeDays} days
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          seller.refundRate > 0.5
                            ? "bg-red-500"
                            : seller.refundRate > 0.3
                              ? "bg-orange-500"
                              : "bg-green-500"
                        }`}
                        style={{ width: `${seller.refundRate * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {(seller.refundRate * 100).toFixed(1)}%
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
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {seller._count.fraudCases}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {seller.isFlagged ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Flagged
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
