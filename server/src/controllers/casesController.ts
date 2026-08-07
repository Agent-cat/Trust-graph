import { Request, Response } from "express";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function listCases(req: Request, res: Response) {
  try {
    const { status, level, page = "1", limit = "20" } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (level) where.level = level;

    const skip = (Number(page) - 1) * Number(limit);

    const [cases, total] = await Promise.all([
      prisma.fraudCase.findMany({
        where,
        include: {
          seller: {
            select: { id: true, name: true, email: true },
          },
          riskSignals: {
            select: { type: true, score: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.fraudCase.count({ where }),
    ]);

    return res.json({
      success: true,
      data: cases,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("List cases error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getCase(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const fraudCase = await prisma.fraudCase.findUnique({
      where: { id },
      include: {
        seller: true,
        riskSignals: true,
        appeals: true,
        auditLogs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!fraudCase) {
      return res.status(404).json({ success: false, error: "Case not found" });
    }

    return res.json({ success: true, data: fraudCase });
  } catch (error) {
    console.error("Get case error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function updateCaseStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["open", "under_review", "resolved", "dismissed"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const fraudCase = await prisma.fraudCase.update({
      where: { id },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        fraudCaseId: id,
        action: `Status changed to ${status}`,
        performedBy: "investigator",
      },
    });

    return res.json({ success: true, data: fraudCase });
  } catch (error) {
    console.error("Update case error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
