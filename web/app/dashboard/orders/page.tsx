"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    imageUrl?: string | null;
  };
}

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  shippingAddress?: string | null;
  paymentMethod?: string | null;
  user?: {
    name: string;
    email: string;
  };
  items: OrderItem[];
}

export default function OrdersPage() {
  const { data: session } = authClient.useSession();
  const role = ((session?.user as any)?.role || "customer") as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  async function fetchOrders(status = filter) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      setOrders(data.data || []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpdateStatus(orderId: string, status: string) {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
      } else {
        alert(data.error || "Failed to update order");
      }
    } catch (error) {
      console.error("Failed to update order:", error);
    } finally {
      setUpdating(null);
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      processing: "bg-blue-100 text-blue-700",
      shipped: "bg-purple-100 text-purple-700",
      delivered: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">
            {role === "customer" ? "My Orders" : "Orders"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} orders</p>
        </div>

        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            fetchOrders(e.target.value);
          }}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 border border-gray-200 rounded-xl">
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border border-gray-200 rounded-xl p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-black text-sm">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                  {order.user && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Customer: {order.user.name} ({order.user.email})
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-bold text-black">
                    ₹{order.total.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {order.items.length} item(s)
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="mt-4 space-y-2">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-t border-gray-100"
                  >
                    <span className="text-sm text-gray-700">
                      {item.product.name}{" "}
                      <span className="text-gray-400">× {item.quantity}</span>
                    </span>
                    <span className="text-sm font-medium text-black">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end gap-2">
                {role === "customer" && order.status === "pending" && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, "cancelled")}
                    disabled={updating === order.id}
                    className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                  >
                    {updating === order.id ? "..." : "Cancel Order"}
                  </button>
                )}

                {role === "seller" && order.status === "pending" && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, "processing")}
                    disabled={updating === order.id}
                    className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {updating === order.id ? "..." : "Accept Order"}
                  </button>
                )}

                {role === "seller" && order.status === "processing" && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, "shipped")}
                    disabled={updating === order.id}
                    className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {updating === order.id ? "..." : "Mark Shipped"}
                  </button>
                )}

                {role === "seller" && order.status === "shipped" && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, "delivered")}
                    disabled={updating === order.id}
                    className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {updating === order.id ? "..." : "Mark Delivered"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}