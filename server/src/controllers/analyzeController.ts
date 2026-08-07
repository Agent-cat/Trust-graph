import { Request, Response } from "express";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { calculateRisk, determineAction } from "../risk/calculateRisk";
import { runQuery } from "../utils/neo4j";
import { z } from "zod";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const AnalyzeRequestSchema = z.object({
  transactionId: z.string().min(1),
});

async function getGraphRisk(sellerId: string) {
  try {
    // Find shared devices
    const sharedDevices = await runQuery(`
      MATCH (s:Seller {id: $sellerId})-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(c:Customer)
      WITH d, count(c) as customerCount
      WHERE customerCount > 1
      RETURN d.id as deviceId, customerCount
      ORDER BY customerCount DESC
    `, { sellerId });

    // Find shared IPs
    const sharedIps = await runQuery(`
      MATCH (s:Seller {id: $sellerId})-[:USES_IP]->(ip:IP)<-[:USES_IP]-(c:Customer)
      WITH ip, count(c) as customerCount
      WHERE customerCount > 1
      RETURN ip.address as ip, customerCount
      ORDER BY customerCount DESC
    `, { sellerId });

    let graphRisk = 0;
    const reasons: string[] = [];

    if (sharedDevices.length > 0) {
      const maxShared = Math.max(...sharedDevices.map((d: any) => Number(d.customerCount)));
      graphRisk += Math.min(maxShared * 12, 45);
      reasons.push(`Device shared with ${maxShared} customers`);
    }

    if (sharedIps.length > 0) {
      const maxShared = Math.max(...sharedIps.map((i: any) => Number(i.customerCount)));
      graphRisk += Math.min(maxShared * 10, 35);
      reasons.push(`IP shared with ${maxShared} customers`);
    }

    return { graphRisk: Math.min(graphRisk, 100), reasons };
  } catch (error) {
    console.error("Graph risk error:", error);
    return { graphRisk: 0, reasons: [] };
  }
}

export async function analyzeTransaction(req: Request, res: Response) {
  try {
    const { transactionId } = AnalyzeRequestSchema.parse(req.body);

    // Load transaction with all related data
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        order: {
          include: {
            seller: true,
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
      });
    }

    const seller = transaction.order.seller;

    // Count recent orders for velocity check
    const recentOrders = await prisma.order.count({
      where: {
        sellerId: seller.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    // Count disputed orders
    const disputedOrders = await prisma.order.count({
      where: {
        sellerId: seller.id,
        status: "disputed",
      },
    });

    const totalOrders = seller.totalOrders || 1;

    // Get graph risk from Neo4j
    const { graphRisk, reasons: graphReasons } = await getGraphRisk(seller.id);

    // Run risk engine with graph risk
    const risk = calculateRisk({
      amount: transaction.amount,
      refundRate: seller.refundRate,
      accountAgeDays: seller.accountAgeDays,
      ipRisk: 50, // Placeholder - would come from external API
      orderCount24h: recentOrders,
      disputedRate: disputedOrders / totalOrders,
      graphRisk,
      graphReasons,
    });

    const action = determineAction(risk.level);

    // Create fraud case
    const caseNumber = `CASE-${Date.now().toString(36).toUpperCase()}`;
    const fraudCase = await prisma.fraudCase.create({
      data: {
        sellerId: seller.id,
        caseNumber,
        riskScore: risk.score,
        level: risk.level,
        action,
        reasons: risk.reasons,
        status: "open",
      },
    });

    // Create risk signals
    await prisma.riskSignal.createMany({
      data: risk.signals.map((signal) => ({
        fraudCaseId: fraudCase.id,
        transactionId: transaction.id,
        type: signal.type,
        score: signal.score,
        details: {
          detail: signal.detail,
          combinedScore: risk.score,
        },
      })),
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        fraudCaseId: fraudCase.id,
        action: "Risk analysis completed",
        details: {
          transactionId: transaction.id,
          sellerId: seller.id,
          riskScore: risk.score,
          level: risk.level,
          action,
          graphRisk,
        },
        performedBy: "system",
      },
    });

    return res.json({
      success: true,
      data: {
        caseId: fraudCase.id,
        caseNumber: fraudCase.caseNumber,
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
        },
        seller: {
          id: seller.id,
          name: seller.name,
        },
        risk: {
          score: risk.score,
          level: risk.level,
          signals: risk.signals,
        },
        action,
        reasons: risk.reasons,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    console.error("Analysis error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
