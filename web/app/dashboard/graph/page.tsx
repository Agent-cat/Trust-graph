"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Tooltip from "@/components/Tooltip";

interface GraphData {
  nodes: {
    id: string;
    labels: string[];
    properties: Record<string, any>;
  }[];
  relationships: {
    id: string;
    type: string;
    startNode: string;
    endNode: string;
  }[];
}

interface GraphStats {
  totalNodes: number;
  totalRelationships: number;
  nodeLabels: { label: string; count: number }[];
  relTypes: { type: string; count: number }[];
  suspiciousDevices: { deviceId: string; accountCount: number }[];
}

interface VerdictItem {
  id: string;
  name: string;
  label: "Seller" | "Customer";
  score: number;
  verdict: "SAFE" | "SUSPICIOUS" | "RISKY" | "HIGH_RISK";
  reasons: string[];
}

interface VerdictsData {
  sellers: VerdictItem[];
  customers: VerdictItem[];
}

const getNumberValue = (val: number | { low: number }): number => {
  if (typeof val === "object" && val !== null && "low" in val) {
    return val.low;
  }
  return Number(val);
};

const FRAUD_REL_TYPES = ["USES_DEVICE", "USES_IP"];

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchId, setSearchId] = useState("seller_2");
  const [inputId, setInputId] = useState("seller_2");
  const [hidden, setHidden] = useState(false);
  const [verdicts, setVerdicts] = useState<VerdictsData | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const [graphRes, statsRes, verdictsRes] = await Promise.all([
          fetch(`http://localhost:4000/api/graph/neighbors?nodeId=${searchId}&depth=2`),
          fetch("http://localhost:4000/api/graph/stats"),
          fetch("http://localhost:4000/api/graph/verdicts"),
        ]);

        const graphResult = await graphRes.json();
        const statsResult = await statsRes.json();
        const verdictsResult = await verdictsRes.json();

        if (!graphResult.success) {
          setError(graphResult.error || "Failed to fetch graph");
        } else {
          setGraphData(graphResult.data);
        }
        if (statsResult.success) {
          setStats(statsResult.data);
        }
        if (verdictsResult.success) {
          setVerdicts(verdictsResult.data);
        }
      } catch (err) {
        console.error("Failed to fetch graph data:", err);
        setError("Graph server is not running on port 4000");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [searchId]);

  // Detect fraud indicators from the current graph neighborhood
  const fraudAnalysis = useMemo(() => {
    if (!graphData) return null;

    const nodes = graphData.nodes;
    const rels = graphData.relationships;

    // Flag already-known risky sellers
    const riskySellers = new Set<string>();
    nodes.forEach((n) => {
      if (n.labels.includes("Seller") && n.properties.risky === true) {
        riskySellers.add(n.id);
      }
    });

    // Devices / IPs used by multiple customers or by a customer + seller => fraudulent sharing
    const deviceUsage = new Map<string, Set<string>>();
    const ipUsage = new Map<string, Set<string>>();
    const deviceConsumerTypes = new Map<string, Set<string>>();

    rels.forEach((rel) => {
      if (rel.type === "USES_DEVICE") {
        if (!deviceUsage.has(rel.endNode)) deviceUsage.set(rel.endNode, new Set());
        deviceUsage.get(rel.endNode)!.add(rel.startNode);
        if (!deviceConsumerTypes.has(rel.endNode)) deviceConsumerTypes.set(rel.endNode, new Set());
        deviceConsumerTypes.get(rel.endNode)!.add(
          nodes.find((n) => n.id === rel.startNode)?.labels[0] || ""
        );
      } else if (rel.type === "USES_IP") {
        if (!ipUsage.has(rel.endNode)) ipUsage.set(rel.endNode, new Set());
        ipUsage.get(rel.endNode)!.add(rel.startNode);
      }
    });

    const sharedDeviceIds = new Set<string>();
    deviceUsage.forEach((users, deviceId) => {
      if (users.size > 1) sharedDeviceIds.add(deviceId);
    });
    const sharedIpIds = new Set<string>();
    ipUsage.forEach((users, ipId) => {
      if (users.size > 1) sharedIpIds.add(ipId);
    });

    // Customers connected to risky sellers or sharing fraud devices
    const suspiciousCustomers = new Set<string>();
    rels.forEach((rel) => {
      const isShared =
        (rel.type === "USES_DEVICE" && sharedDeviceIds.has(rel.endNode)) ||
        (rel.type === "USES_IP" && sharedIpIds.has(rel.endNode));
      if (isShared && rel.startNode.startsWith("cust_")) {
        suspiciousCustomers.add(rel.startNode);
      }
      if (rel.type === "PLACED" && rel.endNode && riskySellers.has(rel.endNode)) {
        suspiciousCustomers.add(rel.startNode);
      }
    });

    return {
      riskySellers,
      sharedDeviceIds,
      sharedIpIds,
      suspiciousCustomers,
      suspiciousDeviceCount: sharedDeviceIds.size + sharedIpIds.size,
    };
  }, [graphData]);

  useEffect(() => {
    if (!graphData || !fraudAnalysis) return;

    const flowNodes: Node[] = graphData.nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / graphData.nodes.length;
      const radius = Math.max(220, graphData.nodes.length * 28);
      const x = 500 + radius * Math.cos(angle);
      const y = 320 + radius * Math.sin(angle);

      const isRiskySeller = fraudAnalysis.riskySellers.has(node.id);
      const isSuspiciousCustomer = fraudAnalysis.suspiciousCustomers.has(node.id);
      const isSharedDevice =
        fraudAnalysis.sharedDeviceIds.has(node.id) || fraudAnalysis.sharedIpIds.has(node.id);

      const displayName =
        node.properties.name ||
        (node.labels[0] === "IP" ? node.properties.address : node.properties.id) ||
        node.id;

      let badge: string | null = null;
      let ringColor: string | null = null;
      if (isRiskySeller) {
        badge = "RISK";
        ringColor = "#dc2626";
      } else if (isSuspiciousCustomer) {
        badge = "?";
        ringColor = "#f59e0b";
      } else if (isSharedDevice) {
        badge = "HOT";
        ringColor = "#f59e0b";
      }

      const bgColor =
        isRiskySeller ? "#dc2626" :
        isSuspiciousCustomer ? "#f59e0b" :
        node.labels[0] === "Seller" ? "#000000" :
        node.labels[0] === "Customer" ? "#111827" :
        node.labels[0] === "Device" ? "#4b5563" :
        node.labels[0] === "IP" ? "#9ca3af" : "#525252";

      return {
        id: node.id,
        position: { x, y },
        data: {
          label: (
            <div className="flex flex-col items-center relative">
              {badge && (
                <div
                  className="absolute -top-1 -right-1 text-[9px] font-bold text-white px-1.5 py-0.5 rounded z-10"
                  style={{ backgroundColor: ringColor || "#111" }}
                >
                  {badge}
                </div>
              )}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-base font-bold"
                style={{
                  backgroundColor: bgColor,
                  boxShadow: ringColor ? `0 0 0 3px ${ringColor}` : "none",
                }}
              >
                {String(displayName)[0]}
              </div>
              <div className="mt-1.5 text-xs font-medium text-black max-w-[110px] text-center leading-tight">
                {String(displayName)}
              </div>
              <div className="text-[10px] text-gray-500">{node.labels[0]}</div>
            </div>
          ),
          nodeData: node,
          fraud: { isRiskySeller, isSuspiciousCustomer, isSharedDevice },
        },
        style: {
          background: "transparent",
          border: "none",
        },
      };
    });

    const flowEdges: Edge[] = graphData.relationships
      .filter((rel) => (hidden ? rel.type !== "PLACED" : true))
      .filter(
        (rel, index, arr) =>
          arr.findIndex(
            (r) =>
              r.startNode === rel.startNode &&
              r.endNode === rel.endNode &&
              r.type === rel.type
          ) === index
      )
      .map((rel, index) => {
        const relatesToFraud =
          (rel.type === "USES_DEVICE" && fraudAnalysis.sharedDeviceIds.has(rel.endNode)) ||
          (rel.type === "USES_IP" && fraudAnalysis.sharedIpIds.has(rel.endNode)) ||
          (rel.type === "PLACED" &&
            (fraudAnalysis.riskySellers.has(rel.endNode) ||
              fraudAnalysis.riskySellers.has(rel.startNode)));

        return {
          id: `${rel.startNode}-${rel.endNode}-${rel.type}-${index}`,
          source: rel.startNode,
          target: rel.endNode,
          label: rel.type.replace(/_/g, " "),
          labelStyle: {
            fontSize: 10,
            fill: relatesToFraud ? "#dc2626" : "#525252",
          },
          animated: rel.type === "USES_DEVICE" || rel.type === "USES_IP",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
            color: relatesToFraud ? "#dc2626" : "#737373",
          },
          style: {
            stroke: relatesToFraud ? "#dc2626" : "#d4d4d4",
            strokeWidth: relatesToFraud ? 2.5 : 1.5,
          },
        };
      });

    setNodes(nodes);
    setEdges(flowEdges);
  }, [graphData, fraudAnalysis, setNodes, setEdges, hidden]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.data.nodeData);
  }, []);

  const [selectedNode, setSelectedNode] = useState<any>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading graph...</div>
      </div>
    );
  }

  const totalFraudSignals = fraudAnalysis
    ? fraudAnalysis.riskySellers.size +
      fraudAnalysis.suspiciousCustomers.size +
      fraudAnalysis.sharedDeviceIds.size +
      fraudAnalysis.sharedIpIds.size
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Fraud Graph View</h1>
          <p className="text-gray-500 text-sm mt-1">
            Explore the network and spot fraud rings & shared device clusters
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearchId(inputId)}
            placeholder="Enter node ID (e.g., seller_2)"
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={() => setSearchId(inputId)}
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* How it works */}
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            How the graph spots fraud
          </h2>
          <Tooltip
            text="The graph connects every customer, seller, device and IP address. Fraud usually means a device or IP is reused by many accounts, or accounts only interact with a flagged seller. The page colors risky items red and amber so you can see the pattern at a glance."
            position="bottom"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1">
              1. Build the network
              <Tooltip
                size="sm"
                text="Every transaction becomes a node or relationship in a graph database (Neo4j). Customers, sellers, devices, and IP addresses are the nodes; 'uses device', 'uses IP' and 'placed order' are the connections."
              />
            </p>
            <p className="text-sm text-gray-700 mt-2">
              Customers, sellers, devices, and IPs are stored as nodes.
              Every order creates a <b>PLACED</b> link; every login creates a{" "}
              <b>USES_DEVICE</b> / <b>USES_IP</b> link.
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-1">
              2. Detect shared usage
              <Tooltip
                size="sm"
                text="If a device or IP address is shared by two or more accounts, the graph counts it. One device powering many customer accounts, or a device shared between customers and a seller, is a classic fraud-ring signature."
              />
            </p>
            <p className="text-sm text-gray-700 mt-2">
              When a device or IP is shared by several accounts, the edge turns{" "}
              <span className="text-red-600 font-medium">red</span> and the node
              gets an <b>HOT</b> badge.
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-1">
              3. Score & verdict
              <Tooltip
                size="sm"
                text="Each seller and customer gets a verdict from the evidence: flagged sellers (RISK), accounts sharing devices or IPs, and accounts ordering only from risky sellers earn points. High scores produce HIGH_RISK / RISKY / SUSPICIOUS / SAFE."
              />
            </p>
            <p className="text-sm text-gray-700 mt-2">
              Every seller & customer earns a verdict below —{" "}
              <span className="text-green-600 font-medium">SAFE</span> to{" "}
              <span className="text-red-600 font-medium">HIGH RISK</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Fraud summary strip */}
      {fraudAnalysis && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-red-200 bg-red-50 rounded-xl p-4">
            <p className="text-xs text-red-500 font-medium uppercase tracking-wider">Risky Sellers</p>
            <p className="text-2xl font-bold text-red-700 mt-1">
              {fraudAnalysis.riskySellers.size}
            </p>
          </div>
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">Suspicious Customers</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {fraudAnalysis.suspiciousCustomers.size}
            </p>
          </div>
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">Shared Devices/IPs</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {fraudAnalysis.suspiciousDeviceCount}
            </p>
          </div>
          <div
            className={`border rounded-xl p-4 ${
              totalFraudSignals > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-red-500">Total Fraud Signals</p>
            <p className="text-2xl font-bold mt-1 text-red-700">{totalFraudSignals}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph Canvas */}
        <div className="lg:col-span-3 border border-gray-200 rounded-xl overflow-hidden h-[620px] bg-gray-50">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-left"
          >
            <Background gap={20} />
            <Controls />
            <MiniMap
              nodeColor={(node: any) => {
                const f = node.data?.fraud;
                if (f?.isRiskySeller) return "#dc2626";
                if (f?.isSuspiciousCustomer || f?.isSharedDevice) return "#f59e0b";
                const label = node.data?.nodeData?.labels?.[0];
                return label === "Customer" ? "#111827" : label === "Seller" ? "#000000" : label === "Device" ? "#4b5563" : "#9ca3af";
              }}
            />
          </ReactFlow>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          {stats && (
            <div className="border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-3">Graph Stats</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Nodes</span>
                  <span className="font-medium text-black">
                    {getNumberValue(stats.totalNodes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Relationships</span>
                  <span className="font-medium text-black">
                    {getNumberValue(stats.totalRelationships)}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Suspicious Devices (whole graph)
                </p>
                {(stats.suspiciousDevices || []).map((device, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-red-50 rounded-lg mb-1"
                  >
                    <span className="text-xs font-mono text-gray-700">
                      {device.deviceId}
                    </span>
                    <span className="text-xs text-red-600 font-medium">
                      {getNumberValue(device.accountCount)} accounts
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setHidden((h) => !h)}
                className="mt-4 w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {hidden ? "Show Order (PLACED) edges" : "Hide Order (PLACED) edges"}
              </button>
            </div>
          )}

          {/* Selected Node */}
          {selectedNode && (
            <div className="border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-3">Selected Node</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Type: </span>
                  <span className="px-2 py-0.5 rounded text-white text-xs bg-gray-700">
                    {selectedNode.labels[0]}
                  </span>
                </div>
                {Object.entries(selectedNode.properties).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500">{key}</span>
                    <span className="font-medium text-black truncate max-w-[150px]">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="border border-gray-200 rounded-xl p-4">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Fraud Legend</h2>
            <div className="space-y-2">
              {[
                { color: "#dc2626", label: "Risky Seller (flagged)" },
                { color: "#f59e0b", label: "Suspicious customer / shared device" },
                { color: "#111827", label: "Customer" },
                { color: "#000000", label: "Seller" },
                { color: "#4b5563", label: "Device" },
                { color: "#9ca3af", label: "IP Address" },
              ].map((entry) => (
                <div key={entry.label} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-gray-700">{entry.label}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-red-600" />
                  <span className="text-sm text-gray-700">Fraud edge (shared usage)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Search */}
          <div className="border border-gray-200 rounded-xl p-4">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Quick Search</h2>
            <div className="space-y-2">
              {["seller_2", "seller_5", "cust_1", "device_a1", "device_d4"].map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    setInputId(id);
                    setSearchId(id);
                  }}
                  className="w-full text-left px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Verdicts for sellers & customers */}
      {verdicts && (
        <div className="border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              Verdicts — every seller & customer
            </h2>
            <Tooltip
              text="Each person is scored automatically from evidence in the graph. Hover a question mark next to a verdict to see why it was given."
              position="bottom"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sellers */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-bold text-black">Sellers</h3>
                <Tooltip
                  size="sm"
                  text="Sellers flagged by the system earn 50 points; sharing a device or IP with customers adds more. 50+ => HIGH RISK, 25+ => RISKY, 10+ => SUSPICIOUS."
                />
              </div>
              <div className="space-y-2">
                {verdicts.sellers.map((v) => (
                  <VerdictRow key={v.id} item={v} />
                ))}
              </div>
            </div>

            {/* Customers */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-bold text-black">Customers</h3>
                <Tooltip
                  size="sm"
                  text="Customers ordering only from flagged sellers earn 40 points; using many devices or IPs adds more. Higher is riskier."
                />
              </div>
              <div className="space-y-2">
                {verdicts.customers.map((v) => (
                  <VerdictRow key={v.id} item={v} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type VerdictStyle = {
  bg: string;
  text: string;
  bar: string;
  label: string;
};

const verdictStyles: Record<string, VerdictStyle> = {
  SAFE: { bg: "bg-green-50", text: "text-green-700", bar: "bg-green-500", label: "SAFE" },
  SUSPICIOUS: { bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-500", label: "SUSPICIOUS" },
  RISKY: { bg: "bg-orange-50", text: "text-orange-700", bar: "bg-orange-500", label: "RISKY" },
  HIGH_RISK: { bg: "bg-red-50", text: "text-red-700", bar: "bg-red-600", label: "HIGH RISK" },
};

const verdictExplanations: Record<string, string> = {
  SAFE: "No fraud signals found. This account behaves like a normal buyer/seller.",
  SUSPICIOUS: "A few warning flags (e.g. shared IP or multiple devices). Not enough to act on yet.",
  RISKY: "Clear evidence of shared usage or links to flagged accounts. Worth a manual look.",
  HIGH_RISK: "Strong fraud indicators — flagged seller, device sharing rings, or ordering only from risky sellers. Immediate review recommended.",
};

function VerdictRow({ item }: { item: VerdictItem }) {
  const style = verdictStyles[item.verdict] || verdictStyles.SAFE;

  return (
    <div className={`flex items-center justify-between p-3 border border-gray-200 rounded-lg ${style.bg}`}>
      <div className="min-w-0">
        <p className="font-medium text-sm text-black truncate">{item.name}</p>
        <p className="text-xs text-gray-500">{item.id}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-20 bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${style.bar}`}
            style={{ width: `${item.score}%` }}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${style.bg} ${style.text}`}>
            {style.label}
          </span>
          <Tooltip
            size="sm"
            text={`${verdictExplanations[item.verdict]}${
              item.reasons.length
                ? ` Reasons: ${item.reasons.join("; ")}.`
                : ""
            }`}
          />
        </div>
      </div>
    </div>
  );
}