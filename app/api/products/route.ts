import { NextResponse } from "next/server";

import {
  createProduct,
  getProducts,
  isValidProductStatus,
  type ProductView,
} from "@/lib/product-service";
import { type ProductInput } from "@/models/Product";

export const dynamic = "force-dynamic";

function normalizeCreateProductPayload(payload: unknown): ProductInput {
  const source = payload as Partial<ProductInput>;

  return {
    name: String(source.name ?? "").trim(),
    price: Number(source.price),
    images: Array.isArray(source.images)
      ? source.images.map((image) => String(image).trim()).filter(Boolean)
      : [],
    description: String(source.description ?? "").trim(),
    status: source.status,
    isAvailable: source.isAvailable,
    deliveryDetails: String(source.deliveryDetails ?? "").trim() || undefined,
  };
}

function toApiResponse(product: ProductView) {
  return {
    ...product,
    displayPrice: `$${product.price.toFixed(2)}`,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const availableParam = searchParams.get("available");

    const status = statusParam && isValidProductStatus(statusParam) ? statusParam : undefined;
    const onlyAvailable =
      availableParam === "true" ? true : availableParam === "false" ? false : undefined;

    const products = await getProducts({
      status,
      onlyAvailable,
    });

    return NextResponse.json({ products: products.map(toApiResponse) }, { status: 200 });
  } catch (error) {
    console.error("GET /api/products failed", error);
    return NextResponse.json(
      { error: "Could not fetch products. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = normalizeCreateProductPayload(payload);
    const product = await createProduct(input);

    return NextResponse.json({ product: toApiResponse(product) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/products failed", error);
    return NextResponse.json(
      { error: "Could not create product. Check the payload and try again." },
      { status: 400 }
    );
  }
}