import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sellerId = searchParams.get("sellerId");
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  try {
    const products = await prisma.product.findMany({
      where: {
        sellerId: sellerId || undefined,
        category: category || undefined,
        name: search ? { contains: search, mode: "insensitive" } : undefined,
      },
      include: {
        seller: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user } = await requireUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const role = (user as any).role;
  if (role !== "seller" && role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Only sellers can create products" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, description, price, stock, category, imageUrl } = body;

    if (!name || !price || !category) {
      return NextResponse.json(
        { success: false, error: "Name, price and category are required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || "",
        price: Number(price),
        stock: Number(stock) || 0,
        category,
        imageUrl: imageUrl || null,
        sellerId: user.id,
      },
      include: {
        seller: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create product" },
      { status: 500 }
    );
  }
}