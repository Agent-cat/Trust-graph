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
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-black">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Fraud detection overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cases"
          value={stats?.totalCases || 0}
          change="+12%"
          trend="up"
        />
        <StatCard
          title="Open Cases"
          value={stats?.openCases || 0}
          change="+3"
          trend="up"
        />
        <StatCard
          title="Critical"
          value={stats?.criticalCases || 0}
          change="-2"
          trend="down"
        />
        <StatCard
          title="Flagged Sellers"
          value={stats?.flaggedSellers || 0}
          change="+1"
          trend="up"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/dashboard/cases"
          className="block p-6 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
        >
          <p className="text-lg font-semibold">View Cases</p>
          <p className="text-gray-400 text-sm mt-1">Review flagged transactions</p>
        </a>
        <a
          href="/dashboard/graph"
          className="block p-6 border-2 border-black rounded-xl hover:bg-gray-50 transition-colors"
        >
          <p className="text-lg font-semibold text-black">Graph Analysis</p>
          <p className="text-gray-500 text-sm mt-1">Explore fraud networks</p>
        </a>
        <a
          href="/dashboard/demo"
          className="block p-6 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
        >
          <p className="text-lg font-semibold text-black">Run Demo</p>
          <p className="text-gray-500 text-sm mt-1">Test the system</p>
        </a>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  trend,
}: {
  title: string;
  value: number;
  change: string;
  trend: "up" | "down";
}) {
  return (
    <div className="p-6 border border-gray-200 rounded-xl">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-black mt-2">{value}</p>
      <p
        className={`text-xs mt-2 ${
          trend === "up" ? "text-red-600" : "text-green-600"
        }`}
      >
        {change}
      </p>
    </div>
  );
}
