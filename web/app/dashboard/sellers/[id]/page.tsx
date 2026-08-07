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
        <div className="text-gray-400 text-sm">Loading seller details...</div>
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

  const getLevelBadge = (level: string) => {
    const styles: Record<string, string> = {
      LOW: "bg-gray-100 text-gray-700",
      MEDIUM: "bg-yellow-100 text-yellow-700",
      HIGH: "bg-orange-100 text-orange-700",
      CRITICAL: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[level]}`}
      >
        {level}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/sellers"
            className="text-sm text-gray-500 hover:text-black transition-colors"
          >
            ← Back to sellers
          </Link>
          <h1 className="text-2xl font-bold text-black mt-2">{seller.name}</h1>
          <p className="text-gray-500 text-sm">{seller.email}</p>
        </div>
        {seller.isFlagged && (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-black text-white">
            Flagged
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider">
                Account Age
              </p>
              <p className="text-2xl font-bold text-black mt-1">
                {seller.accountAgeDays}
              </p>
              <p className="text-xs text-gray-500">days</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider">
                Refund Rate
              </p>
              <p className="text-2xl font-bold text-black mt-1">
                {(seller.refundRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider">
                Total Orders
              </p>
              <p className="text-2xl font-bold text-black mt-1">
                {seller.totalOrders}
              </p>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider">
                Revenue
              </p>
              <p className="text-2xl font-bold text-black mt-1">
                ₹{seller.totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">
              Recent Orders
            </h2>
            {seller.orders.length === 0 ? (
              <p className="text-gray-500 text-sm">No orders found</p>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">
                      Order ID
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">
                      Amount
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {seller.orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="py-3 text-sm font-mono text-gray-600">
                        {order.id.slice(0, 12)}...
                      </td>
                      <td className="py-3 text-sm font-medium text-black">
                        ₹{order.amount.toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : order.status === "refunded"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
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
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">
              Contact Info
            </h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">
                  Phone
                </dt>
                <dd className="text-sm font-medium text-black mt-1">
                  {seller.phone || "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">
                  GSTIN
                </dt>
                <dd className="text-sm font-medium text-black mt-1">
                  {seller.gstin || "N/A"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Fraud Cases */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">
              Fraud Cases
            </h2>
            {seller.fraudCases.length === 0 ? (
              <p className="text-gray-500 text-sm">No fraud cases</p>
            ) : (
              <div className="space-y-3">
                {seller.fraudCases.map((fraudCase) => (
                  <Link
                    key={fraudCase.id}
                    href={`/dashboard/cases/${fraudCase.id}`}
                    className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-black">
                        {fraudCase.caseNumber}
                      </span>
                      {getLevelBadge(fraudCase.level)}
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
