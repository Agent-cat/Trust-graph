"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";

interface CartLineItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    stock: number;
    seller: { name: string };
  };
}

export default function CartPage() {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [modal, setModal] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  async function fetchCart() {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items || []);
        setTotal(data.data.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCart();
  }, []);

  async function updateQuantity(productId: string, newQty: number) {
    if (newQty < 0) return;
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: newQty }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCart();
        if (data.capped) {
          setModal({
            type: "error",
            title: "Stock limit reached",
            message: "You can't add more of this item — it's out of stock beyond this quantity.",
          });
        }
      }
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  }

  async function handleRemove(productId: string) {
    try {
      await fetch(`/api/cart?productId=${productId}`, {
        method: "DELETE",
      });
      fetchCart();
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  }

  async function handleCheckout() {
    if (items.length === 0) return;
    setCheckingOut(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          shippingAddress: shippingAddress || null,
          paymentMethod: paymentMethod || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setModal({
          type: "success",
          title: "Order placed!",
          message: `Your order #${data.data.id?.slice(0, 8) || ""} has been placed successfully.`,
        });
        setItems([]);
        setTotal(0);
        setShippingAddress("");
      } else {
        setModal({
          type: "error",
          title: "Order failed",
          message: data.error || "Failed to place order",
        });
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setModal({
        type: "error",
        title: "Order failed",
        message: "Something went wrong while placing your order.",
      });
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading cart...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">Shopping Cart</h1>
        <p className="text-gray-500 text-sm mt-1">
          {items.length} item(s) in your cart
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 border border-gray-200 rounded-xl">
          <p className="text-gray-500">Your cart is empty</p>
          <Link
            href="/dashboard/products"
            className="inline-block mt-4 px-6 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {item.product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">No image</span>
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-medium text-black text-sm">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    by {item.product.seller.name}
                  </p>
                  <p className="text-sm font-bold text-black mt-1">
                    ₹{item.product.price.toLocaleString()}
                  </p>
                </div>

                {/* Quantity stepper */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-medium text-black">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <div className="text-right w-24">
                  <p className="font-medium text-black">
                    ₹{(item.product.price * item.quantity).toLocaleString()}
                  </p>
                  {item.quantity >= item.product.stock && (
                    <p className="text-[10px] text-orange-500">Max stock</p>
                  )}
                </div>

                <button
                  onClick={() => handleRemove(item.product.id)}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-xs text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="border border-gray-200 rounded-xl p-6 h-fit">
            <h2 className="text-sm font-medium text-gray-500 mb-4">
              Order Summary
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-black">
                  ₹{total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="font-medium text-black">Total</span>
                <span className="font-bold text-black">
                  ₹{total.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Shipping Address
                </label>
                <textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm h-20 resize-none shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="Enter your shipping address"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                >
                  <option value="cod">Cash on Delivery</option>
                  <option value="upi">UPI</option>
                  <option value="card">Credit/Debit Card</option>
                </select>
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="w-full px-4 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {checkingOut ? "Placing order..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={!!modal}
        type={modal?.type || "info"}
        title={modal?.title}
        message={modal?.message}
        onClose={() => setModal(null)}
        cancelText="Close"
      />
    </div>
  );
}