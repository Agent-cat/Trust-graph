import { Request, Response } from "express";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { calculateRisk, determineAction } from "../risk/calculateRisk";
import { getActionWithGuardrail, calculatePrecisionMetrics } from "../risk/guardrail";
import { runQuery } from "../utils/neo4j";
import { getMLPrediction, getGraphMLPrediction, getMLExplanation, checkMLHealth } from "../services/mlService";
import { checkIPReputation } from "../services/abuseIpDb";
import { verifyGSTIN, calculateGSTINRisk } from "../services/gstinVerification";
import { generateLLMExplanation } from "../services/llmExplanation";
import { z } from "zod";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const AnalyzeRequestSchema = z.object({
  transactionId: z.string().min(1),
});

async function getGraphRisk(sellerId: string) {
  try {
    const sharedDevices = await runQuery(`
      MATCH (s:Seller {id: $sellerId})-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(c:Customer)
      WITH d, count(c) as customerCount
      WHERE customerCount > 1
      RETURN d.id as deviceId, customerCount
      ORDER BY customerCount DESC
    `, { sellerId });

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

    const recentOrders = await prisma.order.count({
      where: {
        sellerId: seller.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    const disputedOrders = await prisma.order.count({
      where: {
        sellerId: seller.id,
        status: "disputed",
      },
    });

    const totalOrders = seller.totalOrders || 1;

    // Get external signals
    const ipData = await checkIPReputation(transaction.ipAddress || "0.0.0.0");
    const ipRiskScore = ipData ? ipData.abuseConfidenceScore : 50;

    const gstinData = seller.gstin ? await verifyGSTIN(seller.gstin) : null;
    const gstinRisk = seller.gstin
      ? calculateGSTINRisk(seller.gstin, seller.accountAgeDays)
      : { riskScore: 0, reasons: [] };

    const { graphRisk, reasons: graphReasons } = await getGraphRisk(seller.id);

    // Get ML predictions
    const mlPrediction = await getMLPrediction({
      amount: transaction.amount,
      refund_rate: seller.refundRate,
      account_age_days: seller.accountAgeDays,
      ip_risk: ipRiskScore,
      device_linked_accounts: 2,
      order_count_24h: recentOrders,
      disputed_rate: disputedOrders / totalOrders,
      graph_risk: graphRisk,
    });

    const graphMLPrediction = await getGraphMLPrediction({
      degree: 3,
      clustering_coeff: 0.3,
      pagerank: 0.001,
      neighbor_fraud_rate: graphRisk / 100,
      shared_device_count: 2,
      shared_ip_count: 1,
      total_transactions: recentOrders,
      avg_amount: transaction.amount,
      refund_rate: seller.refundRate,
    });

    // Combine ML predictions
    const combinedMLProbability = (
      mlPrediction.fraud_probability * 0.6 +
      graphMLPrediction.fraud_probability * 0.4
    );

    // Run risk engine with all signals
    const risk = calculateRisk({
      amount: transaction.amount,
      refundRate: seller.refundRate,
      accountAgeDays: seller.accountAgeDays,
      ipRisk: ipRiskScore,
      orderCount24h: recentOrders,
      disputedRate: disputedOrders / totalOrders,
      graphRisk: Math.min(graphRisk + gstinRisk.riskScore, 100),
      graphReasons: [...graphReasons, ...gstinRisk.reasons],
      mlFraudProbability: combinedMLProbability,
    });

    // Get historical predictions for precision calculation
    const recentCases = await prisma.fraudCase.findMany({
      take: 200,
      orderBy: { createdAt: "desc" },
      select: { level: true, status: true },
    });

    const predictions = recentCases.map((c) => ({
      predicted: c.level === "HIGH" || c.level === "CRITICAL",
      actual: c.status === "resolved",
    }));

    const precisionMetrics = calculatePrecisionMetrics(predictions);

    // Apply guardrail
    const { action, requiresHumanReview, reason: guardrailReason } =
      getActionWithGuardrail(risk.level, precisionMetrics);

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
          mlPrediction: combinedMLProbability,
          guardrail: {
            requiresHumanReview,
            reason: guardrailReason,
            precision: precisionMetrics.precision,
          },
        },
        performedBy: "system",
      },
    });

    // Get SHAP explanation
    const explanation = await getMLExplanation({
      amount: transaction.amount,
      refund_rate: seller.refundRate,
      account_age_days: seller.accountAgeDays,
      ip_risk: ipRiskScore,
      device_linked_accounts: 2,
      order_count_24h: recentOrders,
      disputed_rate: disputedOrders / totalOrders,
      graph_risk: graphRisk,
    });

    // Generate LLM explanation
    const llmExplanation = await generateLLMExplanation({
      riskScore: risk.score,
      level: risk.level,
      reasons: risk.reasons,
      signals: risk.signals,
      sellerName: seller.name,
      transactionAmount: transaction.amount,
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
        ml: {
          transaction: mlPrediction.fraud_probability,
          graph: graphMLPrediction.fraud_probability,
          combined: combinedMLProbability,
          isFraud: combinedMLProbability > 0.5,
        },
        external: {
          ip: ipData ? {
            score: ipData.abuseConfidenceScore,
            country: ipData.countryCode,
            isp: ipData.isp,
            reports: ipData.totalReports,
          } : null,
          gstin: gstinData ? {
            status: gstinData.status,
            state: gstinData.state,
            businessType: gstinData.businessType,
          } : null,
        },
        guardrail: {
          requiresHumanReview,
          reason: guardrailReason,
          precision: precisionMetrics.precision,
          sampleSize: precisionMetrics.sampleSize,
        },
        explanation: {
          summary: explanation.summary,
          topRiskFactors: explanation.top_risk_factors,
          topSafetyFactors: explanation.top_safety_factors,
        },
        llm: {
          summary: llmExplanation.summary,
          detailedAnalysis: llmExplanation.detailedAnalysis,
          recommendedAction: llmExplanation.recommendedAction,
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
