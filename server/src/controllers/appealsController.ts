import { Request, Response } from "express";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CreateAppealSchema = z.object({
  fraudCaseId: z.string().min(1),
  sellerId: z.string().min(1),
  reason: z.string().min(10),
  evidenceUrl: z.string().url().optional(),
});

export async function createAppeal(req: Request, res: Response) {
  try {
    const data = CreateAppealSchema.parse(req.body);

    const fraudCase = await prisma.fraudCase.findUnique({
      where: { id: data.fraudCaseId },
    });

    if (!fraudCase) {
      return res.status(404).json({ success: false, error: "Case not found" });
    }

    if (fraudCase.status === "dismissed" || fraudCase.status === "resolved") {
      return res.status(400).json({
        success: false,
        error: "Cannot appeal a closed case",
      });
    }

    const appeal = await prisma.appeal.create({
      data: {
        fraudCaseId: data.fraudCaseId,
        sellerId: data.sellerId,
        reason: data.reason,
        evidenceUrl: data.evidenceUrl,
        status: "pending",
      },
    });

    await prisma.auditLog.create({
      data: {
        fraudCaseId: data.fraudCaseId,
        action: "Appeal submitted",
        details: {
          appealId: appeal.id,
          sellerId: data.sellerId,
          reason: data.reason.substring(0, 100),
        },
        performedBy: data.sellerId,
      },
    });

    return res.status(201).json({ success: true, data: appeal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }
    console.error("Create appeal error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function listAppeals(req: Request, res: Response) {
  try {
    const { status, page = "1", limit = "20" } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        where,
        include: {
          fraudCase: {
            select: {
              id: true,
              caseNumber: true,
              riskScore: true,
              level: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.appeal.count({ where }),
    ]);

    return res.json({
      success: true,
      data: appeals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("List appeals error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function reviewAppeal(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, reviewerNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status must be 'approved' or 'rejected'",
      });
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id },
      include: { fraudCase: true },
    });

    if (!appeal) {
      return res.status(404).json({ success: false, error: "Appeal not found" });
    }

    const updatedAppeal = await prisma.appeal.update({
      where: { id },
      data: { status, reviewerNote },
    });

    // If approved, update the fraud case status
    if (status === "approved") {
      await prisma.fraudCase.update({
        where: { id: appeal.fraudCaseId },
        data: { status: "resolved" },
      });

      await prisma.auditLog.create({
        data: {
          fraudCaseId: appeal.fraudCaseId,
          action: "Appeal approved - hold removed",
          details: {
            appealId: id,
            reviewerNote,
          },
          performedBy: "investigator",
        },
      });
    } else {
      await prisma.auditLog.create({
        data: {
          fraudCaseId: appeal.fraudCaseId,
          action: "Appeal rejected",
          details: {
            appealId: id,
            reviewerNote,
          },
          performedBy: "investigator",
        },
      });
    }

    return res.json({ success: true, data: updatedAppeal });
  } catch (error) {
    console.error("Review appeal error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
