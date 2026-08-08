import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: { name: true, email: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await requireUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const role = (user as any).role;
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Only seller who owns product or admin can update
    if (role !== "admin" && product.sellerId !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only edit your own products" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, price, stock, category, imageUrl, isActive } =
      body;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name ?? product.name,
        description: description ?? product.description,
        price: price !== undefined ? Number(price) : product.price,
        stock: stock !== undefined ? Number(stock) : product.stock,
        category: category ?? product.category,
        imageUrl: imageUrl ?? product.imageUrl,
        isActive: isActive ?? product.isActive,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await requireUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const role = (user as any).role;
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    if (role !== "admin" && product.sellerId !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only delete your own products" },
        { status: 403 }
      );
    }

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete product" },
      { status: 500 }
    );
  }
}