"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import Tooltip from "@/components/Tooltip";

interface FraudCaseSummary {
  id: string;
  caseNumber: string;
  riskScore: number;
  level: string;
  status: string;
  action: string;
  reasons: string[];
}

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
  fraudCases: FraudCaseSummary[];
}

interface DetailModalState {
  seller: Seller;
}

const levelStyles: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const statusStyles: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  under_review: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-500",
};

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [detailSeller, setDetailSeller] = useState<Seller | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchSellers() {
    setLoading(true);
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

  useEffect(() => {
    fetchSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function toggleFlag(seller: Seller) {
    setUpdatingId(seller.id);
    try {
      const res = await fetch(
        `http://localhost:4000/api/sellers/${seller.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isFlagged: !seller.isFlagged }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setToast(
          seller.isFlagged
            ? `Unflagged ${seller.name}`
            : `Flagged ${seller.name}`
        );
        fetchSellers();
      }
    } catch (error) {
      console.error("Failed to update flag:", error);
    } finally {
      setUpdatingId(null);
    }
  }

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
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
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
                Flag Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sellers.map((seller) => {
              const reasons = (seller.fraudCases || []).flatMap(
                (c) => c.reasons || []
              );
              const uniqueReasons = [...new Set(reasons)];
              return (
                <tr
                  key={seller.id}
                  className={`transition-colors ${
                    seller.isFlagged ? "bg-red-50/50" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-black">{seller.name}</p>
                      <p className="text-xs text-gray-500">{seller.email}</p>
                    </div>
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
                      <div className="space-y-1">
                        {uniqueReasons.length > 0 ? (
                          <>
                            {uniqueReasons.slice(0, 2).map((reason, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-1.5 text-xs text-red-700"
                              >
                                <span className="mt-1 w-1 h-1 bg-red-500 rounded-full shrink-0" />
                                {reason}
                              </div>
                            ))}
                            {uniqueReasons.length > 2 && (
                              <button
                                onClick={() => setDetailSeller(seller)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-100 hover:border-red-300 transition-colors"
                              >
                                +{uniqueReasons.length - 2} more
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-red-700">
                            Admin-flagged (no open case)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDetailSeller(seller)}
                        className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => toggleFlag(seller)}
                        disabled={updatingId === seller.id}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                      >
                        {updatingId === seller.id
                          ? "..."
                          : seller.isFlagged
                            ? "Unflag"
                            : "Flag"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      <Modal
        open={!!detailSeller}
        title={detailSeller ? `${detailSeller.name} — details` : ""}
        message="Full risk assessment for this seller. Actions take effect immediately."
        cancelText="Close"
        onClose={() => setDetailSeller(null)}
        onCancel={() => setDetailSeller(null)}
      >
        {detailSeller && (
          <div className="space-y-5 text-left">
            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Account Age
                </p>
                <p className="mt-1 font-bold text-black">
                  {detailSeller.accountAgeDays}d
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Refund Rate
                </p>
                <p className="mt-1 font-bold text-black">
                  {(detailSeller.refundRate * 100).toFixed(0)}%
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Orders
                </p>
                <p className="mt-1 font-bold text-black">
                  {detailSeller.totalOrders}
                </p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Revenue
                </p>
                <p className="mt-1 font-bold text-black">
                  ₹{detailSeller.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Flag status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Current flag:
                </span>
                {detailSeller.isFlagged ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-black text-white">
                    Flagged
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Tooltip
                  size="sm"
                  text="Flagging a seller marks them for review across the platform."
                />
                <button
                  onClick={() => {
                    toggleFlag(detailSeller);
                    setDetailSeller(null);
                  }}
                  disabled={updatingId === detailSeller.id}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                    detailSeller.isFlagged
                      ? "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                      : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  {detailSeller.isFlagged ? "Unflag seller" : "Flag seller"}
                </button>
              </div>
            </div>

            {/* Open cases with reasons */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Why was this flagged? ({detailSeller.fraudCases?.length || 0} cases)
              </p>
              {(!detailSeller.fraudCases || detailSeller.fraudCases.length === 0) ? (
                <p className="text-sm text-gray-500">No open fraud cases.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {detailSeller.fraudCases.map((fraudCase) => (
                    <div
                      key={fraudCase.id}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/dashboard/cases/${fraudCase.id}`}
                          className="font-medium text-sm text-black hover:underline"
                        >
                          {fraudCase.caseNumber}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              levelStyles[fraudCase.level] ||
                              "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {fraudCase.level}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              statusStyles[fraudCase.status] ||
                              "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {fraudCase.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Risk {fraudCase.riskScore}/100 ·{" "}
                        {fraudCase.action.replace(/_/g, " ")}
                      </p>
                      {(fraudCase.reasons || []).length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {fraudCase.reasons.map((reason, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-1.5 text-xs text-red-700"
                            >
                              <span className="mt-1 w-1 h-1 bg-red-500 rounded-full shrink-0" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <Link
                href={`/dashboard/sellers/${detailSeller.id}`}
                onClick={() => setDetailSeller(null)}
                className="text-sm font-medium text-black hover:underline"
              >
                View full profile →
              </Link>
              {detailSeller._count.fraudCases > 0 && (
                <Link
                  href={`/dashboard/cases?search=${detailSeller.name}`}
                  onClick={() => setDetailSeller(null)}
                  className="text-sm font-medium text-red-700 hover:underline"
                >
                  Review cases →
                </Link>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-black text-white text-sm rounded-lg shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function DetailCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 font-bold text-gray-900">{children}</p>
    </div>
  );
}