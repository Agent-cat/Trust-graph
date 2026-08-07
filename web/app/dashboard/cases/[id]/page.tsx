"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

export default function CaseDetailPage() {
  const params = useParams();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    if (params.id) {
      fetchCase();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading case details...</div>
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

  const getLevelColor = (level: string) => {
    const colors = {
      LOW: "text-green-600",
      MEDIUM: "text-yellow-600",
      HIGH: "text-orange-600",
      CRITICAL: "text-red-600",
    };
    return colors[level as keyof typeof colors] || "text-gray-600";
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
          <h1 className="text-2xl font-bold text-gray-900">
            {caseData.caseNumber}
          </h1>
          <p className="text-gray-500">
            Seller: {caseData.seller.name}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-bold ${getLevelColor(caseData.level)}`}>
            {caseData.riskScore}
          </p>
          <p className="text-sm text-gray-500">Risk Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Risk Score Bar */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Risk Score</h2>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
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
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span>0</span>
              <span className={`font-semibold ${getLevelColor(caseData.level)}`}>
                {caseData.level}
              </span>
              <span>100</span>
            </div>
          </div>

          {/* Risk Signals */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Risk Signals</h2>
            <div className="space-y-4">
              {caseData.riskSignals.map((signal, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{getSignalName(signal.type)}</p>
                    <p className="text-sm text-gray-500">
                      {signal.details?.detail}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{signal.score}</p>
                    <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${signal.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reasons */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Why was this flagged?
            </h2>
            <ul className="space-y-3">
              {caseData.reasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-yellow-500 mt-1">⚠️</span>
                  <span className="text-gray-700">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recommended Action */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Recommended Action</h2>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold text-lg">
                {caseData.action.replace(/_/g, " ")}
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Approve Action
              </button>
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Send For Review
              </button>
              <button className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Dismiss Case
              </button>
            </div>
          </div>

          {/* Seller Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Seller Info</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm font-medium">{caseData.seller.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Account Age</dt>
                <dd className="text-sm font-medium">
                  {caseData.seller.accountAgeDays} days
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Refund Rate</dt>
                <dd className="text-sm font-medium">
                  {(caseData.seller.refundRate * 100).toFixed(1)}%
                </dd>
              </div>
            </dl>
          </div>

          {/* Audit Log */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Activity Log</h2>
            <div className="space-y-3">
              {caseData.auditLogs.slice(0, 5).map((log, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div>
                    <p className="text-sm">{log.action}</p>
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
