"use client";

import { useEffect, useState } from "react";

interface SystemStats {
  sellers: number;
  orders: number;
  transactions: number;
  cases: number;
  appeals: number;
}

interface AnalysisResult {
  risk: {
    score: number;
  };
  level: string;
  action: string;
  ml: {
    transaction: number;
    graph: number;
    combined: number;
  };
  explanation: {
    summary: string;
    topRiskFactors: any[];
  };
  llm: {
    summary: string;
    recommendedAction: string;
  };
}

const testScenarios = [
  {
    name: "Low Risk - Normal Transaction",
    amount: 2500,
    refund_rate: 0.05,
    account_age_days: 400,
    ip_risk: 15,
    description: "Established seller with good history",
  },
  {
    name: "Medium Risk - New Seller",
    amount: 15000,
    refund_rate: 0.25,
    account_age_days: 15,
    ip_risk: 40,
    description: "New account with moderate activity",
  },
  {
    name: "High Risk - Suspicious Pattern",
    amount: 75000,
    refund_rate: 0.55,
    account_age_days: 5,
    ip_risk: 75,
    description: "High refund rate, new account",
  },
  {
    name: "Critical Risk - Fraud Ring",
    amount: 150000,
    refund_rate: 0.85,
    account_age_days: 2,
    ip_risk: 95,
    description: "Extremely high risk indicators",
  },
];

export default function DemoPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [sellersRes, ordersRes, casesRes] = await Promise.all([
          fetch("http://localhost:4000/api/sellers"),
          fetch("http://localhost:4000/api/transactions"),
          fetch("http://localhost:4000/api/cases"),
        ]);

        const [sellersData, ordersData, casesData] = await Promise.all([
          sellersRes.json(),
          ordersRes.json(),
          casesRes.json(),
        ]);

        setStats({
          sellers: sellersData.pagination?.total || 0,
          orders: 100,
          transactions: ordersData.pagination?.total || 0,
          cases: casesData.pagination?.total || 0,
          appeals: 0,
        });

        setTransactions(ordersData.data?.slice(0, 5) || []);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    }

    fetchStats();
  }, []);

  async function runAnalysis() {
    if (transactions.length === 0) return;

    setLoading(true);
    try {
      const tx = transactions[selectedScenario % transactions.length];
      const res = await fetch("http://localhost:4000/api/risk/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: tx.id }),
      });

      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.data);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">System Demo</h1>
        <p className="text-gray-500 text-sm mt-1">
          Trust Graph Fraud Detection System - Live Demo
        </p>
      </div>

      {/* System Overview */}
      <div className="bg-black rounded-xl p-6 text-white">
        <h2 className="text-sm font-medium text-gray-400 mb-4">System Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-gray-400 text-xs">Sellers</p>
            <p className="text-2xl font-bold mt-1">{stats?.sellers || 0}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Orders</p>
            <p className="text-2xl font-bold mt-1">{stats?.orders || 0}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Transactions</p>
            <p className="text-2xl font-bold mt-1">{stats?.transactions || 0}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Fraud Cases</p>
            <p className="text-2xl font-bold mt-1">{stats?.cases || 0}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Components</p>
            <p className="text-2xl font-bold mt-1">8</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Scenarios */}
        <div className="border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-500 mb-4">
            Test Scenarios
          </h2>
          <div className="space-y-3">
            {testScenarios.map((scenario, index) => (
              <button
                key={index}
                onClick={() => setSelectedScenario(index)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedScenario === index
                    ? "border-black bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-medium text-black text-sm">{scenario.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {scenario.description}
                </p>
              </button>
            ))}
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading || transactions.length === 0}
            className="w-full mt-4 px-4 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>

        {/* Analysis Results */}
        <div className="border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-500 mb-4">
            Analysis Results
          </h2>

          {analysisResult ? (
            <div className="space-y-4">
              {/* Risk Score */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Risk Score
                </p>
                <p className="text-4xl font-bold text-black mt-2">
                  {analysisResult.risk.score}
                </p>
                <p className="text-sm font-medium text-gray-600 mt-1">
                  {analysisResult.level}
                </p>
              </div>

              {/* ML Predictions */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-400">Transaction</p>
                  <p className="font-bold text-black">
                    {(analysisResult.ml.transaction * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="p-3 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-400">Graph</p>
                  <p className="font-bold text-black">
                    {(analysisResult.ml.graph * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="p-3 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-400">Combined</p>
                  <p className="font-bold text-black">
                    {(analysisResult.ml.combined * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* LLM Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  AI Analysis
                </p>
                <p className="text-sm text-gray-700">
                  {analysisResult.llm.summary}
                </p>
              </div>

              {/* Recommended Action */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Recommended Action
                </p>
                <p className="text-sm font-medium text-black">
                  {analysisResult.action.replace(/_/g, " ")}
                </p>
              </div>

              {/* Risk Factors */}
              {analysisResult.explanation.topRiskFactors.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                    Risk Factors
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {analysisResult.explanation.topRiskFactors
                      .slice(0, 3)
                      .map((factor: any, i: number) => (
                        <li key={i}>
                          · {factor.feature.replace(/_/g, " ")}:{" "}
                          {factor.direction}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">
              Select a scenario and run analysis
            </div>
          )}
        </div>
      </div>

      {/* Architecture */}
      <div className="border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-medium text-gray-500 mb-4">
          System Architecture
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: "Next.js", desc: "Frontend Dashboard" },
            { name: "Node.js API", desc: "Express + TypeScript" },
            { name: "PostgreSQL", desc: "Application Data" },
            { name: "Neo4j", desc: "Graph Database" },
            { name: "XGBoost", desc: "Transaction ML" },
            { name: "GraphSAGE", desc: "Graph ML" },
            { name: "SHAP", desc: "Explanations" },
            { name: "Guardrails", desc: "95% Precision" },
          ].map((item) => (
            <div
              key={item.name}
              className="p-4 border border-gray-200 rounded-lg text-center"
            >
              <p className="font-medium text-black text-sm">{item.name}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
