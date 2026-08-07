import { Request, Response } from "express";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function listSellers(req: Request, res: Response) {
  try {
    const { flagged, page = "1", limit = "20" } = req.query;

    const where: any = {};
    if (flagged === "true") where.isFlagged = true;

    const skip = (Number(page) - 1) * Number(limit);

    const [sellers, total] = await Promise.all([
      prisma.seller.findMany({
        where,
        include: {
          _count: {
            select: { orders: true, fraudCases: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.seller.count({ where }),
    ]);

    return res.json({
      success: true,
      data: sellers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("List sellers error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export async function getSeller(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const seller = await prisma.seller.findUnique({
      where: { id },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        fraudCases: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!seller) {
      return res.status(404).json({ success: false, error: "Seller not found" });
    }

    return res.json({ success: true, data: seller });
  } catch (error) {
    console.error("Get seller error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
