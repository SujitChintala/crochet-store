import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductById } from "@/lib/product-service";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

function statusCopy(status: "in_stock" | "out_of_stock" | "preorder") {
  if (status === "in_stock") {
    return "Ready to ship";
  }

  if (status === "preorder") {
    return "Available on preorder";
  }

  return "Currently unavailable";
}

export const dynamic = "force-dynamic";

export default async function ProductDetailPage(props: PageProps<"/products/[id]">) {
  const { id } = await props.params;
  let product = null as Awaited<ReturnType<typeof getProductById>>;
  let hasError = false;

  try {
    product = await getProductById(id);
  } catch (error) {
    console.error("Failed to load product detail page", error);
    hasError = true;
  }

  if (hasError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-6 sm:px-6">
        <Link href="/" className="mb-4 inline-flex text-sm font-medium text-zinc-600 hover:text-zinc-900">
          Back to products
        </Link>
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load this product right now. Please try again shortly.
        </section>
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-5 sm:px-6">
      <Link href="/" className="mb-4 inline-flex text-sm font-medium text-zinc-600 hover:text-zinc-900">
        Back to products
      </Link>

      <main className="grid gap-5 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-6">
        <section className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100">
            <Image
              src={product.images[0] || "/product-placeholder.svg"}
              alt={product.name}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
              priority
            />
          </div>

          {product.images.length > 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1, 5).map((image, index) => (
                <div key={`${image}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
                  <Image
                    src={image || "/product-placeholder.svg"}
                    alt={`${product.name} preview ${index + 2}`}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 640px) 25vw, 12vw"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-700">Crochet Product</p>
          <h1 className="text-2xl font-bold leading-tight text-zinc-900">{product.name}</h1>
          <p className="text-2xl font-black text-zinc-950">{formatCurrency(product.price)}</p>
          <p className="text-sm font-medium text-zinc-600">{statusCopy(product.status)}</p>

          <div className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
            {product.description}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-900">Delivery</p>
            <p className="mt-1">{product.deliveryTime}</p>
          </div>

          <button
            type="button"
            className="mt-1 inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Add to Cart
          </button>
        </section>
      </main>
    </div>
  );
}
