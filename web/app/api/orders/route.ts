import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user } = await requireUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const role = (user as any).role;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    let orders;

    if (role === "admin") {
      orders = await prisma.order.findMany({
        where: status ? { status } : undefined,
        include: {
          user: { select: { name: true, email: true } },
          items: {
            include: {
              product: { select: { name: true, price: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (role === "seller") {
      // Orders containing seller's products
      orders = await prisma.order.findMany({
        where: {
          ...(status ? { status } : {}),
          items: {
            some: {
              product: {
                sellerId: user.id,
              },
            },
          },
        },
        include: {
          user: { select: { name: true, email: true } },
          items: {
            include: {
              product: { select: { name: true, price: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Customer sees their own orders
      orders = await prisma.order.findMany({
        where: {
          userId: user.id,
          ...(status ? { status } : {}),
        },
        include: {
          items: {
            include: {
              product: { select: { name: true, price: true, imageUrl: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
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
  if (role === "seller") {
    return NextResponse.json(
      { success: false, error: "Sellers cannot place orders" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { items, shippingAddress, paymentMethod } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    // Validate items and compute total
    let total = 0;
    const orderItems: {
      productId: string;
      quantity: number;
      price: number;
    }[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }

      total += product.price * item.quantity;
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    // Create order with items
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          total,
          status: "pending",
          shippingAddress: shippingAddress || null,
          paymentMethod: paymentMethod || null,
          items: {
            create: orderItems,
          },
        },
        include: { items: true },
      });

      // Update stock
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { userId: user.id },
      });

      return newOrder;
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create order" },
      { status: 500 }
    );
  }
}