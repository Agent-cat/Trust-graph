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

  const getActionIcon = (action: string) => {
    if (action.includes("created")) return "🆕";
    if (action.includes("completed")) return "✅";
    if (action.includes("notified")) return "📧";
    if (action.includes("assigned")) return "👤";
    if (action.includes("appeal")) return "📝";
    if (action.includes("approved")) return "✅";
    if (action.includes("rejected")) return "❌";
    if (action.includes("changed")) return "🔄";
    return "📋";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-500">{logs.length} recent events</p>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <span>{getActionIcon(log.action)}</span>
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{log.action}</p>
                  <span className="text-sm text-gray-400">•</span>
                  <a
                    href={`/dashboard/cases`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {log.fraudCase.caseNumber}
                  </a>
                </div>

                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
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
