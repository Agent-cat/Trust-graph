import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
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
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: {
              select: { name: true, price: true, imageUrl: true, sellerId: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Permission check based on role
    if (role === "customer" && order.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    if (
      role === "seller" &&
      !order.items.some((item) => item.product.sellerId === user.id)
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Failed to fetch order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order" },
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
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Only customer who owns order or seller/admin can cancel
    const body = await request.json();
    const { status } = body;

    if (role === "customer" && order.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Seller can only mark as processing/shipped/delivered
    if (role === "seller") {
      const sellerCanSet = ["processing", "shipped", "delivered"];
      if (!sellerCanSet.includes(status)) {
        return NextResponse.json(
          { success: false, error: "Cannot set order to this status" },
          { status: 403 }
        );
      }

      // Check seller owns at least one product in the order
      const product = await prisma.product.findFirst({
        where: {
          id: { in: order.items.map((i) => i.productId) },
          sellerId: user.id,
        },
      });

      if (!product) {
        return NextResponse.json(
          { success: false, error: "Cannot update this order" },
          { status: 403 }
        );
      }
    }

    // Customer can only cancel pending orders
    if (role === "customer" && status !== "cancelled") {
      return NextResponse.json(
        { success: false, error: "Customers can only cancel orders" },
        { status: 403 }
      );
    }

    if (role === "customer" && order.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Only pending orders can be cancelled" },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update order" },
      { status: 500 }
    );
  }
}