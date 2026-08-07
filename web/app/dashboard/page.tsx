"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalCases: number;
  openCases: number;
  criticalCases: number;
  totalSellers: number;
  flaggedSellers: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [casesRes, sellersRes] = await Promise.all([
          fetch("http://localhost:4000/api/cases"),
          fetch("http://localhost:4000/api/sellers"),
        ]);

        const casesData = await casesRes.json();
        const sellersData = await sellersRes.json();

        const cases = casesData.data || [];
        const sellers = sellersData.data || [];

        setStats({
          totalCases: cases.length,
          openCases: cases.filter((c: any) => c.status === "open").length,
          criticalCases: cases.filter((c: any) => c.level === "CRITICAL").length,
          totalSellers: sellers.length,
          flaggedSellers: sellers.filter((s: any) => s.isFlagged).length,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Fraud detection overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cases"
          value={stats?.totalCases || 0}
          icon="🔍"
          color="blue"
        />
        <StatCard
          title="Open Cases"
          value={stats?.openCases || 0}
          icon="📋"
          color="yellow"
        />
        <StatCard
          title="Critical"
          value={stats?.criticalCases || 0}
          icon="⚠️"
          color="red"
        />
        <StatCard
          title="Flagged Sellers"
          value={stats?.flaggedSellers || 0}
          icon="🚨"
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <a
            href="/dashboard/cases"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View All Cases
          </a>
          <a
            href="/dashboard/sellers"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Manage Sellers
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: "blue" | "yellow" | "red" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}
