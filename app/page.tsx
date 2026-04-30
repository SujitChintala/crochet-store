"use client";

import Image from "next/image";
import Link from "next/link";
import { type ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";

const BRAND_PINK = "#ffc2e8";
const BRAND_BLUE = "#00BFFF";
const SESSION_STORAGE_KEY = "crochet-admin-session";

type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  deliveryTime: string;
  details?: Record<string, unknown>;
};

type AdminSession = {
  email: string;
  password: string;
  role: "admin";
};

type ProductFormState = {
  name: string;
  price: string;
  description: string;
  deliveryTime: string;
  detailsText: string;
};

const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: "",
  price: "",
  description: "",
  deliveryTime: "",
  detailsText: "",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function toDetailsText(details?: Record<string, unknown>) {
  if (!details || Object.keys(details).length === 0) {
    return "";
  }

  return JSON.stringify(details, null, 2);
}

function mergeFileLists(currentFiles: File[], nextFiles: File[]) {
  const fileMap = new Map<string, File>();

  [...currentFiles, ...nextFiles].forEach((file) => {
    fileMap.set(`${file.name}-${file.size}-${file.lastModified}`, file);
  });

  return Array.from(fileMap.values());
}

function getAdminHeaders(session: AdminSession, withJson = false) {
  const headers = new Headers();

  if (withJson) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("x-dev-admin-role", "admin");
  headers.set("x-dev-admin-email", session.email);
  headers.set("x-dev-admin-password", session.password);
  return headers;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalMode, setProductModalMode] = useState<"add" | "edit">("add");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductImages, setEditingProductImages] = useState<string[]>([]);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const productImagesInputRef = useRef<HTMLInputElement | null>(null);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [isProductSubmitting, setIsProductSubmitting] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setPageError(null);

    try {
      const response = await fetch("/api/products?available=true", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Could not load products.");
      }

      const data = (await response.json()) as { products?: Product[] };
      setProducts(data.products ?? []);
    } catch (error) {
      console.error("Failed to load products on homepage", error);
      setPageError("Could not load products right now. Please refresh and try again.");
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawSession) {
      setShowAuthModal(true);
      return;
    }

    try {
      const parsed = JSON.parse(rawSession) as AdminSession;

      if (parsed.email && parsed.password && parsed.role === "admin") {
        setSession(parsed);
        return;
      }
    } catch (error) {
      console.error("Invalid saved session", error);
    }

    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setShowAuthModal(true);
  }, []);

  const ctaHref = products[0] ? `/products/${products[0].id}` : "#products";

  const openAuthModal = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthError(null);
    setShowAuthModal(true);
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = authEmail.trim().toLowerCase();
    const password = authPassword.trim();

    if (!email || !password) {
      setAuthError("Email and password are required.");
      return;
    }

    setIsAuthSubmitting(true);
    setAuthError(null);

    const nextSession: AdminSession = {
      email,
      password,
      role: "admin",
    };

    try {
      await fetch("/api/users", {
        method: "POST",
        headers: getAdminHeaders(nextSession, true),
        body: JSON.stringify({
          email,
          password,
          role: "admin",
        }),
      });
    } catch (error) {
      console.error("Could not create admin user record", error);
    } finally {
      setSession(nextSession);
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      setShowAuthModal(false);
      setAuthPassword("");
      setIsSidebarOpen(false);
      setIsAuthSubmitting(false);
    }
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }

    setSession(null);
    setShowAuthModal(true);
    setIsSidebarOpen(false);
  };

  const openAddProductModal = () => {
    if (!session) {
      openAuthModal("signin");
      return;
    }

    setProductModalMode("add");
    setEditingProductId(null);
    setEditingProductImages([]);
    setProductForm(EMPTY_PRODUCT_FORM);
    setProductFiles([]);
    setProductFormError(null);
    setShowProductModal(true);
    setIsSidebarOpen(false);
  };

  const openEditProductModal = (product: Product) => {
    if (!session) {
      openAuthModal("signin");
      return;
    }

    setProductModalMode("edit");
    setEditingProductId(product.id);
    setEditingProductImages(product.images);
    setProductForm({
      name: product.name,
      price: String(product.price),
      description: product.description,
      deliveryTime: product.deliveryTime,
      detailsText: toDetailsText(product.details),
    });
    setProductFiles([]);
    setProductFormError(null);
    setShowProductModal(true);
  };

  const handleProductFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setProductFiles((currentFiles) => mergeFileLists(currentFiles, files));
    event.target.value = "";
  };

  const handlePickProductFiles = () => {
    productImagesInputRef.current?.click();
  };

  const uploadProductImages = async (files: File[]) => {
    if (!session) {
      throw new Error("Admin session not found.");
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch("/api/uploads/cloudinary", {
      method: "POST",
      headers: getAdminHeaders(session),
      body: formData,
    });

    const data = (await response.json().catch(() => ({}))) as {
      urls?: string[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Could not upload product images.");
    }

    if (!data.urls || data.urls.length === 0) {
      throw new Error("No image URLs were returned after upload.");
    }

    return data.urls;
  };

  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      openAuthModal("signin");
      return;
    }

    const name = productForm.name.trim();
    const price = Number(productForm.price);
    const description = productForm.description.trim();
    const deliveryTime = productForm.deliveryTime.trim();

    if (!name || !description) {
      setProductFormError("Name and description are required.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setProductFormError("Price must be a valid number in rupees.");
      return;
    }

    let details: Record<string, unknown> = {};

    if (productForm.detailsText.trim()) {
      try {
        const parsed = JSON.parse(productForm.detailsText);

        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error();
        }

        details = parsed as Record<string, unknown>;
      } catch {
        setProductFormError("Other details must be valid JSON object.");
        return;
      }
    }

    setIsProductSubmitting(true);
    setProductFormError(null);

    try {
      let uploadedImageUrls: string[] = [];

      if (productFiles.length > 0) {
        uploadedImageUrls = await uploadProductImages(productFiles);
      }

      if (productModalMode === "add" && uploadedImageUrls.length === 0) {
        throw new Error("Please select at least one product image.");
      }

      const endpoint = productModalMode === "add" ? "/api/products" : `/api/products/${editingProductId}`;
      const method = productModalMode === "add" ? "POST" : "PUT";

      const payload: {
        name: string;
        price: number;
        description: string;
        deliveryTime: string;
        details: Record<string, unknown>;
        images?: string[];
      } = {
        name,
        price,
        description,
        deliveryTime,
        details,
      };

      if (productModalMode === "add") {
        payload.images = uploadedImageUrls;
      } else if (uploadedImageUrls.length > 0) {
        payload.images = Array.from(new Set([...editingProductImages, ...uploadedImageUrls]));
      }

      const response = await fetch(endpoint, {
        method,
        headers: getAdminHeaders(session, true),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          details?: string[];
        };
        const message = data.details?.[0] ?? data.error ?? "Could not save product.";
        throw new Error(message);
      }

      setShowProductModal(false);
      setProductForm(EMPTY_PRODUCT_FORM);
      setProductFiles([]);
      setEditingProductId(null);
      setEditingProductImages([]);
      await fetchProducts();
    } catch (error) {
      setProductFormError(error instanceof Error ? error.message : "Could not save product.");
    } finally {
      setIsProductSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!session) {
      openAuthModal("signin");
      return;
    }

    if (!window.confirm("Delete this product?")) {
      return;
    }

    setDeletingProductId(productId);
    setPageError(null);

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: getAdminHeaders(session),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not delete product.");
      }

      setProducts((currentProducts) => currentProducts.filter((item) => item.id !== productId));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not delete product.");
    } finally {
      setDeletingProductId(null);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-sm pb-8 shadow-sm" style={{ backgroundColor: "#f6efe7" }}>
      {isSidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-40 h-full w-72 bg-white p-5 shadow-xl transition-transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <p className="text-lg font-bold text-zinc-900">Menu</p>
        <button
          type="button"
          onClick={openAddProductModal}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-bold text-white"
          style={{ backgroundColor: BRAND_BLUE }}
        >
          Add Product
        </button>
        <button
          type="button"
          onClick={() => openAuthModal("signin")}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700"
        >
          {session ? "Switch Admin" : "Sign In / Sign Up"}
        </button>
        {session ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700"
          >
            Sign Out
          </button>
        ) : null}
      </aside>

      <header className="sticky top-0 z-20">
        <div className="h-7" style={{ backgroundColor: BRAND_PINK }} />
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3" style={{ backgroundColor: "#f6efe7" }}>
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-md p-1 text-zinc-700"
            onClick={() => setIsSidebarOpen(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <Image
              src="/P&B Logo without Name.svg"
              alt="Pink&Blue Logo"
              width={48}
              height={48}
              priority
              className="object-contain"
            />
            <div className="leading-tight">
              <p className="text-lg font-black tracking-tight" style={{ color: BRAND_PINK }}>
                Pink
                <span style={{ color: "#1f2937" }}>&</span>
                <span style={{ color: BRAND_BLUE }}>Blue</span>
              </p>
              <p className="text-xs font-bold tracking-widest text-zinc-900">THE CROCHET CORNER</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal("signin")}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-bold text-zinc-700"
          >
            {session ? "ADMIN" : "Sign In"}
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="relative h-[330px] w-full">
          <Image
            src="/api/home-banner"
            alt="Handmade crochet daisy keychain banner"
            fill
            priority
            unoptimized
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-6 px-5 text-center text-white">
            <p className="text-base font-bold uppercase tracking-[0.1em]">Get your cuddle on!</p>
            <h1 className="mt-1 text-4xl font-black leading-[1.05]">Handmade Crochet Goods</h1>
            <p className="mt-2 text-sm font-medium text-white/90">Playful styles, cozy vibes, tiny happiness</p>
            <Link
              href={ctaHref}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-8 text-sm font-extrabold tracking-wide text-white"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              SHOP NOW
            </Link>
          </div>
        </div>
      </section>

      {pageError ? (
        <section className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {pageError}
        </section>
      ) : null}

      {!pageError && isLoadingProducts ? (
        <section className="mx-4 mt-4 rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600">
          Loading products...
        </section>
      ) : null}

      {!pageError && !isLoadingProducts && products.length === 0 ? (
        <section className="mx-4 mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
          No products yet. Add your first product from the menu.
        </section>
      ) : null}

      {!pageError && products.length > 0 ? (
        <main id="products" className="px-4 pt-5">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-zinc-600">Filter By</p>
              <select className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900">
                <option>All products</option>
              </select>
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-zinc-600">Sort By</p>
              <select className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900">
                <option>Featured</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest</option>
              </select>
            </div>
          </div>
          <p className="mb-4 text-sm font-semibold text-blue-700">{products.length} products</p>
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <div key={product.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
                <Link href={`/products/${product.id}`} className="block">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
                    <Image
                      src={product.images[0] || "/product-placeholder.svg"}
                      alt={product.name}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="50vw"
                    />
                  </div>
                  <div className="px-1 pb-1 pt-2 text-center">
                    <p className="line-clamp-2 min-h-10 text-sm font-bold leading-snug text-zinc-900">{product.name}</p>
                    <p className="mt-1 text-xs font-semibold text-zinc-900">Rs. {product.price.toFixed(2)}</p>
                  </div>
                </Link>
                {session ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditProductModal(product)}
                      className="inline-flex min-h-9 items-center justify-center rounded-full border border-zinc-300 px-2 text-[11px] font-bold text-zinc-700"
                    >
                      UPDATE
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteProduct(product.id)}
                      disabled={deletingProductId === product.id}
                      className="inline-flex min-h-9 items-center justify-center rounded-full px-2 text-[11px] font-bold text-white disabled:opacity-70"
                      style={{ backgroundColor: BRAND_BLUE }}
                    >
                      {deletingProductId === product.id ? "DELETING..." : "DELETE"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAuthModal("signin")}
                    className="mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-full px-2 text-xs font-extrabold tracking-wide text-white"
                    style={{ backgroundColor: BRAND_BLUE }}
                  >
                    ADD TO BAG
                  </button>
                )}
              </div>
            ))}
          </div>
        </main>
      ) : null}

      {showAuthModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className={`min-h-10 flex-1 rounded-lg text-sm font-bold ${
                  authMode === "signin" ? "text-white" : "text-zinc-700"
                }`}
                style={{ backgroundColor: authMode === "signin" ? BRAND_BLUE : "#f3f4f6" }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`min-h-10 flex-1 rounded-lg text-sm font-bold ${
                  authMode === "signup" ? "text-white" : "text-zinc-700"
                }`}
                style={{ backgroundColor: authMode === "signup" ? BRAND_BLUE : "#f3f4f6" }}
              >
                Sign Up
              </button>
            </div>

            <p className="text-center text-sm text-zinc-600">Enter any email + password. You will be logged in as Admin.</p>

            <form className="mt-4 space-y-3" onSubmit={(event) => void handleAuthSubmit(event)}>
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="Email"
                className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                autoComplete="email"
                required
              />
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="Password"
                className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                autoComplete="current-password"
                required
              />

              {authError ? <p className="text-xs font-medium text-red-600">{authError}</p> : null}

              <button
                type="submit"
                disabled={isAuthSubmitting}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-bold text-white disabled:opacity-70"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                {isAuthSubmitting ? "Please wait..." : authMode === "signup" ? "Sign Up as Admin" : "Sign In as Admin"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {showProductModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-lg font-extrabold text-zinc-900">{productModalMode === "add" ? "Add Product" : "Update Product"}</p>

            <form className="mt-4 space-y-3" onSubmit={(event) => void handleProductSubmit(event)}>
              <input
                type="text"
                value={productForm.name}
                onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Product name"
                className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                required
              />

              <div className="rounded-lg border border-zinc-300 px-3 py-3">
                <label htmlFor="product-images" className="block text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  Product photos
                </label>
                <input
                  ref={productImagesInputRef}
                  id="product-images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleProductFilesSelected}
                  className="hidden"
                />
                {productFiles.length === 0 ? (
                  <button
                    type="button"
                    onClick={handlePickProductFiles}
                    className="mt-2 inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-700"
                  >
                    Select files
                  </button>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handlePickProductFiles}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-700"
                    >
                      Add more pics
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductFiles([])}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-700"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <p className="mt-2 text-xs text-zinc-500">
                  {productFiles.length > 0
                    ? `${productFiles.length} image(s) selected for Cloudinary upload`
                    : productModalMode === "add"
                      ? "Select one or more images to upload to Cloudinary."
                      : `Existing images: ${editingProductImages.length}. Select more files to append new images.`}
                </p>
              </div>

              <input
                type="number"
                value={productForm.price}
                onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
                placeholder="Price in rupees"
                className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                min={0}
                step="0.01"
                required
              />

              <textarea
                value={productForm.description}
                onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Description"
                className="min-h-24 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                required
              />

              <input
                type="text"
                value={productForm.deliveryTime}
                onChange={(event) => setProductForm((current) => ({ ...current, deliveryTime: event.target.value }))}
                placeholder="Delivery time (e.g. Ships in 2-4 days)"
                className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
              />

              <textarea
                value={productForm.detailsText}
                onChange={(event) => setProductForm((current) => ({ ...current, detailsText: event.target.value }))}
                placeholder='Other details as JSON (optional), e.g. {"color":"pink"}'
                className="min-h-24 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              />

              {productFormError ? <p className="text-xs font-medium text-red-600">{productFormError}</p> : null}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false);
                    setProductFiles([]);
                    setEditingProductImages([]);
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-300 px-3 text-sm font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProductSubmitting}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-bold text-white disabled:opacity-70"
                  style={{ backgroundColor: BRAND_BLUE }}
                >
                  {isProductSubmitting ? "Saving..." : productModalMode === "add" ? "Add" : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
