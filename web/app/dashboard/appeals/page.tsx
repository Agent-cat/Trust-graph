"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Appeal {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  fraudCase: {
    id: string;
    caseNumber: string;
    riskScore: number;
    level: string;
  };
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    async function fetchAppeals() {
      try {
        const url = filter
          ? `http://localhost:4000/api/appeals?status=${filter}`
          : "http://localhost:4000/api/appeals";

        const res = await fetch(url);
        const data = await res.json();
        setAppeals(data.data || []);
      } catch (error) {
        console.error("Failed to fetch appeals:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAppeals();
  }, [filter]);

  const getStatusBadge = (status: string) => {
    const classes = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${classes[status as keyof typeof classes]}`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading appeals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appeals</h1>
          <p className="text-gray-500">{appeals.length} total appeals</p>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Appeals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Case
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Risk Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appeals.map((appeal) => (
              <tr key={appeal.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/cases/${appeal.fraudCase.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {appeal.fraudCase.caseNumber}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${appeal.fraudCase.riskScore}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {appeal.fraudCase.riskScore}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900 line-clamp-2 max-w-xs">
                    {appeal.reason}
                  </p>
                </td>
                <td className="px-6 py-4">{getStatusBadge(appeal.status)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(appeal.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  {appeal.status === "pending" && (
                    <Link
                      href={`/dashboard/appeals/${appeal.id}`}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Review
                    </Link>
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
