import Image from "next/image";
import Link from "next/link";

import { getProducts } from "@/lib/product-service";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function getStatusLabel(status: "in_stock" | "out_of_stock" | "preorder") {
  if (status === "in_stock") {
    return "In stock";
  }

  if (status === "out_of_stock") {
    return "Out of stock";
  }

  return "Preorder";
}

export const dynamic = "force-dynamic";

export default async function Home() {
  let products = [] as Awaited<ReturnType<typeof getProducts>>;
  let hasError = false;

  try {
    products = await getProducts({ onlyAvailable: true });
  } catch (error) {
    console.error("Failed to load products on homepage", error);
    hasError = true;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-6 sm:px-6">
      <header className="mb-6 rounded-3xl bg-gradient-to-r from-orange-100 via-amber-50 to-rose-100 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
          Crochet Store
        </p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">Handmade pieces for everyday joy</h1>
        <p className="mt-2 max-w-lg text-sm text-zinc-700">
          Explore mobile-friendly product cards made for quick browsing from Instagram.
        </p>
      </header>

      {hasError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load products right now. Please refresh and try again.
        </section>
      ) : null}

      {!hasError && products.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
          No products yet. Add one using POST /api/products and it will appear here.
        </section>
      ) : null}

      {!hasError && products.length > 0 ? (
        <main className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-[4/5] bg-zinc-100">
                <Image
                  src={product.images[0] || "/product-placeholder.svg"}
                  alt={product.name}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              </div>
              <div className="space-y-1 p-3">
                <p className="line-clamp-2 min-h-10 text-sm font-semibold text-zinc-900">{product.name}</p>
                <p className="text-base font-bold text-zinc-950">{formatCurrency(product.price)}</p>
                <p className="text-xs text-zinc-500">{getStatusLabel(product.status)}</p>
              </div>
            </Link>
          ))}
        </main>
      ) : null}

      <footer className="mt-8 text-center text-xs text-zinc-500">
        Need product JSON shape? Check GET /api/products.
      </footer>
    </div>
  );
}
