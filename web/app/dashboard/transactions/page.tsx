"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
  order: {
    id: string;
    seller: {
      name: string;
    };
  };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    score: number;
    level: string;
    action: string;
  } | null>(null);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const res = await fetch("http://localhost:4000/api/transactions");
        const data = await res.json();
        setTransactions(data.data || []);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, []);

  async function analyzeTransaction(txId: string) {
    setAnalyzing(txId);
    try {
      const res = await fetch("http://localhost:4000/api/risk/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: txId }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysis({
          score: data.data.risk.score,
          level: data.data.risk.level,
          action: data.data.action,
        });
      }
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setAnalyzing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">Transactions</h1>
        <p className="text-gray-500 text-sm mt-1">
          {transactions.length} recent transactions
        </p>
      </div>

      {/* Transactions Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Seller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-gray-600">
                  {tx.id.slice(0, 12)}...
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {tx.order.seller.name}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-black">
                  ₹{tx.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tx.type === "payment"
                        ? "bg-black text-white"
                        : tx.type === "refund"
                          ? "bg-gray-200 text-gray-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tx.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tx.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tx.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => analyzeTransaction(tx.id)}
                    disabled={analyzing === tx.id}
                    className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {analyzing === tx.id ? "..." : "Analyze"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Analysis result modal */}
      <Modal
        open={!!analysis}
        type="info"
        title="Risk Analysis Result"
        message={
          analysis
            ? `Risk score ${analysis.score}/100 · Level ${analysis.level}. Recommended action: ${analysis.action.replace(
                /_/g,
                " "
              )}`
            : ""
        }
        onClose={() => setAnalysis(null)}
        cancelText="Close"
      />
    </div>
  );
}
