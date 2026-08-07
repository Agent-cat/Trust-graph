"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface SellerDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  gstin: string;
  accountAgeDays: number;
  refundRate: number;
  totalOrders: number;
  totalRevenue: number;
  isFlagged: boolean;
  orders: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
  fraudCases: {
    id: string;
    caseNumber: string;
    riskScore: number;
    level: string;
    status: string;
  }[];
}

export default function SellerDetailPage() {
  const params = useParams();
  const [seller, setSeller] = useState<SellerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSeller() {
      try {
        const res = await fetch(
          `http://localhost:4000/api/sellers/${params.id}`
        );
        const data = await res.json();
        setSeller(data.data);
      } catch (error) {
        console.error("Failed to fetch seller:", error);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchSeller();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading seller details...</div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Seller not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{seller.name}</h1>
          <p className="text-gray-500">{seller.email}</p>
        </div>
        {seller.isFlagged && (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            🚨 Flagged
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Account Age</p>
              <p className="text-2xl font-bold">{seller.accountAgeDays}</p>
              <p className="text-xs text-gray-400">days</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Refund Rate</p>
              <p className="text-2xl font-bold">
                {(seller.refundRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold">{seller.totalOrders}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-2xl font-bold">
                ₹{seller.totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
            {seller.orders.length === 0 ? (
              <p className="text-gray-500">No orders found</p>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">
                      Order ID
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">
                      Amount
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {seller.orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-3 text-sm font-mono">{order.id.slice(0, 12)}...</td>
                      <td className="py-3 text-sm">₹{order.amount.toLocaleString()}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            order.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : order.status === "refunded"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Contact Info</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="text-sm font-medium">{seller.phone || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">GSTIN</dt>
                <dd className="text-sm font-medium">{seller.gstin || "N/A"}</dd>
              </div>
            </dl>
          </div>

          {/* Fraud Cases */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Fraud Cases</h2>
            {seller.fraudCases.length === 0 ? (
              <p className="text-gray-500">No fraud cases</p>
            ) : (
              <div className="space-y-3">
                {seller.fraudCases.map((fraudCase) => (
                  <Link
                    key={fraudCase.id}
                    href={`/dashboard/cases/${fraudCase.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {fraudCase.caseNumber}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          fraudCase.level === "CRITICAL"
                            ? "bg-red-100 text-red-800"
                            : fraudCase.level === "HIGH"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {fraudCase.level}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Risk: {fraudCase.riskScore} | {fraudCase.status}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
