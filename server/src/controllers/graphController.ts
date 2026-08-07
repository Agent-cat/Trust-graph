import { Request, Response } from "express";
import { runQuery, runWrite } from "../utils/neo4j";

export async function getGraphNeighbors(req: Request, res: Response) {
  try {
    const { nodeId, depth = 2 } = req.query;

    if (!nodeId) {
      return res.status(400).json({ success: false, error: "nodeId required" });
    }

    const query = `
      MATCH path = (start {id: $nodeId})-[*1..${Number(depth)}]-(neighbor)
      RETURN path
      LIMIT 50
    `;

    const results = await runQuery(query, { nodeId: String(nodeId) });

    // Extract nodes and relationships
    const nodesMap = new Map();
    const relationships = [];

    for (const result of results) {
      const path = result.path;
      if (path?.segments) {
        for (const segment of path.segments) {
          const startNode = segment.start;
          const endNode = segment.end;
          const rel = segment.relationship;

          nodesMap.set(startNode.elementId || startNode.id, {
            id: startNode.id || startNode.elementId,
            labels: startNode.labels,
            properties: startNode.properties,
          });

          nodesMap.set(endNode.elementId || endNode.id, {
            id: endNode.id || endNode.elementId,
            labels: endNode.labels,
            properties: endNode.properties,
          });

          relationships.push({
            id: rel.elementId,
            type: rel.type,
            startNode: startNode.id || startNode.elementId,
            endNode: endNode.id || endNode.elementId,
          });
        }
      }
    }

    return res.json({
      success: true,
      data: {
        nodes: Array.from(nodesMap.values()),
        relationships,
      },
    });
  } catch (error) {
    console.error("Graph neighbor error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getGraphStats(req: Request, res: Response) {
  try {
    const nodeCount = await runQuery("MATCH (n) RETURN count(n) as count");
    const relCount = await runQuery("MATCH ()-[r]->() RETURN count(r) as count");

    const nodeLabels = await runQuery(`
      MATCH (n) UNWIND labels(n) as label RETURN label, count(n) as count ORDER BY count DESC
    `);

    const relTypes = await runQuery(`
      MATCH ()-[r]->() RETURN type(r) as type, count(r) as count ORDER BY count DESC
    `);

    // Find suspicious clusters (devices with >2 accounts)
    const suspiciousDevices = await runQuery(`
      MATCH (n)-[:USES_DEVICE]->(d:Device)
      WITH d, count(n) as accountCount
      WHERE accountCount > 2
      RETURN d.id as deviceId, accountCount
      ORDER BY accountCount DESC
    `);

    return res.json({
      success: true,
      data: {
        totalNodes: nodeCount[0]?.count || 0,
        totalRelationships: relCount[0]?.count || 0,
        nodeLabels,
        relTypes,
        suspiciousDevices,
      },
    });
  } catch (error) {
    console.error("Graph stats error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getSellerGraphRisk(req: Request, res: Response) {
  try {
    const { sellerId } = req.params;

    // Find shared devices with suspicious accounts
    const sharedDevices = await runQuery(`
      MATCH (s:Seller {id: $sellerId})-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(c:Customer)
      WITH d, collect(c) as customers, count(c) as customerCount
      WHERE customerCount > 1
      RETURN d.id as deviceId, customerCount, [c IN customers | c.id] as customerIds
      ORDER BY customerCount DESC
    `, { sellerId });

    // Find shared IPs
    const sharedIps = await runQuery(`
      MATCH (s:Seller {id: $sellerId})-[:USES_IP]->(ip:IP)<-[:USES_IP]-(c:Customer)
      WITH ip, collect(c) as customers, count(c) as customerCount
      WHERE customerCount > 1
      RETURN ip.address as ip, customerCount, [c IN customers | c.id] as customerIds
      ORDER BY customerCount DESC
    `, { sellerId });

    // Calculate graph risk score
    let graphRisk = 0;
    const reasons: string[] = [];

    if (sharedDevices.length > 0) {
      const maxShared = Math.max(...sharedDevices.map((d: any) => Number(d.customerCount)));
      graphRisk += Math.min(maxShared * 10, 40);
      reasons.push(`Device shared with ${maxShared} customers`);
    }

    if (sharedIps.length > 0) {
      const maxShared = Math.max(...sharedIps.map((i: any) => Number(i.customerCount)));
      graphRisk += Math.min(maxShared * 8, 30);
      reasons.push(`IP shared with ${maxShared} customers`);
    }

    return res.json({
      success: true,
      data: {
        sellerId,
        graphRisk: Math.min(graphRisk, 100),
        sharedDevices,
        sharedIps,
        reasons,
      },
    });
  } catch (error) {
    console.error("Seller graph risk error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
