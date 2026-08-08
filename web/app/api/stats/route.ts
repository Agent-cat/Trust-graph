import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await requireUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const role = (user as any).role;

  try {
    if (role === "admin") {
      const [totalUsers, totalOrders, totalProducts, totalRevenue] =
        await Promise.all([
          prisma.user.count(),
          prisma.order.count(),
          prisma.product.count(),
          prisma.order.aggregate({ _sum: { total: true } }),
        ]);

      return NextResponse.json({
        success: true,
        data: {
          totalUsers,
          totalOrders,
          totalProducts,
          totalRevenue: totalRevenue._sum.total || 0,
        },
      });
    }

    if (role === "seller") {
      const [totalProducts, totalOrders, revenue] = await Promise.all([
        prisma.product.count({ where: { sellerId: user.id } }),
        prisma.order.count({
          where: {
            items: { some: { product: { sellerId: user.id } } },
          },
        }),
        prisma.order.aggregate({
          _sum: { total: true },
          where: {
            items: { some: { product: { sellerId: user.id } } },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          totalProducts,
          totalOrders,
          totalRevenue: revenue._sum.total || 0,
        },
      });
    }

    // Customer
    const [totalOrders, cartItems] = await Promise.all([
      prisma.order.count({ where: { userId: user.id } }),
      prisma.cartItem.findMany({
        where: { userId: user.id },
        select: { quantity: true },
      }),
    ]);

    const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

    return NextResponse.json({
      success: true,
      data: {
        totalOrders,
        cartItems: cartCount,
      },
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}