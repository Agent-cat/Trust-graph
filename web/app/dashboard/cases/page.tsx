"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FraudCase {
  id: string;
  caseNumber: string;
  riskScore: number;
  level: string;
  action: string;
  status: string;
  seller: {
    name: string;
  };
  createdAt: string;
}

export default function CasesPage() {
  const [cases, setCases] = useState<FraudCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    async function fetchCases() {
      try {
        const url = filter
          ? `http://localhost:4000/api/cases?level=${filter}`
          : "http://localhost:4000/api/cases";

        const res = await fetch(url);
        const data = await res.json();
        setCases(data.data || []);
      } catch (error) {
        console.error("Failed to fetch cases:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCases();
  }, [filter]);

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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: "bg-blue-100 text-blue-700",
      under_review: "bg-purple-100 text-purple-700",
      resolved: "bg-green-100 text-green-700",
      dismissed: "bg-gray-100 text-gray-500",
    };
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading cases...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Cases</h1>
          <p className="text-gray-500 text-sm mt-1">
            {cases.length} total cases
          </p>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
        >
          <option value="">All Levels</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Cases Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Case
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Seller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {cases.map((fraudCase) => (
              <tr key={fraudCase.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/cases/${fraudCase.id}`}
                    className="text-black font-medium hover:underline"
                  >
                    {fraudCase.caseNumber}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {fraudCase.seller.name}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-20 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-black h-1.5 rounded-full"
                        style={{ width: `${fraudCase.riskScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {fraudCase.riskScore}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">{getLevelBadge(fraudCase.level)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {fraudCase.action.replace(/_/g, " ")}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(fraudCase.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
