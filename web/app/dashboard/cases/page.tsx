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
    const classes = {
      LOW: "bg-green-100 text-green-800",
      MEDIUM: "bg-yellow-100 text-yellow-800",
      HIGH: "bg-orange-100 text-orange-800",
      CRITICAL: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${classes[level as keyof typeof classes]}`}
      >
        {level}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      open: "bg-blue-100 text-blue-800",
      under_review: "bg-purple-100 text-purple-800",
      resolved: "bg-green-100 text-green-800",
      dismissed: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${classes[status as keyof typeof classes]}`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading cases...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fraud Cases</h1>
          <p className="text-gray-500">{cases.length} total cases</p>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="">All Levels</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Case
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Seller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Risk Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cases.map((fraudCase) => (
              <tr key={fraudCase.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/cases/${fraudCase.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {fraudCase.caseNumber}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {fraudCase.seller.name}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${fraudCase.riskScore}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
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
