"use client";

import { useCallback, useEffect, useState } from "react";
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
  totalNodes: number | { low: number };
  totalRelationships: number | { low: number };
  nodeLabels: { label: string; count: number }[];
  relTypes: { type: string; count: number }[];
  suspiciousDevices: { deviceId: string; accountCount: number | { low: number } }[];
}

const nodeColors: Record<string, string> = {
  Customer: "#000000",
  Seller: "#404040",
  Device: "#737373",
  IP: "#a3a3a3",
};

const getNumberValue = (val: number | { low: number }): number => {
  if (typeof val === 'object' && val !== null && 'low' in val) {
    return val.low;
  }
  return val as number;
};

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("seller_2");
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [graphRes, statsRes] = await Promise.all([
          fetch(`http://localhost:4000/api/graph/neighbors?nodeId=${searchId}&depth=2`),
          fetch("http://localhost:4000/api/graph/stats"),
        ]);

        const graphResult = await graphRes.json();
        const statsResult = await statsRes.json();

        if (graphResult.success) {
          setGraphData(graphResult.data);
        }
        if (statsResult.success) {
          setStats(statsResult.data);
        }
      } catch (error) {
        console.error("Failed to fetch graph data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [searchId]);

  useEffect(() => {
    if (!graphData) return;

    const flowNodes: Node[] = graphData.nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / graphData.nodes.length;
      const radius = 200;
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      return {
        id: node.id,
        position: { x, y },
        data: {
          label: (
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto"
                style={{
                  backgroundColor: nodeColors[node.labels[0]] || "#525252",
                }}
              >
                {node.labels[0][0]}
              </div>
              <div className="mt-1 text-xs font-medium text-black">
                {node.properties.name || node.properties.id || node.properties.address}
              </div>
              <div className="text-[10px] text-gray-500">{node.labels[0]}</div>
            </div>
          ),
          nodeData: node,
        },
        style: {
          background: "transparent",
          border: "none",
        },
      };
    });

    const flowEdges: Edge[] = graphData.relationships.map((rel, index) => ({
      id: rel.id || `${rel.startNode}-${rel.endNode}-${rel.type}-${index}`,
      source: rel.startNode,
      target: rel.endNode,
      label: rel.type.replace(/_/g, " "),
      labelStyle: { fontSize: 10, fill: "#525252" },
      animated: rel.type === "USES_DEVICE" || rel.type === "USES_IP",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
      },
      style: { stroke: "#525252" },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [graphData, setNodes, setEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.data.nodeData);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading graph...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Graph Visualization</h1>
          <p className="text-gray-500 text-sm mt-1">
            Explore fraud network connections
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Enter node ID (e.g., seller_2)"
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={() => setSearchId(searchId)}
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph Canvas */}
        <div className="lg:col-span-3 border border-gray-200 rounded-xl overflow-hidden h-[600px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={(node: any) => {
                const label = node.data?.nodeData?.labels?.[0];
                return nodeColors[label] || "#525252";
              }}
            />
          </ReactFlow>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          {stats && (
            <div className="border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-3">
                Graph Stats
              </h2>
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
                  Suspicious Devices
                </p>
                {stats.suspiciousDevices.map((device, i) => (
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
            </div>
          )}

          {/* Selected Node */}
          {selectedNode && (
            <div className="border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-3">
                Selected Node
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Type: </span>
                  <span
                    className="px-2 py-0.5 rounded text-white text-xs"
                    style={{
                      backgroundColor: nodeColors[selectedNode.labels[0]] || "#525252",
                    }}
                  >
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
            <h2 className="text-sm font-medium text-gray-500 mb-3">Legend</h2>
            <div className="space-y-2">
              {Object.entries(nodeColors).map(([label, color]) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Search */}
          <div className="border border-gray-200 rounded-xl p-4">
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              Quick Search
            </h2>
            <div className="space-y-2">
              {["seller_2", "seller_5", "cust_1", "device_a1", "device_d4"].map((id) => (
                <button
                  key={id}
                  onClick={() => setSearchId(id)}
                  className="w-full text-left px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
