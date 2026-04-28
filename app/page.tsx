import Image from "next/image";
import Link from "next/link";

import { getProducts } from "@/lib/product-service";

const BRAND_PINK = "#ffc2e8";
const BRAND_BLUE = "#00BFFF";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
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

  const trendingProducts = products.slice(0, 6);
  const ctaHref = trendingProducts[0] ? `/products/${trendingProducts[0].id}` : "#trending";

  return (
    <div className="mx-auto min-h-screen w-full max-w-sm bg-white pb-8 shadow-sm">
      <header className="sticky top-0 z-20">
        <div className="h-7" style={{ backgroundColor: BRAND_PINK }} />
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
          <button type="button" aria-label="Open menu" className="rounded-md p-1 text-zinc-700">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <p className="text-3xl font-black leading-none tracking-tight">
            <span style={{ color: BRAND_PINK, textShadow: `-1px 0 #ca488f, 0 1px #ca488f, 1px 0 #ca488f, 0 -1px #ca488f` }}>
              Pink
            </span>{" "}
            <span style={{ color: "#1f2937" }}>&amp;</span>{" "}
            <span style={{ color: BRAND_BLUE, textShadow: `-1px 0 #0284c7, 0 1px #0284c7, 1px 0 #0284c7, 0 -1px #0284c7` }}>
              Blue
            </span>
          </p>
          <button type="button" aria-label="View bag" className="rounded-md p-1 text-zinc-700">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 8h14l-1.2 11H6.2L5 8Zm4-2a3 3 0 0 1 6 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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

      {hasError ? (
        <section className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load products right now. Please refresh and try again.
        </section>
      ) : null}

      {!hasError && trendingProducts.length === 0 ? (
        <section className="mx-4 mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
          No products yet. Add one using POST /api/products and it will appear here.
        </section>
      ) : null}

      {!hasError && trendingProducts.length > 0 ? (
        <main id="trending" className="px-4 pt-5">
          <h2 className="mb-4 text-center text-4xl font-black leading-none tracking-tight text-zinc-900">
            TRENDING NOW
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {trendingProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
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
                  <p className="mt-1 text-xs font-semibold text-zinc-500">{formatCurrency(product.price)}</p>
                  <p className="mt-1 text-xs text-amber-500">★★★★★</p>
                  <span
                    className="mt-2 inline-flex min-h-9 w-full items-center justify-center rounded-full px-2 text-xs font-extrabold tracking-wide text-white"
                    style={{ backgroundColor: BRAND_BLUE }}
                  >
                    ADD TO BAG
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </main>
      ) : null}
    </div>
  );
}
