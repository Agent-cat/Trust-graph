import { Request, Response } from "express";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { calculateFairnessMetrics, getFairnessRecommendations } from "../risk/fairness";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function getFairnessReport(req: Request, res: Response) {
  try {
    // Get recent cases for analysis
    const cases = await prisma.fraudCase.findMany({
      take: 500,
      orderBy: { createdAt: "desc" },
      include: {
        seller: {
          select: { id: true, name: true, accountAgeDays: true },
        },
      },
    });

    // Group sellers by account age (proxy for groups)
    const predictions = cases.map((c) => {
      // Determine group based on account age
      let group: string;
      if (c.seller.accountAgeDays < 30) {
        group = "new_seller";
      } else if (c.seller.accountAgeDays < 365) {
        group = "established_seller";
      } else {
        group = "veteran_seller";
      }

      return {
        predicted: c.level === "HIGH" || c.level === "CRITICAL",
        actual: c.status === "resolved",
        group,
      };
    });

    const fairnessMetrics = calculateFairnessMetrics(predictions);
    const recommendations = getFairnessRecommendations(fairnessMetrics);

    return res.json({
      success: true,
      data: {
        metrics: fairnessMetrics,
        recommendations,
        sampleSize: predictions.length,
        groupDistribution: {
          new_seller: predictions.filter((p) => p.group === "new_seller").length,
          established_seller: predictions.filter((p) => p.group === "established_seller").length,
          veteran_seller: predictions.filter((p) => p.group === "veteran_seller").length,
        },
      },
    });
  } catch (error) {
    console.error("Fairness report error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
