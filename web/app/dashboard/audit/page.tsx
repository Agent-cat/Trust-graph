"use client";

import { useEffect, useState } from "react";

interface AuditLog {
  id: string;
  action: string;
  details: any;
  performedBy: string;
  createdAt: string;
  fraudCase: {
    caseNumber: string;
  };
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("http://localhost:4000/api/audit-logs");
        const data = await res.json();
        setLogs(data.data || []);
      } catch (error) {
        console.error("Failed to fetch audit logs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  const getActionDot = (action: string) => {
    if (action.includes("created")) return "bg-green-500";
    if (action.includes("completed")) return "bg-green-500";
    if (action.includes("approved")) return "bg-green-500";
    if (action.includes("rejected")) return "bg-red-500";
    if (action.includes("changed")) return "bg-yellow-500";
    return "bg-black";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">Audit Logs</h1>
        <p className="text-gray-500 text-sm mt-1">
          {logs.length} recent events
        </p>
      </div>

      {/* Timeline */}
      <div className="border border-gray-200 rounded-xl p-6">
        <div className="space-y-6">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-4">
              {/* Dot */}
              <div className="flex-shrink-0 mt-2">
                <div className={`w-2 h-2 rounded-full ${getActionDot(log.action)}`} />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-black text-sm">{log.action}</p>
                  <span className="text-gray-300">·</span>
                  <a
                    href={`/dashboard/cases`}
                    className="text-sm text-gray-500 hover:text-black transition-colors"
                  >
                    {log.fraudCase.caseNumber}
                  </a>
                </div>

                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                  <span>By: {log.performedBy}</span>
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
