"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import Modal from "@/components/Modal";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  category: string;
  isActive: boolean;
  seller: {
    name: string;
    email: string;
  };
  cartCount?: number;
}

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

export default function ProductsPage() {
  const { data: session } = authClient.useSession();
  const role = ((session?.user as any)?.role || "customer") as string;
  const userId = session?.user?.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartLineItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isBuyer = role === "customer" || role === "admin";

  async function fetchProducts(cat = category, q = search) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat) params.set("category", cat);
      if (q) params.set("search", q);
      if (role === "seller" && userId) params.set("sellerId", userId);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCart() {
    if (!isBuyer) return;
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      if (data.success) {
        setCartItems(data.data.items || []);
        setCartTotal(data.data.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    }
  }

  useEffect(() => {
    if (!session) return;
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, role]);

  useEffect(() => {
    if (isBuyer) fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleAddToCart(productId: string) {
    setAddingToCart(productId);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const data = await res.json();
      if (data.success) {
        setToast("Added to cart");
        setCartOpen(true);
        fetchCart();
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setAddingToCart(null);
    }
  }

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
          setToast("Maximum stock reached for this item");
        }
      }
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  }

  async function handleDelete(productId: string) {
    setConfirmDelete(null);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        setToast("Product deleted");
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
    } finally {
      setDeletingId(null);
    }
  }

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">
            {role === "seller" ? "My Products" : "Products"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {products.length} products
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchProducts(category, search);
            }}
            placeholder="Search products..."
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm w-64 shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
          />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              fetchProducts(e.target.value, search);
            }}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {isBuyer && (
            <button
              onClick={() => setCartOpen((o) => !o)}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Cart ({cartItems.reduce((s, i) => s + i.quantity, 0)})
            </button>
          )}

          {(role === "seller" || role === "admin") && (
            <Link
              href="/dashboard/products/new"
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Add Product
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 text-sm">Loading products...</div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 border border-gray-200 rounded-xl">
          <p className="text-gray-500">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product) => {
            const cartLine = cartItems.find(
              (i) => i.product.id === product.id
            );
            return (
              <div
                key={product.id}
                className="border border-gray-200 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="h-40 bg-gray-100 flex items-center justify-center">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-sm">
                      {product.category}
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-black text-sm">
                      {product.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                      {product.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                    {product.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    by {product.seller.name}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-black">
                        ₹{product.price.toLocaleString()}
                      </p>
                      <p
                        className={`text-xs ${
                          product.stock > 10
                            ? "text-green-600"
                            : product.stock > 0
                            ? "text-orange-500"
                            : "text-red-500"
                        }`}
                      >
                        {product.stock > 0
                          ? `${product.stock} in stock`
                          : "Out of stock"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {isBuyer ? (
                      cartLine ? (
                        <div className="flex items-center justify-between border border-gray-200 rounded-lg px-2 py-1.5">
                          <button
                            onClick={() =>
                              updateQuantity(product.id, cartLine.quantity - 1)
                            }
                            disabled={cartLine.quantity <= 1}
                            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-50 rounded disabled:opacity-40 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="text-sm font-medium text-black">
                            {cartLine.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(product.id, cartLine.quantity + 1)
                            }
                            disabled={cartLine.quantity >= product.stock}
                            className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-50 rounded disabled:opacity-40 transition-colors"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product.id)}
                          disabled={
                            addingToCart === product.id || product.stock === 0
                          }
                          className="w-full px-3 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        >
                          {addingToCart === product.id
                            ? "Adding..."
                            : "Add to Cart"}
                        </button>
                      )
                    ) : (
                      product.seller.email === session?.user?.email && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDelete(product.id)}
                            disabled={deletingId === product.id}
                            className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            Delete
                          </button>
                          <button className="flex-1 px-3 py-2 bg-gray-800 text-white text-xs font-medium rounded-lg hover:bg-black transition-colors">
                            Edit
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart below (buyers only) */}
      {isBuyer && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-gray-50 transition-colors"
            onClick={() => setCartOpen((o) => !o)}
          >
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-black text-sm">
                Your Cart
              </h2>
              <span className="text-xs text-gray-500">
                {cartItems.reduce((s, i) => s + i.quantity, 0)} item(s) · ₹
                {cartTotal.toLocaleString()}
              </span>
            </div>
            <span className="text-gray-400 text-sm">{cartOpen ? "▲" : "▼"}</span>
          </div>

          {cartOpen && (
            <div className="border-t border-gray-100">
              {cartItems.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  Your cart is empty
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 px-5 py-3"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                        {item.product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">
                            {item.product.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          ₹{item.product.price.toLocaleString()} each
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                        aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-black">
                          {item.quantity}
                        </span>
                        <button
onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.product.stock}
                        className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                        aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <span className="w-20 text-right text-sm font-medium text-black">
                        ₹{(item.product.price * item.quantity).toLocaleString()}
                      </span>

                      <button
                        onClick={() => updateQuantity(item.product.id, 0)}
                        className="px-2 py-1 text-xs text-gray-400 hover:text-red-600 transition-colors"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center justify-between px-5 py-4 bg-gray-50">
                    <span className="font-medium text-black text-sm">
                      Total: ₹{cartTotal.toLocaleString()}
                    </span>
                    <Link
                      href="/dashboard/cart"
                      className="px-4 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Go to Checkout
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!confirmDelete}
        type="confirm"
        title="Delete this product?"
        message="This action cannot be undone. The product will be permanently removed."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
        onClose={() => setConfirmDelete(null)}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-black text-white text-sm rounded-lg shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}