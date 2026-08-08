"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

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

export default function ProductsPage() {
  const { data: session } = authClient.useSession();
  const role = ((session?.user as any)?.role || "customer") as string;
  const userId = session?.user?.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

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

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddToCart(productId: string) {
    setAddingToCart(productId);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (res.ok) {
        alert("Added to cart");
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setAddingToCart(null);
    }
  }

  async function handleDelete(productId: string) {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
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
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-black"
          />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              fetchProducts(e.target.value, search);
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

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
          {products.map((product) => (
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
                  {role === "customer" || role === "admin" ? (
                    <button
                      onClick={() => handleAddToCart(product.id)}
                      disabled={
                        addingToCart === product.id || product.stock === 0
                      }
                      className="w-full px-3 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {addingToCart === product.id ? "Adding..." : "Add to Cart"}
                    </button>
                  ) : (
                    product.seller.email === session?.user?.email && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="flex-1 px-3 py-2 border border-gray-200 text-xs font-medium rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          Delete
                        </button>
                        <button className="flex-1 px-3 py-2 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
                          Edit
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}