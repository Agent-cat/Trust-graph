"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface CaseDetail {
  id: string;
  caseNumber: string;
  riskScore: number;
  level: string;
  action: string;
  reasons: string[];
  status: string;
  seller: {
    name: string;
    email: string;
    accountAgeDays: number;
    refundRate: number;
  };
  riskSignals: {
    type: string;
    score: number;
    details: any;
  }[];
  auditLogs: {
    action: string;
    performedBy: string;
    createdAt: string;
  }[];
}

const statusStyles: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  under_review: "bg-amber-50 text-amber-700",
  resolved: "bg-green-50 text-green-700",
  dismissed: "bg-gray-100 text-gray-600",
};

export default function CaseDetailPage() {
  const params = useParams();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchCase() {
    try {
      const res = await fetch(
        `http://localhost:4000/api/cases/${params.id}`
      );
      const data = await res.json();
      setCaseData(data.data);
    } catch (error) {
      console.error("Failed to fetch case:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchCase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function changeStatus(status: string, actionLabel: string) {
    if (!caseData) return;
    setUpdating(actionLabel);
    try {
      const res = await fetch(
        `http://localhost:4000/api/cases/${params.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update case");
        return;
      }
      await fetchCase();
    } catch (error) {
      console.error("Failed to update case:", error);
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading case details...</div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Case not found</p>
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
        className={`px-3 py-1 rounded-full text-sm font-medium ${styles[level]}`}
      >
        {level}
      </span>
    );
  };

  const getSignalName = (type: string) => {
    const names: Record<string, string> = {
      transaction_risk: "Transaction Risk",
      refund_risk: "Refund Risk",
      account_risk: "Account Risk",
      ip_risk: "IP Risk",
      device_risk: "Device Risk",
      velocity_risk: "Velocity Risk",
      dispute_risk: "Dispute Risk",
    };
    return names[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/cases"
            className="text-sm text-gray-500 hover:text-black transition-colors"
          >
            ← Back to cases
          </Link>
          <h1 className="text-2xl font-bold text-black mt-2">
            {caseData.caseNumber}
          </h1>
          <p className="text-gray-500 text-sm">Seller: {caseData.seller.name}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-3">
            <p className="text-4xl font-bold text-black">{caseData.riskScore}</p>
            {getLevelBadge(caseData.level)}
          </div>
          <p className="text-sm text-gray-500 mt-1">Risk Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Risk Score Bar */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Risk Score</h2>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  caseData.level === "CRITICAL"
                    ? "bg-red-600"
                    : caseData.level === "HIGH"
                      ? "bg-orange-500"
                      : caseData.level === "MEDIUM"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                }`}
                style={{ width: `${caseData.riskScore}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 text-xs text-gray-500">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Risk Signals */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Risk Signals</h2>
            <div className="space-y-4">
              {caseData.riskSignals.map((signal, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-black">{getSignalName(signal.type)}</p>
                    <p className="text-xs text-gray-500">
                      {signal.details?.detail}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-black">{signal.score}</p>
                    <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-black h-1.5 rounded-full"
                        style={{ width: `${signal.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reasons */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">
              Why was this flagged?
            </h2>
            <ul className="space-y-3">
              {caseData.reasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-black rounded-full mt-2" />
                  <span className="text-sm text-gray-700">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recommended Action */}
          <div className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-500">Recommended Action</h2>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  statusStyles[caseData.status] || "bg-gray-100 text-gray-600"
                }`}
              >
                {caseData.status.replace("_", " ")}
              </span>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold text-black">
                {caseData.action.replace(/_/g, " ")}
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => changeStatus("resolved", "Approve")}
                disabled={updating !== null || caseData.status === "resolved"}
                className="w-full px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                {updating === "Approve" ? "Updating…" : "Approve Action"}
              </button>
              <button
                onClick={() => changeStatus("under_review", "Review")}
                disabled={updating !== null || caseData.status === "under_review"}
                className="w-full px-4 py-2 bg-white border border-gray-300 text-black text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                {updating === "Review" ? "Updating…" : "Send For Review"}
              </button>
              <button
                onClick={() => changeStatus("dismissed", "Dismiss")}
                disabled={updating !== null || caseData.status === "dismissed"}
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                {updating === "Dismiss" ? "Updating…" : "Dismiss Case"}
              </button>
            </div>
            {error && (
              <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                {error}
              </p>
            )}
          </div>

          {/* Seller Info */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Seller Info</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">Email</dt>
                <dd className="text-sm font-medium text-black mt-1">{caseData.seller.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">Account Age</dt>
                <dd className="text-sm font-medium text-black mt-1">
                  {caseData.seller.accountAgeDays} days
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider">Refund Rate</dt>
                <dd className="text-sm font-medium text-black mt-1">
                  {(caseData.seller.refundRate * 100).toFixed(1)}%
                </dd>
              </div>
            </dl>
          </div>

          {/* Audit Log */}
          <div className="border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Activity Log</h2>
            <div className="space-y-4">
              {caseData.auditLogs.slice(0, 5).map((log, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-black rounded-full mt-2" />
                  <div>
                    <p className="text-sm text-black">{log.action}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
